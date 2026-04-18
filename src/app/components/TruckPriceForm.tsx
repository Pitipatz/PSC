import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form'; // ✅ เพิ่ม Import
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { TruckSpinner } from './ui/truck-spinner';
import NumericInput from './ui/NumericInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { resizeImage } from '../utils/imageresizer'; // หรือพาธที่ถูกต้องตามโครงสร้างโปรเจกต์คุณ
import { supabase } from '../utils/auth'; // ตรวจสอบ path ของ supabase client ของคุณ
import { getCurrentUser } from '../utils/auth';
import { getBranchLineGroupId } from '../services/branchService';
import { createPriceCheckFlex, createPriceCheckImageOnlyFlex } from '../utils/flexTemplates';
import { sendLinePush } from '../services/lineService';
import { updateLineNotifyStatus } from '../utils/logger';
// import { logPriceCheck } from '../utils/logger';


// ✅ ประกาศ Interface ให้ชัดเจนที่นี่ที่เดียว
export interface TruckData {
  brand: string;
  vehicleType: string;
  horsepower: string;
  chassisNumber: string;
  engineNumber: string;
  year: string;
  salePrice: number;
  images: string[];
  registration_image_url: string;
  registration_base64?: string;
  hasTrailer: boolean;
  otherBrand?: string; // ✅ เพิ่มเผื่อกรณีเลือก 'อื่นๆ'
}

interface TruckPriceFormProps {
  onSubmit: (data: TruckData) => void;
  calculationResult?: any;
  initialData?: any;
  onOcrApplied?: () => void;
}

interface VehicleType {
  id: string;
  vehicletype: string;
}

interface Brand {
  id: string;
  name: string;
}

