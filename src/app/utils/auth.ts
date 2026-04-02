import { createClient } from '@supabase/supabase-js';

// src/app/utils/auth.ts

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ตรวจสอบสักนิดว่าค่ามาจริงไหม (Optional)
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

// นำไปสร้าง Supabase Client ต่อได้เลย
export const supabase = createClient(supabaseUrl, supabaseKey);

export interface User {
  id: string;
  email: string;
  name: string;
  branch?: string;
  role: string;
  permissions: string[]; // เก็บรายการสิทธิ์ เช่น ['report.view', 'user.manage']
  loginTime: string;
}

/**
 * Login ผ่าน Supabase และดึงสิทธิ์การใช้งาน
 */
export async function loginUser(email: string, password: string): Promise<User | null> {
  try {
    // 1. ล็อกอินผ่าน Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) throw authError;

    // 2. ดึงข้อมูล Profile และ Permissions (ใช้ Function SQL ที่เราสร้างไว้ก่อนหน้านี้)
    /*
    const { data: permsData, error: permsError } = await supabase
      .rpc('get_user_permissions', { user_id: authData.user.id });

    if (permsError) throw permsError;
    */

    // 3. ดึงข้อมูล Profile พื้นฐาน
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, branch_id, branches (name_th)')
      .eq('id', authData.user.id)
      .single();

      // --- เพิ่มบรรทัดนี้เพื่อเช็คใน Console ตอนกด Login ---
      console.log("Raw Profile Data from Supabase:", profileData);
      // ----------------------------------------------

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    const currentUser: User = {
      id: authData.user.id,
      email: authData.user.email || '',
      name: profileData ? `${profileData.first_name} ${profileData.last_name}` : 'User',
      branch: (profileData as any)?.branches?.name_th || 'รอยืนยันสาขา',
      permissions:[],
      // permission: permsData.map((p: any) => p.perm_name), // แปลงเป็น Array ของ string
      loginTime: new Date().toISOString(),
      role: '' // สามารถดึงเพิ่มได้ถ้าต้องการ
    };

    // เก็บใน sessionStorage เพื่อความปลอดภัย
    sessionStorage.setItem('paisan_current_user', JSON.stringify(currentUser));
    return currentUser;

  } catch (e: any) {
    console.error("Login failed:", e);
    // พ่น Error ออกมาให้เห็นชัดๆ ว่าทำไมถึงพัง
    throw e; 
    
    // พิมพ์ก้อน Error ออกมาดูทั้งหมดใน Console
    console.error("Full Auth Error:", e); 
    
    // ถ้าเป็น Error จาก Supabase มันจะมี e.message หรือ e.details
    alert("เกิดข้อผิดพลาด: " + (e.message || "Server Error 500"));
    return null;
  }
}

// 1. ฟังก์ชันดึงค่าจาก Session แบบปกติ (Synchronous) - ใช้ในหน้า UI ทั่วไป
export function getCurrentUser(): User | null {
  const data = sessionStorage.getItem('paisan_current_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// 2. ฟังก์ชันตรวจสอบ Session จริงจาก Supabase (Asynchronous) - ใช้ตอน Initialize App
export async function getSessionUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export const logoutUser = async () => {
  await supabase.auth.signOut()
  localStorage.removeItem('paisan_remembered_email') // ถ้าต้องการล้างค่าที่จำไว้
}