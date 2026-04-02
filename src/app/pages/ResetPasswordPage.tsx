import { useState, useEffect } from "react";
import { supabase } from '../utils/auth';
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";
import { toast } from "sonner";
import { Timer, AlertCircle, CheckCircle2 } from "lucide-react"; // เพิ่มไอคอนประกอบ

export default function ResetPasswordPage() {
  const location = useLocation();
  // ดึง email จาก state ที่ส่งมาจากหน้าก่อนหน้า ถ้าไม่มีให้เป็นค่าว่าง
  const [email] = useState(location.state?.email || "");
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // เพิ่มยืนยันรหัสผ่าน
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(900); // 15 นาที = 900 วินาที

  // --- ระบบนับถอยหลัง ---
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- ระบบตรวจสอบความปลอดภัยรหัสผ่าน ---
  const getPasswordRequirements = () => {
    return [
      { label: "อย่างน้อย 8 ตัวอักษร", met: newPassword.length >= 8 },
      { label: "รหัสผ่านตรงกัน", met: newPassword === confirmPassword && newPassword !== "" },
      { label: "ห้ามเหมือนอีเมล", met: newPassword !== email || email === "" },
    ];
  };

  // ขั้นตอนที่ 1: ยืนยัน OTP
  const verifyOtp = async () => {
    if (timeLeft <= 0) return toast.error("รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่");
    if (!email || !token) return toast.error("กรุณากรอกอีเมลและรหัสยืนยัน");
    
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    setLoading(false);

    if (error) {
      toast.error("รหัสไม่ถูกต้อง: " + error.message);
    } else {
      toast.success("ยืนยันรหัสสำเร็จ กรุณาตั้งรหัสผ่านใหม่");
      setStep(2);
    }
  };

  // ขั้นตอนที่ 2: อัปเดตรหัสผ่านใหม่
  const updatePassword = async () => {
    const requirements = getPasswordRequirements();
    const allMet = requirements.every(r => r.met);

    if (!allMet) {
      return toast.error("กรุณาตั้งรหัสผ่านให้ถูกต้องตามเงื่อนไข");
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    setLoading(false);

    if (error) {
      setLoading(false);
      return toast.error("เกิดข้อผิดพลาด: " + error.message);
    } else {
      await supabase.auth.signOut();

      setLoading(false);
      
      // 3. แจ้งเตือนและพาไปหน้า Login
      toast.success("เปลี่ยนรหัสผ่านสำเร็จแล้ว! กรุณาล็อกอินด้วยรหัสใหม่");
      setTimeout(() => {
        navigate("/login", { replace: true }); // ใช้ replace เพื่อไม่ให้กด Back กลับมาหน้านี้ได้
      }, 2000);
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001489] to-[#001a70] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-[#CB333B]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
            {step === 1 ? "ยืนยันตัวตน" : "ตั้งรหัสผ่านใหม่"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 1 
              ? "กรอกรหัส 6 หลักที่ได้รับในอีเมลของคุณ" 
              : "กรุณาระบุรหัสผ่านใหม่ที่ต้องการใช้งาน"}
          </CardDescription>
          
          {/* แสดงตัวนับถอยหลังเฉพาะขั้นตอนที่ 1 */}
          {step === 1 && (
            <div className={`flex items-center justify-center gap-2 text-sm font-medium mt-2 ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
              <Timer size={16} />
              รหัสหมดอายุใน: {formatTime(timeLeft)}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">อีเมลที่ใช้สมัคร</label>
                <p className="text-center text-sm text-slate-500">
                  รหัสถูกส่งไปที่ <span className="font-medium text-slate-700">{email}</span>
                </p>
              </div>
              <div className="space-y-2 flex flex-col items-center">
                <label className="text-sm font-medium text-slate-700 self-start">รหัสยืนยัน (OTP)</label>
                <InputOTP 
                  maxLength={6} 
                  value={token} 
                  onChange={(val) => setToken(val)}
                  disabled={timeLeft <= 0}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button 
                onClick={verifyOtp} 
                className="w-full bg-[#CB333B] hover:bg-[#a82930] h-11 shadow-md transition-all"
                disabled={loading || timeLeft <= 0}
              >
                {loading ? "กำลังตรวจสอบ..." : timeLeft <= 0 ? "รหัสหมดอายุแล้ว" : "ยืนยันรหัส"}
              </Button>
              {timeLeft <= 0 && (
                <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                  ขอรหัสใหม่
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">รหัสผ่านใหม่</label>
                  <Input 
                    type="password" 
                    placeholder="ระบุรหัสผ่านใหม่"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">ยืนยันรหัสผ่านใหม่</label>
                  <Input 
                    type="password" 
                    placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {/* รายการตรวจสอบความถูกต้อง (Password Checklist) */}
                <div className="bg-slate-100 p-3 rounded-lg space-y-2">
                  {getPasswordRequirements().map((req, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-600' : 'text-slate-500'}`}>
                      {req.met ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {req.label}
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                onClick={updatePassword} 
                className="w-full bg-green-600 hover:bg-green-700 h-11"
                disabled={loading || !getPasswordRequirements().every(r => r.met)}
              >
                {loading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}