export function TruckPriceForm({ onSubmit, calculationResult, initialData, onOcrApplied }: TruckPriceFormProps) {

  // ✅ 1. ตั้งค่า useForm
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors }
  } = useForm<TruckData>({
    defaultValues: {
      brand: '',
      vehicleType: '',
      horsepower: '',
      chassisNumber: '',
      engineNumber: '',
      year: '',
      salePrice: 0,
      images: [],
      registration_image_url: '',
      hasTrailer: false,
      otherBrand: '',
    }
  });

  // ใช้ watch เพื่อดูค่า brand ว่าเป็น "อื่นๆ" หรือไม่ จะได้แสดงช่องกรอกเพิ่ม
  const selectedBrand = watch('brand');
  const currentImages = watch('images') || [];
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const currentUser = getCurrentUser();
  const [isLineSent, setIsLineSent] = useState(false);

  // ✅ 2. จัดการ initialData ด้วย reset() ของ RHF
  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        registration_base64: initialData.registration_base64 || initialData.registrationImage || '',
        brand: initialData.brand || '',
        chassisNumber: initialData.chassisNumber || '',
        engineNumber: initialData.engineNumber || '',
        horsepower: initialData.horsepower || '',
        year: initialData.year || '',
        salePrice: initialData.salePrice || 0,
        hasTrailer: initialData.hasTrailer || false,
        otherBrand: initialData.brand === 'อื่นๆ' ? (initialData.otherBrand || '') : ''
      });
      if (onOcrApplied) {
        onOcrApplied();
      }
    }
  }, [initialData, reset, onOcrApplied]);

  // ดึงข้อมูลลักษณะรถ (เหมือนเดิม)
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      const cachedData = sessionStorage.getItem('v_types_cache');
      if (cachedData) {
        setVehicleTypes(JSON.parse(cachedData));
      }
      try {
        const { data } = await supabase.from('VehicleType').select('*').order('vehicletype');
        if (data) {
          setVehicleTypes(data);
          sessionStorage.setItem('v_types_cache', JSON.stringify(data));
          setIsLoadingTypes(false);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchVehicleTypes();
  }, []);

  useEffect(() => {
    const fetchBrands = async () => {
      const cachedData = sessionStorage.getItem('brands_cache');
      if (cachedData) {
        setBrands(JSON.parse(cachedData));
      }
      try {
        const { data } = await supabase.from('Brands').select('*').order('name');
        if (data) {
          setBrands(data);
          sessionStorage.setItem('brands_cache', JSON.stringify(data));
          setIsLoadingTypes(false);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchBrands();
  }, []);

  // ✅ 3. จัดการรูปภาพ (ใช้ setValue เพื่ออัปเดตข้อมูลเข้าไปใน RHF)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).slice(0, 4);
      const newImages: string[] = [];

      for (const file of fileArray) {
        if (file.size > 10 * 1024 * 1024) { 
          alert(`ไฟล์ ${file.name} ใหญ่เกินไป (เกิน 10MB)`);
          continue; 
        }
        try {
          const resizedBase64 = await resizeImage(file, 1024, 1024); 
          newImages.push(resizedBase64);
        } catch (error) {
          console.error("Error processing image:", error);
        }
      }

      setImagePreviews(newImages);
      setValue('images', newImages); // ยัดค่าลง Hook Form
    }
  };


  // ✅ ฟังก์ชันลบรูป
  const removeImage = (index: number) => {
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    const updatedImages = currentImages.filter((_, i) => i !== index);
    setImagePreviews(updatedPreviews);
    setValue('images', updatedImages); // อัปเดตค่า Hook Form
  };

  // ✅ 4. ฟังก์ชัน Submit รับ data ที่ถูก Validate แล้วจาก RHF 
  const onSubmitForm = async (data: TruckData) => {
    setIsLoading(true);
    try {
      onSubmit(data);
    } catch (error) {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsLoading(false); 
    }
  };

  // ✅ ฟังก์ชันจัดการรูปภาพหลายรูป (บีบอัด + Preview + เก็บข้อมูล)
  const handleSendLine = async () => {
    console.log("1. เริ่มกดปุ่มส่ง LINE");

    // 1. ดึง logId ที่มีอยู่แล้วจากการคำนวณ (ห้ามสร้างใหม่)
    const existingLogId = calculationResult?.logId; 
    const currentData = getValues();

    if (!existingLogId) {
      alert("ไม่พบข้อมูลการบันทึก กรุณากดคำนวณราคากลางก่อนครับ");
      return;
    }    

    // เช็คว่ามีข้อมูลพร้อมส่งไหม
    if (!currentData || !currentUser) {
      console.error("ข้อมูลไม่ครบ: truckData หรือ user หายไป");
      return;
    }
    
    const branchName = currentUser?.branch || "รอยืนยันสาขา"; // กำหนดค่าเริ่มต้นหากไม่มีข้อมูลสาขา
    // 1. เช็กความพร้อมข้อมูล (ใช้ logId เดิมถ้ามี หรือรัน logPriceCheck ใหม่)
    try {
      setIsLoading(true);

      console.log("2. กำลังยิง Function 'line-notify'...");

      // 2. ดึงข้อมูลที่เพิ่งบันทึก (รวมถึง URLs รูปภาพ) มาส่ง LINE
      const { data: latestLog, error } = await supabase
        .from('check_price_logs')
        .select('image_urls, brand, vehicle_type, horsepower, year, engine_number, chassis_number, sale_price, has_trailer, registration_image_url')
        .eq('id', existingLogId)
        .single();

      if (latestLog) {
        // 3. สร้าง Message โดยใช้ URL จาก Database
        const messageData = {
          id: existingLogId,
          mkt: currentUser?.name?.split(' ')[0] || "Guest",
          brand: latestLog.brand === 'อื่นๆ' ? currentData.otherBrand : latestLog.brand,
          vehicleType: latestLog.vehicle_type,
          horsepower: latestLog.horsepower,
          chassisNumber: latestLog.chassis_number,
          engineNumber: latestLog.engine_number,
          year: latestLog.year,
          salePrice: latestLog.sale_price,
          hasTrailer: latestLog.has_trailer,
          centralPrice: calculationResult?.centralPrice,
          trailerAmount: calculationResult?.trailerLoan,
          totalWithTrailer: calculationResult 
            ? (calculationResult.centralPrice * 0.7) + calculationResult.trailerLoan 
            : undefined,
          images: latestLog.image_urls, // อาร์เรย์รูปรถ
          registrationImageUrl: latestLog.registration_image_url
          //editUrl: window.location.href // หรือ link ที่ต้องการให้เขากด
        };
        
        // ✅ 3. เรียกใช้ฟังก์ชันที่คุณแยกไว้ (วางตรงนี้)
        const mainMsg = createPriceCheckFlex(messageData); 
        const imageMsg = createPriceCheckImageOnlyFlex(messageData);

        // ✅ 4. รวมร่างเป็น Array เดียว (สูงสุด 5 บับเบิ้ลตามกฎ LINE แต่ละข้อความ)
        const allMessages = [...mainMsg, ...imageMsg];

        // 5. ดึง Group ID และส่ง LINE
        const groupId = await getBranchLineGroupId(currentUser?.branch ?? "ทดสอบ");

        if (!groupId) {
          alert(`ไม่พบรหัสกลุ่ม LINE สำหรับสาขา ${branchName}`);
          return;
        }

        // 4. ส่ง LINE
        // ✅ 6. ส่ง Array ข้อมูล (allMessages) ไปที่ LINE
        const res = await sendLinePush(groupId, allMessages);
        console.log("LINE API Raw Response:", res); // ดูค่าที่ส่งกลับมาจริง ๆ

        // แก้ไขเงื่อนไขการเช็คให้ครอบคลุม (บางครั้ง API คืน status 200 แต่ไม่มี success: true)
        const isSuccess = res && (res.success === true || res.status === 200 || res.ok === true);

        if (error) {
          console.error("3. Edge Function ตอบกลับมาว่า Error:", error);
          // บังคับให้เป็น any เพื่อเข้าถึง .message
          alert(`ส่งไม่สำเร็จ: ${(error as any).message}`); 
          return;
        }

        // เช็กความสำเร็จ (รองรับทั้ง res.success หรือ res.status === 200)
        if (isSuccess) { 
          console.log("กำลังจะอัปเดต DB สำหรับ ID:", existingLogId);
          
          // ✅ 5. เรียกฟังก์ชัน Update ที่คุณมีใน logger.ts
          const updateResult = await updateLineNotifyStatus(existingLogId);

          if (updateResult) {
            console.log("✅ อัปเดตสถานะใน DB สำเร็จ");
            setIsLineSent(true); 
            alert("ส่งข้อมูลและบันทึกสถานะเรียบร้อยครับ");
          } else {
            console.error("❌ ส่งไลน์ผ่าน แต่ Update DB ไม่สำเร็จ");
            alert("ส่งไลน์สำเร็จ แต่ระบบบันทึกสถานะลงฐานข้อมูลไม่ได้");
          }
        } else {
          console.error("❌ LINE Push Failed:", res);
          alert("ส่ง LINE ไม่สำเร็จ");
        }
      }
    } catch (error) {
      console.error("Line Error:", error);
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  // เพิ่มฟังก์ชันนี้ไว้ก่อน return ครับ
  const handleReset = () => {
    // 1. ล้างค่าใน React Hook Form กลับไปเป็นค่าว่างตาม defaultValues
    reset({
      brand: '',
      vehicleType: '',
      horsepower: '',
      chassisNumber: '',
      engineNumber: '',
      year: '',
      salePrice: 0,
      images: [],
      registration_image_url: '',
      hasTrailer: false,
      otherBrand: '',
    });

    // 2. ล้าง State ภายใน Component (Preview รูป และ สถานะปุ่ม LINE)
    setImagePreviews([]);
    setIsLineSent(false);

    // 3. 🚨 จุดสำคัญ: ล้างค่าที่ Parent Component
    if (onSubmit) {
      onSubmit(null as any); 
    }

    // 4. (ถ้ามี) ล้างค่า File Input ที่เป็น Native HTML
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = "";

    // 5. เลื่อนหน้าจอขึ้นบนสุด
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
      <CardHeader className="bg-[#001489] text-white py-6">
        <CardTitle className="text-2xl flex items-center gap-3">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          กรอกข้อมูลรถบรรทุก
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* ✅ ห่อด้วย form และเรียกใช้ handleSubmit */}
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4 mt-4">
        
          {/* ยี่ห้อรถ */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">ลักษณะรถ *</Label>
            <Controller
              name="brand"
              control={control}
              rules={{ required: "กรุณาเลือกยี่ห้อรถ" }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoadingTypes}
                  required
                >
                  <SelectTrigger className="border-gray-300 h-12">
                    <SelectValue placeholder={isLoadingTypes ? "กำลังโหลด..." : "กรุณาเลือกยี่ห้อรถ"} />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.vehicleType && <span className="text-red-500">{errors.vehicleType.message}</span>}
          </div>

          {/* ระบุยี่ห้อเพิ่มเติม (แสดงเมื่อเลือกอื่นๆ) */}
          {/* แก้จากของเดิม เป็นแบบนี้ครับ */}
          {selectedBrand === 'อื่นๆ' && (
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg border-l-4 border-[#001489]">
              <Label htmlFor="otherBrand" className="text-[#001489] font-bold text-sm">ระบุยี่ห้อรถเพิ่มเติม *</Label>
              <Input 
                {...register("otherBrand", { required: "กรุณากรอกยี่ห้อ" })} 
                placeholder="เช่น SCANIA"
              /> {/* ✅ เอา onChange เดิมออกไปได้เลย */}
            </div>
          )}

          {/* ลักษณะรถ */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">ลักษณะรถ *</Label>
            <Controller
              name="vehicleType"
              control={control}
              rules={{ required: "กรุณาเลือกประเภทรถ" }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoadingTypes}
                  required
                >
                  <SelectTrigger className="border-gray-300 h-12">
                    <SelectValue placeholder={isLoadingTypes ? "กำลังโหลด..." : "กรุณาเลือกประเภทรถ"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((type) => (
                      <SelectItem key={type.id} value={type.vehicletype}>
                        {type.vehicletype}  {/* ✅ แก้จาก {type} เป็น {type.vehicletype} */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.vehicleType && <span className="text-red-500">{errors.vehicleType.message}</span>}
          </div>

          {/* ข้อมูลอื่นๆ: แรงม้า, แชซซี, เครื่อง, ปี, ราคา (รวมกลุ่มเพื่อความประหยัดพื้นที่) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600">แรงม้า</Label>
              <Input {...register("horsepower", { required: "กรุณากรอกแรงม้า" })} placeholder="เช่น 260"/>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600">ปีรถ (พ.ศ.) *</Label>
              <Input {...register("year", { required: "กรุณากรอกปีที่จดทะเบียน" })} placeholder="เช่น 2569" required/>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600">เลขแชซซี</Label>
              <Input {...register("chassisNumber", { required: "กรุณากรอกเลขแชซซี" })} placeholder="กรุณากรอกเลขแชซซี" required/>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600">เลขเครื่อง</Label>
              <Input {...register("engineNumber", { required: "กรุณากรอกเลขเครื่อง" })} placeholder="กรุณากรอกเลขเครื่อง"/>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600">ราคาขาย (บาท) *</Label>
              <Controller
                name="salePrice"
                control={control}
                rules={{ required: "กรุณากรอกราคาขาย" }}
                render={({ field }) => (
                  <NumericInput 
                    required 
                    placeholder="1,500,000" 
                    value={field.value} 
                    onChange={field.onChange} // ✅ ให้ RHF เป็นตัวจัดการ onChange
                  />
                )}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input 
                type="checkbox" 
                id="hasTrailer"
                {...register("hasTrailer")} // ✅ ใช้ register แทน checked และ onChange เดิม
                className="w-5 h-5 text-[#CB333B] rounded focus:ring-[#CB333B]"
              />
              <Label htmlFor="hasTrailer" className="text-gray-700 cursor-pointer">
                หางพ่วง (ราคาขายรวมหางพ่วง)
              </Label>
            </div>
          </div>

          {/* ✅ ส่วนอัปโหลดรูปภาพ 4 รูป */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <Label className="text-gray-700 font-semibold">แนบรูปรถ (สูงสุด 4 รูป)</Label>
              <span className={`text-xs font-bold ${imagePreviews.length >= 4 ? 'text-red-500' : 'text-[#001489]'}`}>
                {imagePreviews.length} / 4
              </span>
            </div>
            
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              disabled={imagePreviews.length >= 4}
              className="cursor-pointer file:bg-[#001489] file:text-white file:border-0 file:rounded-md"
            />

            {/* Preview Grid 2x2 */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {imagePreviews.map((src, index) => (
                <div key={index} className="relative group aspect-video rounded-xl overflow-hidden border-2 border-gray-200">
                  <img src={src} className="w-full h-full object-cover" alt="Preview" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button 
            type="submit"
            disabled={isLoading} // ป้องกันการกดซ้ำขณะโหลด
            className="w-full bg-[#CB333B] hover:bg-[#a82930] text-white py-6 text-lg rounded-xl shadow-lg transition-all mt-4"
          >
            {isLoading ? (
              <div className="size-sm flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <TruckSpinner size="sm" text="กำลังโหลด..." />
              </div>
            ) : (
              "คำนวณราคากลาง"
            )}
          </Button>

          {/* ✅ ปุ่มแจ้งข้อความผ่านไลน์ */}
          {calculationResult && (
            <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
              {/* แสดงเมื่อยังไม่ได้ส่งไลน์ */}
              {(!calculationResult.line_notify_sent && !isLineSent) ? (
                <div className="flex gap-3">
                  {/* ปุ่ม LINE (ครึ่งซ้าย) */}
                  <button
                    type="button"
                    onClick={handleSendLine}
                    className="flex-1 bg-[#06C755] hover:bg-[#05b34c] text-white py-2 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 font-bold active:scale-95 text-sm md:text-base"
                  >
                    {/* ไอคอน LINE SVG ที่คุณให้มา */}
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.771.039 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    แจ้งข้อความผ่านไลน์
                  </button>
                  {/* ปุ่ม Reset (ครึ่งขวา) */}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 font-bold active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    เริ่มใหม่
                  </button>
                </div>
              ) : (
                /* แสดงเมื่อส่งไลน์เรียบร้อยแล้ว */
                <div className="flex gap-3">
                  <div className="flex-1 text-green-600 font-bold flex items-center gap-2 py-2 justify-center border-2 border-green-200 rounded-xl bg-green-50 animate-in zoom-in-95 duration-300">
                    <span className="text-xl">✓</span>
                    <span>ส่งข้อมูลเข้า LINE เรียบร้อยแล้ว</span>
                  </div>
                  {/* ปุ่มเริ่มใหม่ (แบบเต็มความกว้างหลังจากส่งไลน์เสร็จ) */}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 font-bold active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    กรอกข้อมูลรถคันใหม่
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}