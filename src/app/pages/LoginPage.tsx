import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Loader2, Eye, EyeOff } from 'lucide-react'; // ✅ เพิ่ม Icon สำหรับเปิด/ปิดตา
import { supabase, loginUser } from '../utils/auth'; // เปลี่ยนมาใช้ supabase client

// เพิ่มฟังก์ชันนี้ที่ด้านบนของ LoginPage.tsx (นอก Component)
const checkLockStatus = (email: string) => {
  const lockData = JSON.parse(localStorage.getItem(`lock_${email}`) || 'null');
  if (lockData && lockData.lockUntil && Date.now() < lockData.lockUntil) {
    const remainingMinutes = Math.ceil((lockData.lockUntil - Date.now()) / 60000);
    return `บัญชีนี้ถูกระงับชั่วคราว กรุณาลองใหม่ในอีก ${remainingMinutes} นาที`;
  }
  return null;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // ✅ สถานะเปิด/ปิดรหัสผ่าน
  
  useEffect(() => {
    // 1. เช็ก Session เฉพาะตอนโหลด Component ครั้งแรกเท่านั้น
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // ถ้ามี Session แล้ว ให้ไปหน้าหลัก และหยุดการทำงานทันที
        navigate('/pricecheck', { replace: true });
      }
    };
    checkSession();

    // 2. ดึงข้อมูล Remember Password (ทำครั้งเดียว)
    const savedEmail = localStorage.getItem('paisan_remembered_email');
    const savedPassword = localStorage.getItem('paisan_remembered_password');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberPassword(true);
    }
  }, []); // ❌ ลบ navigate ออกจาก dependency เพื่อป้องกัน Loop

  // 3. แยก useEffect สำหรับล้าง Error เมื่อเปลี่ยนโหมด
  useEffect(() => {
    setError('');
    setMessage('');
  }, [mode]);

  // ✅ ปรับเป็น async function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // 1. ดักตรวจความปลอดภัยรหัสผ่าน (เฉพาะ Register)
    if (mode === 'register') {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(password)) {
        setError("รหัสผ่านไม่ปลอดภัยพอ: ต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข");
        return; 
      }
    }

    // 2. เช็กสถานะการ Lock (เฉพาะ Login)
    if (mode === 'login') {
      const lockMessage = checkLockStatus(email);
      if (lockMessage) {
        setError(lockMessage);
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const user = await loginUser(email, password);

        if (!user) {
          const lockData = JSON.parse(localStorage.getItem(`lock_${email}`) || '{"attempts":0}');
          const newAttempts = lockData.attempts + 1;

          if (newAttempts >= 5) {
            const lockUntil = Date.now() + 15 * 60000;
            localStorage.setItem(`lock_${email}`, JSON.stringify({ attempts: newAttempts, lockUntil }));
            throw new Error("คุณใส่รหัสผิดเกิน 5 ครั้ง ระบบระงับบัญชีชั่วคราว 15 นาที");
          } else {
            localStorage.setItem(`lock_${email}`, JSON.stringify({ attempts: newAttempts }));
            throw new Error(`อีเมลหรือรหัสผ่านไม่ถูกต้อง (ครั้งที่ ${newAttempts}/5)`);
          }
        }

        localStorage.removeItem(`lock_${email}`);

        if (rememberPassword) {
          localStorage.setItem('paisan_remembered_email', email);
          localStorage.setItem('paisan_remembered_password', password);
        } else {
          localStorage.removeItem('paisan_remembered_email');
          localStorage.removeItem('paisan_remembered_password');
        }

        navigate('/pricecheck', { replace: true });

      } else if (mode === 'register') {
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '-';
        
        const { error: regError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: name
            }
          }
        });
        
        if (regError) throw regError;
        setMessage('ลงทะเบียนสำเร็จ! คุณสามารถเข้าสู่ระบบได้ทันที');
        setMode('login');

      } else if (mode === 'forgot') {
        const { error: forgotError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });
        if (forgotError) throw forgotError;
        setMessage('ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมลของคุณแล้ว');
      }

    } catch (err: any) {
      let friendlyMessage = err.message;
      if (err.message.includes("Password should be") || err.message.includes("signup_requires_strong_password")) {
        friendlyMessage = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์เล็ก, พิมพ์ใหญ่ และตัวเลข";
      } else if (err.message.includes("Invalid login credentials")) {
        friendlyMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      } else if (err.message.includes("User already registered")) {
        friendlyMessage = "อีเมลนี้ถูกใช้งานแล้ว";
      } else if (err.message.includes("rate limit")) {
        friendlyMessage = "คุณทำรายการบ่อยเกินไป กรุณารอสักครู่";
      }
      setError(friendlyMessage || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001489] to-[#001a70] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-8 pt-8">
          <div className="flex justify-center mb-6">
            <img src="/Paisan_Logo.png" alt="Paisan Capital Logo" className="h-20 w-auto" />
          </div>
          <CardTitle className="text-3xl font-bold text-[#001489]">
            {mode === 'login' ? 'เข้าสู่ระบบ' : mode === 'register' ? 'ลงทะเบียน' : 'ลืมรหัสผ่าน'}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 font-semibold">ชื่อ-นามสกุล *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="กรอกชื่อ-นามสกุล"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-lg"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-semibold">อีเมล *</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@paisancapital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-lg"
                required
                disabled={isLoading}
              />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-semibold">รหัสผ่าน *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"} // ✅ สลับ Type
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-lg pr-10"
                    required
                    disabled={isLoading}
                  />
                  {/* ✅ ปุ่มกดเปิด/ปิดตา */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {/* ✅ กล่องจดจำรหัสผ่านที่หายไป */}
            {mode === 'login' && (
              <div className="flex items-center space-x-2 py-1">
                <Checkbox
                  id="remember"
                  checked={rememberPassword}
                  onCheckedChange={(checked) => setRememberPassword(checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="remember" className="text-sm text-gray-700 cursor-pointer select-none">
                  จดจำรหัสผ่าน
                </Label>
              </div>
            )}

            {error && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">{error}</div>}
            {message && <div className="p-3 bg-green-50 text-green-700 text-sm font-medium rounded">{message}</div>}

            <Button type="submit" className="w-full bg-[#CB333B] hover:bg-[#a82930] h-12 text-lg shadow-lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (mode === 'login' ? 'เข้าสู่ระบบ' : mode === 'register' ? 'ลงทะเบียน' : 'ส่งลิงก์กู้คืนรหัสผ่าน')}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-center">
            {mode === 'login' && (
              <button onClick={() => setMode('forgot')} className="text-sm text-gray-500 hover:text-[#001489]">ลืมรหัสผ่านใช่หรือไม่?</button>
            )}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[#001489] font-semibold text-sm">
              {mode === 'login' ? 'ยังไม่มีบัญชี? ลงทะเบียน' : 'กลับไปหน้าเข้าสู่ระบบ'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}