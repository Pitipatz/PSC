import { supabase } from '../utils/auth';

export interface CalculationResult {
  found: boolean;
  modelName?: string;
  depreciationCoefficient?: number;
  initialPrice?: number;
  vehicleAge?: number;
  lnAge?: number;
  centralPrice?: number;
  calculationSteps?: string[];
  errorMessage?: string;
  images?: string[];
}

export async function calculateCentralPrice(
  chassisInput: string,
  vehicleYear: number
): Promise<CalculationResult> {
  
  // 1. ดึงข้อมูลจากตารางใหม่ (ที่มีครบทั้งรุ่นและราคาในแถวเดียว)
  const { data: allModels, error } = await supabase
    .from('current_model_prices')
    .select('*');

  if (!allModels || error) {
    console.error("Database Error:", error);
    return { found: false, errorMessage: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้" };
  }

  // 2. ค้นหารุ่นที่ "ชื่อรุ่น" อยู่ใน "เลขแชซซี"
  const matchedModel = allModels.find(m => 
    chassisInput.toUpperCase().includes(m.model_name.toUpperCase())
  );

  if (!matchedModel) {
    return { 
      found: false, 
      errorMessage: `ไม่พบชื่อรุ่นรถที่ตรงกับเลขแชซซี "${chassisInput}" ในระบบ` 
    };
  }

  // --- 🚩 จุดสำคัญ: ข้อมูลราคาและค่าสัมประสิทธิ์มีอยู่ใน matchedModel แล้ว ไม่ต้องเช็ค Model_Prices ซ้ำ ---
  
  const basePrice = Number(matchedModel.starting_price || 0);
  const coeff = Number(matchedModel.discount_coefficient || 0);

  if (basePrice === 0 || coeff === 0) {
    return {
      found: true,
      modelName: matchedModel.model_name,
      errorMessage: "พบรุ่นรถแล้ว แต่ข้อมูลราคาตั้งต้นหรือค่าส่วนลดในระบบไม่ถูกต้อง (เป็น 0)"
    };
  }

  // 3. คำนวณตามสูตร ln
  const currentYearAD = new Date().getFullYear();
  // แปลง พ.ศ. เป็น ค.ศ.
  const vehicleYearAD = vehicleYear > 2500 ? vehicleYear - 543 : vehicleYear;
  // อายุรถตาม Logic ของคุณ (เริ่มที่ 1)
  const vehicleAge = (currentYearAD - vehicleYearAD) + 1;
  const safeAge = vehicleAge > 0 ? vehicleAge : 1;
  const lnAge = Math.log(safeAge);

  // สูตร: (Coeff * ln(Age)) + Base
  const rawCentralPrice = (coeff * lnAge) + basePrice;

  // ปัดเศษหลักหมื่น
  const finalPrice = rawCentralPrice > 0 ? Math.round(rawCentralPrice / 10000) * 10000 : 0;

  // 4. จัดการเรื่องรูปภาพ
  let modelImages: string[] = [];
  if (matchedModel.images) {
    const rawImages = String(matchedModel.images);
    modelImages = rawImages
      .replace(/'/g, "")
      .replace(/"/g, "") // เพิ่มลบเครื่องหมาย "
      .split(',')
      .map(img => img.trim())
      .filter(img => img.startsWith('http'));
  }

  return {
    found: true,
    modelName: matchedModel.model_name,
    centralPrice: finalPrice,
    initialPrice: basePrice,
    vehicleAge: vehicleAge,
    lnAge: lnAge,
    depreciationCoefficient: coeff,
    images: modelImages,
    calculationSteps: [
      `รุ่นรถ: ${matchedModel.model_name}`,
      `ราคารถใหม่: ${basePrice.toLocaleString()} บาท`,
      `อายุรถ: ${vehicleAge} ปี`,
      `ราคากลาง: ${finalPrice.toLocaleString()} บาท`,
    ]
  };
}

export const calculateTrailerAmount = (centralPrice: number): number => {
  if (centralPrice <= 500000) return 100000;
  if (centralPrice <= 1000000) return 150000;
  return 200000;
};

/**
 * คำนวณวงเงินต่างๆ จากราคากลาง และตรวจสอบเงื่อนไขราคาขาย
 * @param centralPrice ราคากลางที่คำนวณได้จากสูตร ln
 * @param sellingPrice ราคาที่ลูกค้าขายจริง (ถ้าไม่มีให้ใส่ 0 หรือ centralPrice)
 */
export function calculateLoanAmounts(centralPrice: number, sellingPrice: number = 0, hasTrailer: boolean = false) {
  const THRESHOLD = 0.95; // เกณฑ์ 5%
  const LTV_RATE = 0.7;   // ยอดจัดปกติ 70% ของราคากลาง
  const trailerAmount = hasTrailer ? calculateTrailerAmount(centralPrice) : 0;

  // 1. วงเงินมาตรฐาน (70% ของราคากลาง)
  const standardLimit = Math.round(centralPrice * LTV_RATE);

  // 2. ตรวจสอบว่าราคาขายต่ำกว่า 95% ของราคากลางหรือไม่
  // (ถ้าไม่ได้กรอกราคาขายมา ให้ถือว่าราคาปกติ)
  const isPriceTooLow = sellingPrice > 0 && sellingPrice < (centralPrice * THRESHOLD);

  // 3. คำนวณยอดจัดสูงสุด (Lease Purchase / Max Loan)
  // ปกติ: ไม่เกิน Standard Limit และไม่เกินราคาขาย
  let maxLoan = sellingPrice > 0 ? Math.min(standardLimit, sellingPrice) : standardLimit;

  // เงื่อนไขพิเศษ: ถ้าราคาขายต่ำผิดปกติ บังคับดาวน์ 10% ของราคาขาย
  if (isPriceTooLow && sellingPrice > 0) {
    const forcedMaxLoan = Math.round(sellingPrice * 0.9); // หักดาวน์ 10% ออก
    maxLoan = Math.min(maxLoan, forcedMaxLoan);
  }

  // คำนวณเงินดาวน์ที่ต้องใช้จริง (ถ้ามี)
  const downPaymentNeeded = (sellingPrice > 0 && sellingPrice > maxLoan) 
    ? sellingPrice - maxLoan 
    : 0;

  return {
    // --- ค่าเดิมที่ระบบคุณมีอยู่แล้ว ---
    leasePurchase: maxLoan, // อัปเดตให้ใช้ maxLoan ที่ผ่าน Logic แล้ว
    pawnAmount: Math.round(centralPrice * 0.5), 
    extraAmount: Math.round(centralPrice * 0.9), 
    fastTrackAmount: Math.round(centralPrice * 0.3),
    minimumAmount: Math.round(centralPrice * 0.3),

    // --- ค่าใหม่ที่เพิ่มเข้ามาเพื่อแสดงผล UI ---
    isPriceTooLow,
    standardLimit,
    downPaymentNeeded,
    trailerAmount,
    totalLoanAmount: maxLoan + trailerAmount // ยอดรวมจัดได้ (หัว + หาง)
  };
}