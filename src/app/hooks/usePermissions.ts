import { useState, useEffect } from 'react';
import { supabase } from '../utils/auth';

export const usePermissions = () => {
  const [userPerms, setUserPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // 1. ดึง permissions ผ่าน RPC (ฟังก์ชันใน Supabase ที่ผมแนะนำไปก่อนหน้า)
        const { data, error } = await supabase.rpc('get_my_permissions');
        
        if (error) throw error;

        if (data) {
          // เก็บเฉพาะชื่อสิทธิ์ลงใน Array เช่น ['price.check', 'user.manage']
          setUserPerms(data.map((p: any) => p.perm_name));
        }
      } catch (err) {
        console.error('Error fetching permissions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  // 2. สร้างฟังก์ชันเช็คสิทธิ์
  const hasPermission = (permName: string) => userPerms.includes(permName);

  // 3. คืนค่าออกไปให้ Component อื่นใช้
  return { 
    hasPermission, 
    loading, 
    isAdmin: userPerms.includes('user.manage'), // หรือเช็คตาม logic คุณ
    permissions: userPerms 
  };
};