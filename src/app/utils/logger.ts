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
  trailerLoan: number // ✅ เพิ่มรับค่าราคาหาง
) {
  try {
    const uploadedUrls: string[] = [];

    // 1. จัดการอัปโหลดรูปภาพเข้า Storage ก่อน
    if (truckData.images && truckData.images.length > 0) {
      for (let i = 0; i < truckData.images.length; i++) {
        const base64 = truckData.images[i];
        const fileName = `truck_${Date.now()}_${i}.jpg`;
        // สร้าง Folder ตาม Email ผู้ใช้ เพื่อให้เป็นระเบียบ
        const filePath = `${userEmail}/${fileName}`;
        
        const file = base64ToFile(base64, fileName);

        // อัปโหลดไปยัง Bucket ชื่อ 'truck-images' (ต้องไปสร้างใน Dashboard ก่อนนะ!)
        const { error: uploadError } = await supabase.storage
          .from('truck-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error(`❌ อัปโหลดรูปที่ ${i+1} พัง:`, uploadError.message);
          continue;
        }

        // ดึง Public URL ของรูปที่อัปโหลดเสร็จแล้ว
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
          user_name: userName,
          brand: truckData.brand,
          vehicle_type: truckData.vehicleType,
          horsepower: truckData.horsepower, // แมปจาก horsepower ในแอป ไปยัง horse_power ใน SQL
          chassis_number: truckData.chassisNumber,
          engine_number: truckData.engineNumber,
          year: truckData.year,
          sale_price: parseFloat(truckData.salePrice) || 0,
          central_price: centralPrice,
          model_found: modelFound,image_urls: uploadedUrls, // ✅ เก็บเป็น Link URL สั้นๆ แทนแล้ว!
          has_trailer: truckData.hasTrailer,
          trailer_loan_amount: trailerLoan,
        }
      ]);

    if (error) {
      throw error;
    }

    console.log("✅ บันทึกข้อมูลลง Supabase เรียบร้อยแล้ว!");
    return { success: true, data };

  } catch (error) {
    console.error("❌ ไม่สามารถบันทึกข้อมูลลง Supabase ได้:", error);
    return { success: false, error };
  }
}