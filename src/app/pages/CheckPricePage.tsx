import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TruckPriceForm } from '../components/TruckPriceForm';
import { PriceResultTable } from '../components/PriceResultTable';
import { TruckImageGallery } from '../components/TruckImageGallery';
import { NavigationMenu } from '../components/NavigationMenu';
import { getCurrentUser, logoutUser } from '../utils/auth';
import { logPriceCheck } from '../utils/logger';
import { calculateCentralPrice, calculateTrailerAmount } from '../utils/priceCalculator';
import { supabase } from '../utils/auth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { TruckData } from '../utils/types';

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

  const INACTIVE_TIMEOUT = 60 * 60 * 1000;

  // --- Functions ---
  const nextImage = () => {
    if (!truckData) return;
    setCurrentImageIndex((prev) => prev === truckData.images.length - 1 ? 0 : prev + 1);
  };

  const prevImage = () => {
    if (!truckData) return;
    setCurrentImageIndex((prev) => prev === 0 ? truckData.images.length - 1 : prev - 1);
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
        const cachedUser = getCurrentUser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/', { replace: true });
          return;
        }
        setUser(cachedUser || session.user);
      } catch (err) {
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
      <header className="bg-white shadow-md border-b-4 border-[#CB333B] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto py-4 px-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="bg-[#001489] rounded-lg p-1"><NavigationMenu /></div>
            <img src="/Paisan_Logo.png" alt="Logo" className="h-12 hidden sm:block" />
            <div className="hidden md:block border-l pl-6">
              <h1 className="text-xl font-bold text-[#001489]">ระบบตรวจสอบราคากลาง</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-gray-50 border px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
              <div className="w-8 h-8 bg-[#001489] text-white rounded-full flex items-center justify-center text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-gray-800">{user.name ? user.name.split(' ')[0] : 'Guest'}</span>
                <span className="text-gray-300">|</span>
                <span className="text-[#001489] font-semibold">{user.branch || 'รอยืนยันสาขา'}</span>
              </div>
            </div>
            <button onClick={() => { logoutUser(); navigate('/'); }} className="text-red-600 p-2 border rounded-full hover:bg-red-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <TruckPriceForm 
            onSubmit={handleSubmit} 
            calculationResult={calculationResult} // ✅ ส่งค่าที่มี logId กลับไปให้ Form
          />
          
          {/* ส่วนแสดงรูปที่ User อัปโหลด */}
          {truckData?.images && truckData.images.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border-t-4 border-[#CB333B] overflow-hidden">
              <div className="bg-[#CB333B] text-white px-6 py-2 flex justify-between text-sm font-bold">
                <span>รูปที่กำลังตรวจสอบ</span>
                <span>{currentImageIndex + 1} / {truckData.images.length}</span>
              </div>
              <div className="relative p-4 bg-gray-50 flex justify-center h-80">
                <img src={truckData.images[currentImageIndex]} className="max-h-full object-contain rounded-lg" alt="Truck" />
                {truckData.images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow">❮</button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow">❯</button>
                  </>
                )}
              </div>
            </div>
          )}

          <TruckImageGallery images={calculationInfo.images} modelName={calculationInfo.modelName} />
          
        </div>

        <div className="sticky top-28">
          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#001489] mb-4"></div>
              <p className="text-[#001489] font-bold">กำลังคำนวณราคากลาง...</p>
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

                <div className="mt-8 pt-6 border-t">
                  <h3 className="font-bold text-gray-700 mb-4">รูปถ่ายประกอบการประเมิน</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {truckData.images?.slice(0, 4).map((img, i) => (
                      <img key={i} src={img} className="w-full h-32 object-contain border rounded-lg bg-gray-50" />
                    ))}
                  </div>
                </div>
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
          {truckData?.images && truckData.images.length > 0 && (
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>รูปถ่ายประกอบการประเมิน:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {truckData.images.slice(0, 4).map((img, i) => (
                  <img key={i} src={img} style={{ width: '100%', height: '200px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
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