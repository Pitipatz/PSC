import { supabase } from '../utils/auth';

const base64ToFile = (base64: string, filename: string) => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
};

export async function logPriceCheck(
  userEmail: string,
  userName: string,
  truckData: any,
  centralPrice: number,
  modelFound: string,
  trailerLoan: number
) {
  try {
    const uploadedUrls: string[] = [];

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