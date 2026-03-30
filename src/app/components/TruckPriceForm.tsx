import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import NumericInput from './ui/NumericInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { resizeImage } from '../utils/imageresizer'; // หรือพาธที่ถูกต้องตามโครงสร้างโปรเจกต์คุณ
import { supabase } from '../utils/auth'; // ตรวจสอบ path ของ supabase client ของคุณ
import { getCurrentUser } from '../utils/auth';
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
  hasTrailer: boolean; // ✅ เพิ่มฟิลด์นี้
}

interface TruckPriceFormProps {
  onSubmit: (data: TruckData) => void;
  // เพิ่ม prop เพื่อรับค่าผลการคำนวณจาก CheckPricePage (ถ้ามี)
  calculationResult?: any;
}

interface VehicleType {
  id: string;
  vehicletype: string;
}

export function TruckPriceForm({ onSubmit, calculationResult }: TruckPriceFormProps) {
  // 1. State สำหรับข้อมูลฟอร์ม
  const [formData, setFormData] = useState<TruckData>({
    brand: '',
    vehicleType: '',
    horsepower: '',
    chassisNumber: '',
    engineNumber: '',
    year: '',
    salePrice: 0,
    images: [],
    hasTrailer: false, // ✅ กำหนดค่าเริ่มต้น
  });

  // 2. State อื่นๆ
  const [isLoading, setIsLoading] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [otherBrand, setOtherBrand] = useState('');

  // 🚩 เพิ่มการดึง currentUser ไว้ตรงนี้ เพื่อใช้ใน handleSendLine
  const currentUser = getCurrentUser();

  // ดึงข้อมูลลักษณะรถ
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      // 1. ดึงจาก Cache มาโชว์ก่อน (เพื่อความเร็ว)
      const cachedData = sessionStorage.getItem('v_types_cache');
      if (cachedData) {
        setVehicleTypes(JSON.parse(cachedData));
        // ไม่ต้อง return; แล้วนะ ให้มันทำงานบรรทัดต่อไปต่อ
      }

      try {
        // 2. แอบไปดึงจาก Supabase (เพื่อความสดใหม่)
        const { data } = await supabase
          .from('VehicleType')
          .select('*')
          .order('vehicletype');

        if (data) {
          // 3. อัปเดตหน้าจอด้วยข้อมูลล่าสุดจาก DB
          setVehicleTypes(data);
          // 4. อัปเดต Cache ให้เป็นปัจจุบันที่สุด
          sessionStorage.setItem('v_types_cache', JSON.stringify(data));
          setIsLoadingTypes(false); // ✅ ต้องเพิ่มบรรทัดนี้ เพื่อให้ Dropdown เปิดให้กดได้
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchVehicleTypes();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      const fileArray = Array.from(files).slice(0, 4);
      const newImages: string[] = [];

      // ใช้ for...of เพื่อรอจัดการบีบอัดทีละรูป
      for (const file of fileArray) {
        if (file.size > 10 * 1024 * 1024) { 
          alert(`ไฟล์ ${file.name} ใหญ่เกินไป (เกิน 10MB)`);
          continue; 
        }

        try {
          // 1. บีบอัดรูปภาพ
          const resizedBase64 = await resizeImage(file, 1024, 1024); 
          newImages.push(resizedBase64);
        } catch (error) {
          console.error("Error processing image:", error);
        }
      }

      // 2. อัปเดต State ทั้งหมดในครั้งเดียว
      // - setImagePreviews สำหรับแสดงรูปบนหน้าจอ
      // - setFormData สำหรับเตรียมส่งข้อมูลไป Google Drive
      setImagePreviews(newImages);
      setFormData(prev => ({ ...prev, images: newImages }));
    }
  };

  // ✅ ฟังก์ชันลบรูป
  const removeImage = (index: number) => {
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setImagePreviews(updatedPreviews);
    setFormData({ ...formData, images: updatedImages });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setIsLoading(true);

    try {

      // 4. ส่งข้อมูลกลับไปหน้าหลักเพื่อคำนวณและแสดง Table
      onSubmit(formData);

    } catch (error) {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      // ปิดสถานะการโหลด
      setIsLoading(false); 
    }
  };

  // ✅ ฟังก์ชันจัดการรูปภาพหลายรูป (บีบอัด + Preview + เก็บข้อมูล)
  // TruckPriceForm.tsx
  const handleSendLine = async () => {
    try {
      // 🚩 currentUser.name จะไม่ Error แล้วเพราะเราประกาศไว้ด้านบนสุดของ Component
      const { error } = await supabase.functions.invoke('line-notify', {
        body: { 
          to: "ID_LINE_GROUP", 
          messages: [
            {
              type: "flex",
              altText: "📢 แจ้งขอยอดจัดใหม่",
              contents: {
                type: "bubble",
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    { type: "text", text: "📢 รบกวนขอยอดจัด", weight: "bold", color: "#1DB446" },
                    { type: "text", text: `ยี่ห้อ: ${formData.brand}`, margin: "md" },
                    { type: "text", text: `ราคาขาย: ${Number(formData.salePrice).toLocaleString()} บาท` },
                    { type: "text", text: `ผู้ขอ: ${currentUser?.name || 'ไม่ระบุชื่อ'}`, size: "xs", color: "#aaaaaa" }
                  ]
                }
              }
            }
          ]
        }
      });
      if (error) throw error;
      alert('ส่งไลน์สำเร็จ!');
    } catch (err) {
      console.error(err);
      alert('ส่งไลน์ไม่สำเร็จ');
    }
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
      
      <CardContent className="pt-8 pb-8 px-6">
        <form onSubmit={handleSubmit} className="space-y-5">
        
          {/* ยี่ห้อรถ */}
          <div className="space-y-2">
            <Label htmlFor="brand" className="text-gray-700 font-semibold">ยี่ห้อรถ *</Label>
            <Select
              value={formData.brand}
              onValueChange={(value) => setFormData({ ...formData, brand: value })}
              required
            >
              <SelectTrigger id="brand" className="border-gray-300 h-12 rounded-lg">
                <SelectValue placeholder="เลือกยี่ห้อรถ" />
              </SelectTrigger>
              <SelectContent>
                {["HINO", "ISUZU", "รถพ่วง", "NISSAN", "MITSUBISHI", "UD", "VOLVO", "TOYOTA", "อื่นๆ"].map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ระบุยี่ห้อเพิ่มเติม (แสดงเมื่อเลือกอื่นๆ) */}
          {formData.brand === 'อื่นๆ' && (
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg border-l-4 border-[#001489]">
              <Label htmlFor="otherBrand" className="text-[#001489] font-bold text-sm">ระบุยี่ห้อรถเพิ่มเติม *</Label>
              <Input
                id="otherBrand"
                placeholder="เช่น SCANIA"
                value={otherBrand}
                onChange={(e) => setOtherBrand(e.target.value)}
                required
                className="bg-white"
              />
            </div>
          )}

          {/* ลักษณะรถ */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">ลักษณะรถ *</Label>
            <Select
              value={formData.vehicleType}
              onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
              disabled={isLoadingTypes}
              required
            >
              <SelectTrigger className="border-gray-300 h-12">
                <SelectValue placeholder={isLoadingTypes ? "กำลังโหลด..." : "เลือกลักษณะรถ"} />
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map((type) => (
                  <SelectItem key={type.id} value={type.vehicletype}>
                    {type.vehicletype}  {/* ✅ แก้จาก {type} เป็น {type.vehicletype} */}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ข้อมูลอื่นๆ: แรงม้า, แชซซี, เครื่อง, ปี, ราคา (รวมกลุ่มเพื่อความประหยัดพื้นที่) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600">แรงม้า</Label>
              <Input placeholder="เช่น 260 HP" value={formData.horsepower} onChange={e => setFormData({...formData, horsepower: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600">ปีรถ (พ.ศ.) *</Label>
              <Input required placeholder="2569" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600">เลขแชซซี</Label>
              <Input placeholder="กรอกเลขแชซซี" value={formData.chassisNumber} onChange={e => setFormData({...formData, chassisNumber: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600">เลขเครื่อง</Label>
              <Input placeholder="กรอกเลขเครื่อง" value={formData.engineNumber} onChange={e => setFormData({...formData, engineNumber: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600">ราคาขาย (บาท) *</Label>
              <NumericInput required placeholder="1,500,000" value={formData.salePrice} onChange={(val: number) => setFormData({...formData, salePrice: val})} />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input 
                type="checkbox" 
                id="hasTrailer"
                checked={formData.hasTrailer}
                onChange={(e) => setFormData({ ...formData, hasTrailer: e.target.checked })}
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
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังคำนวณ...
              </div>
            ) : (
              "คำนวณราคากลาง"
            )}
          </Button>

          {/* ✅ ปุ่มแจ้งข้อความผ่านไลน์ */}
          {calculationResult && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <button
                type="button"
                onClick={handleSendLine}
                className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white py-2 text-lg rounded-xl shadow-lg transition-all mt-3 flex items-center justify-center gap-3 font-bold active:scale-95"
              >
                {/* ไอคอน LINE SVG ที่คุณให้มา */}
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.771.039 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                แจ้งข้อความผ่านไลน์
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}