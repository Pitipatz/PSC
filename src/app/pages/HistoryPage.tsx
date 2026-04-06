import { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/auth';
// ✅ เพิ่มการ Import Card คอมโพเนนต์ให้ครบ (ตรวจสอบ Path ให้ถูกตามโปรเจกต์คุณ)
import { Card, CardContent } from '../components/ui/card'; 
import { Truck } from 'lucide-react';
// ✅ เปลี่ยนเป็น 'react-router' ให้เหมือนกับ App.tsx เพื่อป้องกัน Error Context
import { useNavigate } from 'react-router-dom'; 
import { getCurrentUser, logoutUser } from '../utils/auth';
import { Header } from '../components/Header';


export default function HistoryPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);  
  const [isInitializing, setIsInitializing] = useState(true);

  // ดึงข้อมูล User และป้องกัน Error กรณีค่าเป็น null
  const [user, setUser] = useState<any>(() => {
    const curr = getCurrentUser();
    return {
      name: curr?.name || 'ผู้ใช้งาน',
      branch: curr?.branch || 'ทั่วไป',
      avatar_url: null // ใส่ค่าเริ่มต้นรอไว้
    };
  });
  const timerRef = useRef<any>(null);
  const INACTIVE_TIMEOUT = 60 * 60 * 1000; // 60 นาที

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

    if (isInitializing) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#001489] border-t-transparent"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header user={user} title='ประวัติการตรวจสอบราคา' subtitle='Check Price History'/>

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