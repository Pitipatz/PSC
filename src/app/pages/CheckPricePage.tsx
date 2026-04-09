import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TruckPriceForm } from '../components/TruckPriceForm';
import { PriceResultTable } from '../components/PriceResultTable';
import { TruckImageGallery } from '../components/TruckImageGallery';
import { logoutUser, supabase } from '../utils/auth';
import { logPriceCheck, fetchVehicleTypes, fetchBrandNames } from '../utils/logger';
import { calculateCentralPrice, calculateTrailerAmount } from '../utils/priceCalculator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { TruckData } from '../utils/types';
import { TruckSpinner } from '../components/ui/truck-spinner';
import { Header } from '../components/Header';
import CameraScanner from '../components/CameraScanner'; // path ตามที่คุณวางไฟล์ไว้
import { Camera, X, RefreshCw } from 'lucide-react';
import { base64ToFile } from '../utils/base64ToFile';
import { recognizeText, parseRegistrationData } from '../utils/ocrHelper';

// ✅ ประกาศ Interface ให้ชัดเจนที่นี่ที่เดียว

export default function CheckPricePage() {
  const navigate = useNavigate();
  const [truckData, setTruckData] = useState<TruckData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const timerRef = useRef<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [calculationInfo, setCalculationInfo] = useState<{ modelName: string; images: string[] }>({ modelName: '', images: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [calculationTimestamp, setCalculationTimestamp] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dbVehicleTypes, setDbVehicleTypes] = useState<string[]>([]);
  const [dbVehicleBrands, setDbVehicleBrands] = useState<string[]>([]);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const allImages = [
    ...(imageUrl ? [imageUrl] : []), // ถ้ามีหน้าเล่ม ให้เอาไว้รูปแรก
    ...(truckData?.images || [])     // ตามด้วยรูปรถอื่นๆ
  ];
  // ปรับจำนวนตัวเลขบอกลำดับภาพ (Total)
  const totalImages = allImages.length;

  const uploadRegistrationImage = async (base64String: string) => {
    try {
      // 1. ตั้งชื่อไฟล์ให้ไม่ซ้ำกัน (Timestamp + Random String)
      const fileName = `reg-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${fileName}`; // เก็บไว้ที่ root ของ bucket หรือสร้าง folder เช่น 'uploads/${fileName}'

      // 2. แปลง Base64 เป็น File Object โดยใช้ Helper ที่เราเขียนไว้
      const file = base64ToFile(base64String, fileName);

      // 3. สั่ง Upload ไปยัง Bucket ชื่อ 'car-registration-books'
      const { data, error } = await supabase.storage
        .from('car-registration-books')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // 4. สร้าง Public URL เพื่อนำไปใช้แสดงผลหรือส่งให้ OCR API
      // หมายเหตุ: หากตั้ง Bucket เป็น Private ต้องใช้ createSignedUrl แทน
      const { data: { publicUrl } } = supabase.storage
        .from('car-registration-books')
        .getPublicUrl(filePath);

      return {
        path: data.path,
        fullUrl: publicUrl
      };

    } catch (error) {
      console.error('Error in uploadRegistrationImage:', error);
      throw error;
    }
  };

  // ฟังก์ชันรับรูปจาก CameraScanner
  const handleCapture = async (base64Img: string) => {
    console.log("🚀 เริ่มกระบวนการ OCR...");
    setCapturedImage(base64Img); // แสดงรูป Preview ทันที
    setIsCameraOpen(false);      // ปิดกล้อง
    setIsUploading(true);        // เริ่มสถานะ Loading
    setOcrProgress(0);

    try {
      // เรียกฟังก์ชัน Upload
      const result = await uploadRegistrationImage(base64Img);
      
      setImageUrl(result.fullUrl);
      console.log("Upload Success! URL:", result.fullUrl);

      // 2. (จำลอง) ขั้นตอน OCR - ในอนาคตจะเรียก API ตรงนี้
      // const ocrData = await startOCR(result.fullUrl);
      // 1. สั่ง OCR อ่านข้อความ
      const rawText = await recognizeText(base64Img, (p) => {
        setOcrProgress(Math.round(p * 100)); // เก็บเป็น %
      });
      console.log("ข้อความที่อ่านได้:", rawText);

      if (!rawText || rawText.trim() === "") {
        alert("OCR อ่านข้อความไม่ได้เลยครับ ลองถ่ายใหม่ให้ชัดขึ้นนะพี่");
        return;
      }

      // 2. แกะข้อมูลเป็น JSON
      const extractedData = parseRegistrationData(rawText, dbVehicleTypes, dbVehicleBrands);
      console.log("🎯 ข้อมูลที่แกะได้:", extractedData);
      
      // 3. ส่งข้อมูลเข้าฟอร์ม (State ที่พี่ส่งไปให้ TruckPriceForm)
      setOcrResult({
        brand: extractedData.brand,
        chassisNumber: extractedData.chassis,
        engineNumber: extractedData.engine,
        year: extractedData.year
      });

      alert("สแกนและอัปโหลดรูปสำเร็จ ระบบเตรียมกรอกข้อมูลให้ท่าน");

    } catch (error) {
      console.error("Capture handle error:", error);
      alert("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ");
    } finally {
      setIsUploading(false);
    }
  };

  const INACTIVE_TIMEOUT = 60 * 60 * 1000;

  // --- Functions ---
  const nextImage = () => {
    if (totalImages === 0) return;
    setCurrentImageIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    if (totalImages === 0) return;
    setCurrentImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const exportToPDF = async () => {
    if (!truckData) return;

    // 2. ใช้ setTimeout เพื่อรอให้ React เรนเดอร์ตัวเลขใหม่ลงไปใน HTML ก่อน 100ms
    setTimeout(async () => {
      const element = document.getElementById('hidden-pdf-template'); 
      if (!element) return;

      try {
        // setIsLoading(true);
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`ราคาประเมิน_${truckData.chassisNumber}.pdf`);
      } catch (error) {
        console.error("PDF Error:", error);
        alert("เกิดข้อผิดพลาดในการสร้าง PDF");
      } finally {
        // setIsLoading(false);
      }
    }, 100); // 👈 ดีเลย์ 100 มิลลิวินาที ชัวร์กว่าแน่นอน
  };

  const handleAutoLogout = () => {
    logoutUser();
    navigate('/');
    alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleAutoLogout, INACTIVE_TIMEOUT);
  };

  // --- Effects ---
  useEffect(() => {
  const initAuth = async () => {
    try {
      // 1. เช็ค Session ก่อน
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/', { replace: true });
        return;
      }

      // 2. ดึงข้อมูลโปรไฟล์แบบละเอียด (เหมือนหน้า Profile)
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*, branches(name_th)')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
        // 3. เซ็ต State user ด้วยข้อมูลที่มีทั้งชื่อ, สาขา และ avatar_url
        setUser({
          id: profileData.id,
          email: profileData.email,
          name: `${profileData.first_name} ${profileData.last_name}`,
          branch: profileData.branches?.name_th,
          avatar_url: profileData.avatar_url
        });

      } catch (err) {
        console.error("Auth error:", err);
        navigate('/', { replace: true });
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();
    resetTimer();
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [navigate]);

  // 1. โหลดข้อมูลประเภทรถตอนเปิดหน้าเว็บ
  useEffect(() => {
    const loadTypes = async () => {
      const types = await fetchVehicleTypes();
      setDbVehicleTypes(types);
    };
    loadTypes();
  }, []);

  useEffect(() => {
    const loadTypes = async () => {
      const types = await fetchBrandNames();
      setDbVehicleBrands(types);
    };
    loadTypes();
  }, []);

  const handleSubmit = async (data: TruckData) => {
    setIsLoading(true);
    resetTimer();

    if (!data) {
      // ถ้า data เป็น null (มาจากการกด "กรอกข้อมูลรถคันใหม่")
      setCalculationResult(null); // ล้างค่าผลการคำนวณเดิมทิ้ง
      setTruckData(null);
      setIsLoading(false);
      return; // จบการทำงาน ไม่ต้องไปทำส่วนคำนวณข้างล่าง
    }

    try {
      setIsLoading(true);
      // 🚩 จุดสำคัญ: เช็คก่อนเลยว่าถ้า data เป็น null (มาจากการ Reset)
      // ให้ล้างสถานะผลลัพธ์แล้ว "หยุดการทำงาน" ทันที ไม่ต้องไปบรรทัดถัดไป
      if (!data || Object.keys(data).length === 0) {
        setCalculationResult(null); // ล้างตารางผลลัพธ์บนหน้าจอ
        return; // จบฟังก์ชันแค่นี้พอ
      }
      
      // 1. ตรวจสอบ user
      if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนทำรายการ");
        return;
      }
      
      const inputYear = parseInt(data.year);
      const buddhistYear = inputYear > 2500 ? inputYear : inputYear + 543;
      const christianYear = inputYear > 2500 ? inputYear - 543 : inputYear;
      
      // 2. คำนวณราคากลาง
      const res = await calculateCentralPrice(data.chassisNumber, buddhistYear);

      const centralPrice = res.found ? (res.centralPrice || 0) : 0;
      const modelName = res.found ? (res.modelName || 'N/A') : 'ไม่พบรุ่นในระบบ';
      const trailerLoan = data.hasTrailer ? calculateTrailerAmount(centralPrice) : 0;

      // 3. บันทึก Log ลง Supabase (ต้องรอให้เสร็จเพื่อเอา logId)
      const logId = await logPriceCheck(
        user.email,
        user.name,
        data,
        centralPrice,
        modelName,
        trailerLoan
      );

      // 4. จัดการเวลาแสดงผล
      const now = new Date();
      const timestampStr = `${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH')}`;
      setCalculationTimestamp(timestampStr);

      // 5. เตรียมข้อมูลผลลัพธ์
      const resultData = {
        ...res,
        logId: logId || null,
        centralPrice,
        trailerLoan,
        timestamp: timestampStr
      };

      // 6. อัปเดต State เพื่อแสดงผลหน้าจอ
      setCalculationResult(resultData);
      setCalculationInfo({ 
        modelName: modelName, 
        images: res.images || [] 
      });
      
      // อัปเดตข้อมูลรถ (ใช้ centralPrice ที่คำนวณได้จริง ไม่ใช่ 0)
      setTruckData({ 
        ...data, 
        buddhistYear, 
        christianYear, 
        centralPrice: centralPrice 
      });

      // ถ้าไม่เจอ ให้แจ้งเตือนผู้ใช้ด้วย
      if (!res.found) {
        alert(`ไม่พบข้อมูลราคากลางสำหรับเลขคัสซี: ${data.chassisNumber}\n(ระบบบันทึกข้อมูลไว้แล้ว คุณยังสามารถส่ง LINE เพื่อปรึกษาได้)`);
      }

    } catch (error) {
      console.error("Submit Error:", error);
      alert("เกิดข้อผิดพลาด โปรดลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }; // จบฟังก์ชัน handleSubmit อย่างถูกต้อง

  if (isInitializing) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#001489] border-t-transparent"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header user={user} title='ระบบตรวจสอบราคากลาง' subtitle='Truck Appraisal' />

      <main className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <h1 className="text-2xl font-bold mb-4">ตรวจสอบราคารถ</h1>
          {/* ปุ่มเปิดกล้อง (วางไว้ก่อนฟอร์มกรอกข้อมูล) */}
          {!isCameraOpen && (
            <button
              onClick={() => setIsCameraOpen(true)}
              className="flex items-center gap-2 mb-6 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md"
            >
              <Camera size={20} />
              สแกนหน้าเล่มทะเบียน
            </button>
          )}

          {/* ส่วนแสดงกล้อง (ถ้าเปิดอยู่) */}
          {isCameraOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-lg bg-white rounded-2xl p-4 relative">
                <button 
                  onClick={() => setIsCameraOpen(false)}
                  className="absolute top-2 right-2 p-2 text-gray-500 hover:bg-gray-100 rounded-full z-10"
                >
                  <X size={24} />
                </button>
                <CameraScanner onCapture={handleCapture} />
              </div>
            </div>
          )}

          {/* ส่วนแสดงรูปที่ถ่ายได้ (Preview) */}
          {capturedImage && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 flex items-center gap-4">
              <img src={capturedImage} alt="Captured" className="w-32 h-24 object-cover rounded border" />
              <div>
                <p className="text-sm font-medium text-gray-600">รูปหน้าเล่มที่สแกนแล้ว</p>
                <button 
                  onClick={() => setCapturedImage(null)}
                  className="text-xs text-red-500 underline"
                >
                  ลบรูป/ถ่ายใหม่
                </button>
              </div>
            </div>
          )}
          {isUploading && (
            <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg border border-blue-200">
              <RefreshCw className="animate-spin text-blue-600 mb-2" size={32} />
              <p className="text-blue-800 font-medium">กำลังประมวลผล OCR...</p>
              {/* 🚀 นำมาใช้งานตรงนี้ Error "never read" จะหายไปทันที */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 max-w-[200px]">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${ocrProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-500 mt-1">{ocrProgress}%</p>
            </div>
          )}
          <TruckPriceForm 
            onSubmit={handleSubmit} 
            calculationResult={calculationResult}
            initialData={ocrResult} // 👈 เพิ่มบรรทัดนี้เพื่อให้ฟอร์มรับค่าที่สแกนได้
          />
          
          {/* ส่วนแสดงรูปที่ User อัปโหลด */}
          {allImages.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border-t-4 border-[#CB333B] overflow-hidden">
              <div className="bg-[#CB333B] text-white px-6 py-2 flex justify-between text-sm font-bold">
                <span>รูปที่กำลังตรวจสอบ</span>
                <span>{currentImageIndex + 1} / {totalImages}</span>
              </div>
              
              <div className="relative p-4 bg-gray-50 flex justify-center h-80">
                <div className="relative h-full flex items-center justify-center">
                  {/* แสดงรูปตาม Index ปัจจุบัน (ซึ่งรวมหน้าเล่มไปแล้ว) */}
                  <img 
                    src={allImages[currentImageIndex]} 
                    className="max-h-full object-contain rounded-lg" 
                    alt="Truck or Registration" 
                  />

                  {/* ✅ ถ้า Index ปัจจุบันคือ 0 และมีหน้าเล่ม ให้โชว์ป้ายกำกับ */}
                  {imageUrl && currentImageIndex === 0 && (
                    <div className="absolute bottom-2 bg-emerald-500/90 text-white text-[12px] px-3 py-1 rounded-full shadow-lg">
                      หน้าเล่มทะเบียน
                    </div>
                  )}
                </div>

                {/* ปุ่มกดเลื่อนภาพ */}
                {totalImages > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow">❮</button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow">❯</button>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* ✅ ย้ายมานี่: แสดง Gallery รูปจากฐานข้อมูล "หลังกดคำนวณแล้วเท่านั้น" */}
          {truckData && (
            <TruckImageGallery images={calculationInfo.images} modelName={calculationInfo.modelName} />
          )}
          
        </div>

        <div className="sticky top-28">
          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 flex flex-col items-center justify-center min-h-[400px]">
              <div className="size-sm flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <TruckSpinner size="sm" text="กำลังคำนวณ..." />
              </div>
            </div>
          ) : truckData ? (
            <div className="space-y-4">              
              <div className="flex justify-end">
                <button onClick={exportToPDF} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all">
                   บันทึกเป็น PDF
                </button>
              </div>

                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-[#CB333B]">ใบสรุปผลการประเมินราคารถ</h2>
                  <p className="text-gray-500 text-sm">พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}</p>
                </div>
                
                <PriceResultTable data={truckData} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border-2 border-dashed flex flex-col items-center justify-center min-h-[400px] text-gray-400">
               <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               <p className="text-lg">กรุณากรอกข้อมูลในฟอร์มเพื่อเริ่มตรวจสอบราคา</p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t mt-16 py-8">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center opacity-50">
          <img src="/Paisan_Logo.png" alt="Logo" className="h-10" />
          <p>© 2026 Paisan Capital Company Limited.</p>
        </div>
      </footer>
      
      {/* ----------------- ส่วนลับสำหรับ Print PDF (ไม่แสดงบนหน้าจอ) ----------------- */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="hidden-pdf-template" style={{ 
            width: '794px', // ขนาด A4 (96 DPI)
            padding: '40px',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontFamily: 'sans-serif' 
          }}>
          {/* หัวเอกสาร */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #CB333B', paddingBottom: '15px', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#CB333B', margin: '0' }}>
              ใบสรุปผลการประเมินราคารถ
            </h1>
            <p style={{ color: '#CB333B', fontSize: '14px', margin: '5px 0' }}>
              บริษัท ไพศาล แคปปิตอล จำกัด
            </p>
            
            {/* ข้อมูลเวลา (เน้นเวลาคำนวณ) */}
            <div style={{ textAlign: 'left', marginTop: '10px' }}>
              <p style={{ color: '#000000', fontSize: '11px', margin: '2px 0' }}>
                <strong>วันที่ตรวจสอบราคา:</strong> {calculationTimestamp} น.
              </p>
              <p style={{ color: '#666666', fontSize: '10px', margin: '2px 0' }}>
                สถานะ: พิมพ์ข้อมูลจากการคำนวณล่าสุด
              </p>
            </div>
          </div>

          {/* ข้อมูลรถบรรทุก */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
              <p style={{ fontSize: '12px', color: '#000000', margin: '0' }}>ยี่ห้อ / รุ่นรถ</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '5px 0' }}>{truckData?.brand} - {calculationInfo.modelName}</p>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
              <p style={{ fontSize: '12px', color: '#000000', margin: '0' }}>เลขแชซซี</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '5px 0' }}>{truckData?.chassisNumber}</p>
            </div>
          </div>

          {/* ตารางสรุปราคา (ใช้ Table HTML ธรรมดา) */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr style={{ backgroundColor: '#001489', color: '#ffffff' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #001489' }}>รายการประเมิน</th>
                <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #001489' }}>จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#fff7ed' }}>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', color: '#c2410c' }}>ราคาขาย</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#c2410c', fontWeight: 'bold' }}>
                  {((truckData?.salePrice || 0)).toLocaleString()}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>ราคากลาง</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold' }}>
                  {truckData?.centralPrice?.toLocaleString()}
                </td>
              </tr>
              <tr style={{ backgroundColor: '#fff7ed' }}>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', color: '#c2410c', fontWeight: 'bold' }}>วงเงินให้เช่าซื้อสูงสุด (70%)</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#c2410c', fontWeight: 'bold' }}>
                  {((truckData?.centralPrice || 0) * 0.7).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          {/* รูปถ่ายประกอบ (ถ้ามี) */}
          {allImages.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', color: '#333' }}>
                รูปถ่ายประกอบการประเมิน:
              </p>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '15px' 
              }}>
                {allImages.slice(0, 4).map((img, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img 
                      src={img} 
                      style={{ 
                        width: '100%', 
                        height: '180px', 
                        objectFit: 'contain', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc'
                      }} 
                    />
                    {/* ✅ ถ้าเป็นรูปแรก และพี่มี imageUrl (หน้าเล่ม) ให้ทำแถบคาดบอกใน PDF ด้วย */}
                    {i === 0 && imageUrl && (
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        backgroundColor: 'rgba(16, 185, 129, 0.9)', // สี emerald-500
                        color: 'white',
                        fontSize: '10px',
                        textAlign: 'center',
                        padding: '2px 0',
                        borderBottomLeftRadius: '8px',
                        borderBottomRightRadius: '8px'
                      }}>
                        หน้าเล่มทะเบียน
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ textAlign: 'right', marginTop: '30px' }}>
            <p>(__________________________)</p>
            <p>{user?.name || 'Guest'}</p>
            <p>ผู้ขอประเมินราคา</p>
          </div>
          <footer className="bg-white border-t mt-16 py-8">
            <div className="max-w-7xl mx-auto px-8 flex justify-between items-center opacity-50">
              <img src="/Paisan_Logo.png" alt="Logo" className="h-10" />
              <p>© 2026 Paisan Capital Company Limited.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}