import { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/auth';
import { NavigationMenu } from '../components/NavigationMenu';
// ✅ เพิ่มการ Import Card คอมโพเนนต์ให้ครบ (ตรวจสอบ Path ให้ถูกตามโปรเจกต์คุณ)
import { Card, CardContent } from '../components/ui/card'; 
import { Truck } from 'lucide-react';
// ✅ เปลี่ยนเป็น 'react-router' ให้เหมือนกับ App.tsx เพื่อป้องกัน Error Context
import { useNavigate } from 'react-router-dom'; 
import { getCurrentUser, logoutUser } from '../utils/auth';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);  

  // ดึงข้อมูล User และป้องกัน Error กรณีค่าเป็น null
  const [user, setUser] = useState(() => {
    const curr = getCurrentUser();
    return curr || { name: 'ผู้ใช้งาน', branch: 'ทั่วไป' };
  });

  const timerRef = useRef<any>(null);
  const INACTIVE_TIMEOUT = 60 * 60 * 1000; // 60 นาที

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const handleAutoLogout = () => {
    logoutUser();
    navigate('/');
    alert('เซสชันหมดอายุเนื่องจากไม่มีความเคลื่อนไหว กรุณาเข้าสู่ระบบใหม่');
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleAutoLogout, INACTIVE_TIMEOUT);
  };

  // ดึงข้อมูลจาก Supabase
  useEffect(() => {
    async function fetchLogs() {
      try {
        const { data, error } = await supabase
          .from('check_price_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  // ระบบ Security & Auto Logout
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);

    resetTimer();
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-md border-b-4 border-[#CB333B] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto py-4 px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="bg-gradient-to-br from-[#001489] to-[#001a70] rounded-lg p-1">
                <NavigationMenu />
              </div>
              <div className="flex items-center gap-4 transition-all duration-500 ease-in-out">
                <img 
                  src="/Paisan_Logo.png" 
                  alt="Logo" 
                  className="h-16 w-auto hidden sm:block" 
                />
                <div className="border-l-2 border-gray-200 pl-6">
                  <h1 className="text-2xl font-bold text-[#001489] leading-tight">ประวัติการตรวจสอบราคา</h1>
                  <p className="text-gray-500 text-sm">Truck Central Price System</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-4 py-2 rounded-full">
                <div className="w-8 h-8 bg-[#001489] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-gray-800">{user.name}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-[#001489] font-semibold">{user.branch}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="text-[#CB333B] border border-[#CB333B] p-2 rounded-full hover:bg-red-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        {loading ? (
          <div className="text-center py-20">กำลังโหลดข้อมูล...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">ไม่พบประวัติการตรวจสอบราคา</div>
        ) : (
          <div className="grid gap-6">
            {logs.map((log) => (
              <Card key={log.id} className="overflow-hidden border-l-4 border-l-[#001489] bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[#001489] font-bold text-lg">
                        <Truck className="h-5 w-5" />
                        {log.brand} - {log.model_found}
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600">
                        <p><strong>ลักษณะ:</strong> {log.vehicle_type}</p>
                        <p><strong>แรงม้า:</strong> {log.horsepower} HP</p>
                        <p><strong>ปี:</strong> {log.year}</p>
                        <p><strong>แชซซี:</strong> {log.chassis_number}</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-xl flex flex-col justify-center items-end min-w-[200px]">
                      <p className="text-xs text-gray-500 uppercase">ราคากลางที่คำนวณได้</p>
                      <p className="text-2xl font-black text-[#CB333B]">
                        {Number(log.central_price).toLocaleString()} บาท
                      </p>
                      <p className="text-[10px] text-gray-400 mt-2">
                        {new Date(log.created_at).toLocaleString('th-TH')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}