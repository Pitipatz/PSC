import { supabase } from '../utils/auth';
import { base64ToFile } from '../utils/base64ToFile';

export async function logPriceCheck(
  userEmail: string,
  userName: string,
  truckData: any,
  centralPrice: number,
  modelFound: string,
  trailerLoan: number,
  registrationImage?: string
) {
  try {
    let registrationImageUrl = null;
    const uploadedUrls: string[] = [];

    // --- 1. จัดการรูปหน้าเล่ม (ถ้ามี) ---
    if (registrationImage && registrationImage.startsWith('data:image')) {
      const regFileName = `reg_${Date.now()}.jpg`;
      const regFilePath = `${userEmail}/registration/${regFileName}`;
      const regFile = base64ToFile(registrationImage, regFileName);

      const { error: regUploadError } = await supabase.storage
        .from('truck-images')
        .upload(regFilePath, regFile);

      if (!regUploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('truck-images')
          .getPublicUrl(regFilePath);
        registrationImageUrl = publicUrl;
      }
    }

    // 1. จัดการอัปโหลดรูปภาพ
    if (truckData.images && truckData.images.length > 0) {
      for (let i = 0; i < truckData.images.length; i++) {
        const base64 = truckData.images[i];
        if (!base64.startsWith('data:image')) continue; // ป้องกันข้อมูลไม่ใช่ base64

        const fileName = `truck_${Date.now()}_${i}.jpg`;
        const filePath = `${userEmail}/${fileName}`;
        const file = base64ToFile(base64, fileName);

        const { error: uploadError } = await supabase.storage
          .from('truck-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error(`❌ อัปโหลดรูปที่ ${i + 1} พัง:`, uploadError.message);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('truck-images')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
      }
    }
    // เตรียมข้อมูลให้ตรงกับชื่อคอลัมน์ใน Supabase
    const { data, error } = await supabase
      .from('check_price_logs')
      .insert([
        {
          user_email: userEmail,
          user_name: userName, // ตรวจสอบใน DB ว่าชื่อนี้เป๊ะไหม
          brand: truckData.brand,
          vehicle_type: truckData.vehicleType,
          horsepower: truckData.horsepower,
          chassis_number: truckData.chassisNumber,
          engine_number: truckData.engineNumber,
          year: truckData.year,
          sale_price: parseFloat(truckData.salePrice) || 0,
          central_price: centralPrice,
          model_found: modelFound,
          image_urls: uploadedUrls,
          registration_image_url: registrationImageUrl,
          has_trailer: truckData.hasTrailer,
          trailer_loan_amount: trailerLoan,
          line_notify_sent: false
        }
      ])
      .select('id')
      .single(); // เพิ่ม .single() เพื่อให้ได้ Object เดียวแทน Array

    if (error) {
      console.error("❌ บันทึกไม่เข้าเพราะ:", error.message);
      return null; 
    }

    console.log("✅ บันทึกข้อมูลลง Supabase เรียบร้อยแล้ว!");

    return data.id; // ส่ง ID กลับไปใช้งานต่อ
  } catch (err) {
    console.error("❌ ระบบพังที่ logger:", err);
    return null;
  }
}

// ดึงข้อมูลชื่อประเภทรถทั้งหมดมาทำเป็น Array ของ string
export const fetchVehicleTypes = async () => {
  const { data, error } = await supabase
    .from('VehicleType')
    .select('vehicletype');

  if (error) {
    console.error("Error fetching vehicle types:", error);
    return [];
  }
  return data.map(item => item.vehicletype);
};

export const fetchBrandNames = async () => {
  const { data, error } = await supabase
    .from('Brands')
    .select('name');

  if (error) {
    console.error("Error fetching vehicle types:", error);
    return [];
  }
  return data.map(item => item.name);
};

export async function updateLineNotifyStatus(logId: string) {
  try {
    const { error } = await supabase
      .from('check_price_logs')
      .update({ line_notify_sent: true })
      .eq('id', logId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("❌ ไม่สามารถอัปเดตสถานะ LINE ได้:", error);
    return false;
  }
}