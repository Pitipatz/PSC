import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ ฟังก์ชันเช็กกฎความปลอดภัยที่คุณต้องการ
  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร";
    if (!/[A-Z]/.test(pwd)) return "ต้องมีตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว";
    if (!/[a-z]/.test(pwd)) return "ต้องมีตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว";
    if (!/[0-9]/.test(pwd)) return "ต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว";
    if (!/[!@#$%^&*]/.test(pwd)) return "ต้องมีอักขระพิเศษ (เช่น !@#$) อย่างน้อย 1 ตัว";
    
    // 🚩 กฎพิเศษ: ห้ามมีตัวอักษรซ้ำกัน 3 ตัวติดกัน (เช่น aaa, 111)
    if (/(.)\1\1/.test(pwd)) return "ห้ามมีตัวอักษรหรือตัวเลขซ้ำติดกัน 3 ตัว (เช่น aaa, 111)";
    
    return null;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      // ✅ ส่งคำสั่งอัปเดตรหัสผ่านไปที่ Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      alert("เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
      navigate('/');
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการอัปเดต");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001489] to-[#001a70] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#001489]">ตั้งรหัสผ่านใหม่</CardTitle>
          <p className="text-sm text-gray-500 mt-2">กรุณากำหนดรหัสผ่านใหม่ที่ปลอดภัย</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-[#CB333B] h-12" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "อัปเดตรหัสผ่าน"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}