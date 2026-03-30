import { useState, useEffect } from 'react';
import { supabase, getCurrentUser } from '../utils/auth';
import { NavigationMenu } from '../components/NavigationMenu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Loader2, User, Mail, Save, CheckCircle2, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passMessage, setPassMessage] = useState({ type: '', text: '' });

  // State สำหรับข้อมูล Profile
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    employee_id:'',
  });

  // State สำหรับเปลี่ยนรหัสผ่าน
  const [passwords, setPasswords] = useState({
    currentPassword: '', // เพิ่มช่องนี้
    newPassword: '',
    confirmPassword: ''
  });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, employee_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          employee_id: data.employee_id||'',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'ดึงข้อมูลล้มเหลว: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันอัปเดตชื่อ-นามสกุล
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage({ type: '', text: '' });

    try {
      const user = getCurrentUser();
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          employee_id: profile.employee_id // เปิดให้แก้ถ้าต้องการ
        })
        .eq('id', user?.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว' });
      
      // อัปเดตข้อมูลใน Session
      if (user) {
        user.name = `${profile.first_name} ${profile.last_name}`;
        sessionStorage.setItem('paisan_current_user', JSON.stringify(user));
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  // ฟังก์ชันเปลี่ยนรหัสผ่าน
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage({ type: '', text: '' });

    // Validation เบื้องต้น
    if (passwords.newPassword.length < 8) {
      setPassMessage({ type: 'error', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร' });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPassMessage({ type: 'error', text: 'รหัสผ่านใหม่ไม่ตรงกัน' });
      return;
    }

    setChangingPassword(true);
    try {
        const user = getCurrentUser();
        if (!user?.email) throw new Error("ไม่พบข้อมูลอีเมลผู้ใช้");

        // 2. ตรวจสอบรหัสผ่านเดิม (Re-authenticate)
        const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.currentPassword,
        });

        if (signInError) {
        throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");
        }

        // 3. ถ้าผ่าน ให้ทำการเปลี่ยนรหัสผ่านใหม่
        const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.newPassword
        });

        if (updateError) throw updateError;

        setPassMessage({ type: 'success', text: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว' });
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); // ล้างค่าทั้งหมด
        } catch (err: any) {
            setPassMessage({ type: 'error', text: err.message });
        } finally {
            setChangingPassword(false);
        }
    };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#001489]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationMenu />
      
      <main className="max-w-2xl mx-auto py-10 px-4 space-y-8">
        
        {/* Card 1: ข้อมูลส่วนตัว */}
        <Card className="shadow-lg border-t-4 border-t-[#001489]">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="h-5 w-5 text-[#001489]" />
              ข้อมูลส่วนตัว
            </CardTitle>
            <CardDescription>แก้ไขชื่อและนามสกุลที่ใช้ในระบบ</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">ชื่อจริง</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      id="firstName"
                      className="pl-10"
                      value={profile.first_name}
                      onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">นามสกุล</Label>
                  <Input 
                    id="lastName"
                    value={profile.last_name}
                    onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 text-gray-400">
                <Label htmlFor="email">อีเมล (ไม่สามารถเปลี่ยนได้)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
                  <Input id="email" className="pl-10 bg-gray-50 cursor-not-allowed" value={profile.email} disabled />
                </div>
              </div>

              {message.text && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                  <span className="text-sm font-medium">{message.text}</span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#001489] hover:bg-[#000d5c] h-12"
                disabled={savingProfile}
              >
                {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                บันทึกการเปลี่ยนแปลง
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card 2: เปลี่ยนรหัสผ่าน */}
        <Card className="shadow-lg border-t-4 border-t-[#CB333B]">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#CB333B]" />
              เปลี่ยนรหัสผ่าน
            </CardTitle>
            <CardDescription>รหัสผ่านควรมีความยาวอย่างน้อย 6 ตัวอักษร</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
                {/* ช่องรหัสผ่านเดิม */}
                <div className="space-y-2">
                    <Label>รหัสผ่านเดิม</Label>
                    <div className="relative">
                    <Input 
                        type={showPass ? "text" : "password"}
                        placeholder="กรอกรหัสผ่านปัจจุบัน"
                        value={passwords.currentPassword}
                        onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})}
                        required
                    />
                    </div>
                </div>

                <hr className="my-4 border-gray-100" />
                {/* ช่องรหัสผ่านใหม่ */}
                <div className="space-y-2">
                    <Label>รหัสผ่านใหม่</Label>
                    <div className="relative">
                    <Input 
                        type={showPass ? "text" : "password"}
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                        required
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>ยืนยันรหัสผ่านใหม่</Label>
                    <Input 
                    type={showPass ? "text" : "password"}
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                    required
                    />
                </div>

              {passMessage.text && (
                <div className={`p-3 rounded flex items-center gap-2 text-sm ${
                  passMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {passMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {passMessage.text}
                </div>
              )}

              <Button type="submit" variant="destructive" className="w-full bg-[#CB333B]" disabled={changingPassword}>
                {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                ยืนยันการเปลี่ยนรหัสผ่าน
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}