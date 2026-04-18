import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/auth';
import { Header, Footer } from '../Header';

const INACTIVE_TIMEOUT = 60 * 60 * 1000; // 60 นาที

export default function MainLayout() {
  console.log("🚀 MainLayout v2 mounted");
  const [user, setUser] = useState<any>(null);
  const [pageInfo, setPageInfo] = useState({ title: '', subtitle: '' });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);
  const navigateRef = useRef(navigate); // ✅ เก็บ navigate ใน ref เพื่อไม่ให้ useEffect re-run

  // อัปเดต ref ทุกครั้งที่ navigate เปลี่ยน โดยไม่ต้องใส่ใน dependency
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // ฟังก์ชันรีเซ็ตตัวจับเวลา
  const resetTimer = useRef(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(async () => {
      console.log("Inactivity timeout reached. Logging out...");
      await supabase.auth.signOut();
    }, INACTIVE_TIMEOUT);
  }).current;

  // ฟังก์ชันดึง Profile จาก Supabase
  const fetchProfile = async (userId: string, fallback: { id: string; email: string }) => {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*, branches(name_th)')
      .eq('id', userId)
      .single();
 
    if (error || !profileData) {
      console.error("Profile fetch error:", error);
      return { id: fallback.id, email: fallback.email, name: 'User' };
    }

    return {
      id: profileData.id,
      email: profileData.email,
      name: `${profileData.first_name} ${profileData.last_name}`,
      branch: profileData.branches?.name_th,
      avatar_url: profileData.avatar_url,
    };
  };

  useEffect(() => {
    let isMounted = true; // ✅ ตัวแปรสำคัญ: ป้องกันการอัปเดตสถานะถ้าระบบกำลังโหลดซ้อนกัน (Strict Mode)

    const initializeApp = async () => {
      try {
        console.log("⏳ เริ่มตรวจสอบ Session ตอนโหลดหน้า...");
        // 1. ดึงข้อมูล Session ทันทีที่โหลดหน้า
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          console.log("✅ เจอ Session, กำลังดึงข้อมูล Profile...");
          const profile = await fetchProfile(session.user.id, {
            id: session.user.id,
            email: session.user.email ?? '',
          });

          if (isMounted) {
            setUser(profile);
          }
        } else {
          console.log("❌ ไม่เจอ Session, เด้งกลับหน้า Login");
          if (isMounted && window.location.pathname !== '/') {
            navigateRef.current('/', { replace: true });
          }
        }
      } catch (err) {
        console.error("🚨 Initialization error:", err);
      } finally {
        if (isMounted) {
          setLoading(false); // ✅ บังคับหยุดหมุน
          console.log("🛑 สั่งหยุดหมุนหน้าจอแล้ว");
        }
      }
    };

    // เรียกทำงานทันทีที่เปิดหน้า
    initializeApp();

    // 2. ตัว Listener นี้ให้ทำงาน "เฉพาะตอนมีคนกด Logout" ก็พอครับ (ลดความซับซ้อน)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_OUT') {
        console.log("👋 ออกจากระบบ...");
        setUser(null);
        if (window.location.pathname !== '/') {
          navigateRef.current('/', { replace: true });
        }
      }
    });

    // 3. จัดการ Event การขยับเมาส์
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, resetTimer));

    return () => {
      isMounted = false; // 🧹 ทำความสะอาดเมื่อเปลี่ยนหน้า
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} title={pageInfo.title} subtitle={pageInfo.subtitle} />

      <main className="flex-1 flexgrow">
        <Outlet context={{ user, setPageInfo }} />
      </main>

      <Footer />
    </div>
  );
}