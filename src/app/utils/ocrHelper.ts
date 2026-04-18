import Tesseract from 'tesseract.js';
import Fuse from 'fuse.js';

export interface OCRResult {
  brand: string;
  chassis: string;
  engine: string;
  year: string;
  horsepower: string;
  vehicleType: string;
}

// 1. ฟังก์ชันหลักในการอ่านข้อความจากรูป
// เพิ่ม (onProgress?: (p: number) => void) เข้าไปเป็นพารามิเตอร์ตัวที่สอง
export const recognizeText = async (
  imagePath: string, 
  onProgress?: (p: number) => void
): Promise<string> => {
  const { data: { text } } = await Tesseract.recognize(
    imagePath,
    'tha+eng',
    {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress); 
        }
      }
    }
  );
  return text;
};

// 2. ฟังก์ชัน Parsing (แกะ Text ด้วย Regex)
export const parseRegistrationData = (
  rawText: string, 
  availableTypes: string[], 
  availableBrands: string[]
): OCRResult => {
  const result: OCRResult = {
    brand: '', chassis: '', engine: '', year: '', horsepower: '', vehicleType: ''
  };

  const cleanText = rawText.toUpperCase();
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // --- 1. หาประเภทรถ (Vehicle Type) ด้วย Fuse.js ---
  if (availableTypes && availableTypes.length > 0) {
    const fuseInstance = new Fuse(availableTypes, { 
      threshold: 0.4, // ปรับให้เข้มงวดขึ้นนิดนึงเพื่อความแม่นยำ
      includeScore: true 
    });

    let bestTypeMatch = { item: '', score: 1 };

    // วิธีที่แม่นที่สุดคือเช็คทีละบรรทัด แล้วเอาบรรทัดที่คะแนนดีที่สุด
    lines.forEach(line => {
      const search = fuseInstance.search(line); // ✅ แก้จาก fuse เป็น fuseInstance
      if (search.length > 0 && search[0].score! < bestTypeMatch.score) {
        bestTypeMatch = { item: search[0].item, score: search[0].score! };
      }
    });

    if (bestTypeMatch.score < 0.4) {
      result.vehicleType = bestTypeMatch.item;
    }
  }

  // --- 2. หาเลขตัวรถ (Chassis) ---
  const chassisMatch = cleanText.match(/(?:เลขตัวรถ|CHASSIS|เลขต้วรถ)\s*[:\-\s]*([A-Z0-9ก-ฮ๊\-\s]{10,25})/);
  if (chassisMatch) {
    result.chassis = chassisMatch[1].replace(/[^A-Z0-9\-]/g, '');
  }

  // --- 3. หาเลขเครื่องยนต์ (Engine) ---
  const engineMatch = cleanText.match(/(?:เลขเครื่องยนต์|ENGINE NO|เลขเครึ่องยนต์)\s*[:\-\s]*([A-Z0-9ก-ฮ\s\-]{5,25})/);
  if (engineMatch) {
    // กรองเอาเฉพาะกลุ่มตัวอักษรภาษาอังกฤษผสมตัวเลขที่ยาวที่สุดในบรรทัดนั้น
    const parts = engineMatch[1].replace(/[^A-Z0-9\-]/g, ' ').split(' ');
    result.engine = parts.reduce((a, b) => a.length > b.length ? a : b, '');
  }

  // --- 4. หายี่ห้อ (Brand) ---
  for (const b of availableBrands) {
    if (cleanText.includes(b.toUpperCase())) {
      result.brand = b;
      break;
    }
  }

  // --- 5. หาปี (Year) ---
  const yearMatch = cleanText.match(/25[4-7][0-9]/);
  if (yearMatch) result.year = yearMatch[0];

  // --- 6. หาแรงม้า (Horsepower) ---
  // พยายามหาแบบมีคำว่า "สูบ" นำหน้าก่อน (แม่นยำกว่า)
  let hpMatch = cleanText.match(/สูบ\s*(\d{2,3})\s*(?:แรงม้า|แรขม้า|แระม้า|HP|PS)/);

  // ถ้าหาไม่เจอจริงๆ ค่อยหาแบบเดิมที่คุณเคยเขียนไว้
  if (!hpMatch) {
    hpMatch = cleanText.match(/(\d{2,3})\s*(?:แรงม้า|แรขม้า|แระม้า|HP|PS)/);
  }

  if (hpMatch) {
    result.horsepower = hpMatch[1];
  }

  return result;
};