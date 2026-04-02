import { supabase } from './auth'; // ตรวจสอบ path ให้ตรงกับโปรเจกต์คุณ

/**
 * ฟังก์ชันสำหรับแปลง Base64 เป็น Blob และอัปโหลดขึ้น Supabase Storage
 * @param base64String ข้อมูลรูปภาพแบบ Base64
 * @param bucketName ชื่อ Bucket ใน Supabase (เช่น 'truck_images')
 * @param pathName เส้นทางไฟล์ (เช่น 'log_123/image_0.jpg')
 */
export const uploadImageToStorage = async (
  base64String: string,
  bucketName: string,
  pathName: string
): Promise<string> => {
  try {
    // 1. แปลง Base64 เป็น Blob
    const base64Response = await fetch(base64String);
    const blob = await base64Response.blob();

    // 2. อัปโหลดไปที่ Supabase Storage
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(pathName, blob, {
        cacheControl: '3600',
        upsert: true, // ถ้ามีไฟล์ชื่อซ้ำให้ทับเลย
      });

    if (error) {
      throw new Error(`Upload Error: ${error.message}`);
    }

    // 3. ดึง Public URL กลับมา
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(pathName);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadImageToStorage:', error);
    throw error;
  }
};