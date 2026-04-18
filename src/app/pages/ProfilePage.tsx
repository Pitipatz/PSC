import { useState, useRef, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { User as UserIcon, Briefcase, Pencil, Camera, Image as ImageIcon, Mail, Phone, Building2, Calendar, KeyRound, ShieldCheck, ShieldAlert, Eye, EyeOff, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { getCurrentUser, supabase } from '../utils/auth';

interface UserData {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  phone: string;
  internal_phone: string;
  avatar_url: string;
  branch_id: number;
  branches?: {
    name_th: string;
  };
  dept_id: string;
  departments?: {
    name_th: string;
  };
  job_level: string;
  joined_date: string;
  password_last_changed?: string;
}

// คำนวณว่าครบ 90 วันแล้วหรือยัง
const getPasswordStatus = (passwordChangedAt?: string) => {
  if (!passwordChangedAt) {
    return { daysLeft: 0, isExpired: true, label: 'ไม่ทราบวันที่เปลี่ยนล่าสุด', color: 'red' };
  }
  const changed = new Date(passwordChangedAt);
  const now = new Date();
  const diffMs = now.getTime() - changed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysLeft = 90 - diffDays;

  if (daysLeft <= 0) {
    return { daysLeft: 0, isExpired: true, label: 'รหัสผ่านหมดอายุแล้ว', color: 'red' };
  } else if (daysLeft <= 14) {
    return { daysLeft, isExpired: false, label: `เหลืออีก ${daysLeft} วัน`, color: 'yellow' };
  } else {
    return { daysLeft, isExpired: false, label: `เหลืออีก ${daysLeft} วัน`, color: 'green' };
  }
};

export default function ProfilePage() {
  const { setPageInfo } = useOutletContext<any>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Password Change State ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    setPageInfo({ 
      title: 'แก้ไขข้อมูลส่วนตัว', 
      subtitle: 'Employee Profile' 
    });
  }, [setPageInfo]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const authUser = getCurrentUser();
        if (!authUser) {
          navigate('/');
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('*, branches(name_th), departments(name_th)')
          .eq('id', authUser.id)
          .single();

        if (error) throw error;
        setUser(data);
        setEditedUser(data);
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfile();
  }, [navigate]);

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => { setIsEditing(false); setEditedUser(user); };
  const getInitials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  const handleSave = async () => {
    if (!editedUser) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: editedUser.nickname,
          phone: editedUser.phone,
          internal_phone: editedUser.internal_phone,
          avatar_url: editedUser.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editedUser.id);
      if (error) throw error;
      setUser(editedUser);
      setIsEditing(false);
      toast.success('บันทึกข้อมูลสำเร็จ');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleInputChange = (field: keyof UserData, value: string) => {
    setEditedUser((prev) => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleInputChange('avatar_url', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- Password Requirements Checker ---
  const getPasswordRequirements = () => [
    { label: 'อย่างน้อย 8 ตัวอักษร', met: newPassword.length >= 8 },
    { label: 'มีตัวพิมพ์ใหญ่ (A-Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'มีตัวพิมพ์เล็ก (a-z)', met: /[a-z]/.test(newPassword) },
    { label: 'มีตัวเลข (0-9)', met: /[0-9]/.test(newPassword) },
    { label: 'รหัสผ่านใหม่ตรงกัน', met: newPassword === confirmPassword && newPassword !== '' },
  ];

  const handleChangePassword = async () => {
    const allMet = getPasswordRequirements().every(r => r.met);
    if (!allMet) return toast.error('กรุณาตั้งรหัสผ่านให้ถูกต้องตามเงื่อนไขทุกข้อ');

    setPasswordLoading(true);
    try {
      // 1. Re-authenticate โดยใช้ current password (sign in again)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
        setPasswordLoading(false);
        return;
      }

      // 2. Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      // 3. อัปเดต password_last_changed ใน profiles table
      await supabase
        .from('profiles')
        .update({ password_last_changed: new Date().toISOString() })
        .eq('id', user!.id);

      // 4. อัปเดต local state
      setUser(prev => prev ? { ...prev, password_last_changed: new Date().toISOString() } : prev);

      toast.success('เปลี่ยนรหัสผ่านสำเร็จแล้ว!');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#001489] border-t-transparent"></div>
    </div>
  );

  const pwStatus = getPasswordStatus(user.password_last_changed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto py-10 px-4">
        <Card className="p-6">
          {/* Avatar Section */}
          <div className="flex items-center bg-[#001489] text-white justify-between rounded-md py-4 px-6 gap-6 mb-8 pb-6 border-b">
            <div className="relative">
              <Avatar className="size-24 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleAvatarClick}>
                <AvatarImage src={isEditing ? editedUser?.avatar_url : user.avatar_url} />
                <AvatarFallback className="text-2xl bg-gray-100 text-[#001489] font-bold">
                  {getInitials || 'G'}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 hover:opacity-100 transition-opacity" onClick={handleAvatarClick}>
                  <Camera className="size-8 text-white" />
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">{user.first_name} {user.last_name}</h2>
              <p className="text-gray-300">{user.job_level}</p>
              <p className="text-sm text-gray-400 mt-1">รหัสพนักงาน: {user.employee_id}</p>
            </div>
            {!isEditing && (
              <Button onClick={handleEdit}><Pencil className="size-5" />แก้ไขข้อมูล</Button>
            )}
          </div>

          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg bg-[#001489] text-white py-2 px-4 rounded-md flex items-center gap-2 font-semibold mb-4">
                <UserIcon className="size-5" />ข้อมูลส่วนตัว
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">ชื่อ</Label>
                  <Input id="first_name" value={user.first_name} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="last_name">นามสกุล</Label>
                  <Input id="last_name" value={user.last_name} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="nickname">ชื่อเล่น</Label>
                  <Input id="nickname" value={isEditing ? editedUser?.nickname : user.nickname} onChange={(e) => handleInputChange('nickname', e.target.value)} disabled={!isEditing} placeholder="กรอกชื่อเล่น" />
                </div>
                <div>
                  <Label htmlFor="employee_id">รหัสพนักงาน</Label>
                  <Input id="employee_id" value={user.employee_id} disabled className="bg-gray-50" />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg bg-[#001489] text-white py-2 px-4 rounded-md flex items-center gap-2 font-semibold mb-4">
                <Phone className="size-5" />ข้อมูลติดต่อ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2"><Mail className="size-4" />อีเมล</Label>
                  <Input id="email" type="email" value={user.email} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                  <Input id="phone" value={isEditing ? editedUser?.phone : user.phone} onChange={(e) => handleInputChange('phone', e.target.value)} disabled={!isEditing} placeholder="0812345678" />
                </div>
                <div>
                  <Label htmlFor="internal_phone">เบอร์ภายใน</Label>
                  <Input id="internal_phone" value={isEditing ? editedUser?.internal_phone : user.internal_phone} onChange={(e) => handleInputChange('internal_phone', e.target.value)} disabled={!isEditing} placeholder="1234" />
                </div>
              </div>
            </div>

            {/* Organization Information */}
            <div>
              <h3 className="text-lg bg-[#001489] text-white py-2 px-4 rounded-md flex items-center gap-2 font-semibold mb-4">
                <Building2 className="size-5" />ข้อมูลองค์กร
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="branch_id">สาขา</Label>
                  <Input id="branch_id" value={`สาขา ${user.branches?.name_th}`} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="dept_id">แผนก</Label>
                  <Input id="dept_id" value={user.departments?.name_th} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="job_level" className="flex items-center gap-2"><Briefcase className="size-4" />ตำแหน่ง</Label>
                  <Input id="job_level" value={user.job_level} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="joined_date" className="flex items-center gap-2"><Calendar className="size-4" />วันที่เริ่มงาน</Label>
                  <Input id="joined_date" value={new Date(user.joined_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} disabled className="bg-gray-50" />
                </div>
              </div>
            </div>

            {/* Avatar URL */}
            <div>
              <h3 className="text-lg bg-[#001489] text-white py-2 px-4 rounded-md flex items-center gap-2 font-semibold mb-4">
                <ImageIcon className="size-5" />รูปโปรไฟล์
              </h3>
              <div>
                <Label htmlFor="avatar_url">URL รูปภาพ</Label>
                <Input id="avatar_url" value={isEditing ? editedUser?.avatar_url : user.avatar_url} onChange={(e) => handleInputChange('avatar_url', e.target.value)} disabled={!isEditing} placeholder="https://example.com/avatar.jpg" />
                <p className="text-sm text-gray-500 mt-1">ใส่ URL ของรูปโปรไฟล์ที่ต้องการใช้ หรือคลิกที่รูปโปรไฟล์ด้านบนเพื่ออัพโหลดไฟล์</p>
              </div>
            </div>

            {/* ==================== PASSWORD SECURITY SECTION ==================== */}
            <div>
              <h3 className="text-lg bg-[#001489] text-white py-2 px-4 rounded-md flex items-center gap-2 font-semibold mb-4">
                <KeyRound className="size-5" />ความปลอดภัยของรหัสผ่าน
              </h3>

              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border-2 ${
                pwStatus.color === 'red'
                  ? 'bg-red-50 border-red-200'
                  : pwStatus.color === 'yellow'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-4">
                  {pwStatus.color === 'green' ? (
                    <ShieldCheck className="size-10 text-green-600 flex-shrink-0" />
                  ) : (
                    <ShieldAlert className={`size-10 flex-shrink-0 ${pwStatus.color === 'red' ? 'text-red-600' : 'text-yellow-600'}`} />
                  )}
                  <div>
                    <p className={`font-semibold text-base ${pwStatus.color === 'red' ? 'text-red-800' : pwStatus.color === 'yellow' ? 'text-yellow-800' : 'text-green-800'}`}>
                      {pwStatus.isExpired ? 'รหัสผ่านหมดอายุแล้ว กรุณาเปลี่ยนทันที' : `รหัสผ่านยังปลอดภัย (${pwStatus.label})`}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {user.password_last_changed
                        ? `เปลี่ยนล่าสุดเมื่อ: ${new Date(user.password_last_changed).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`
                        : 'ยังไม่เคยเปลี่ยนรหัสผ่าน'}
                      {' · '}นโยบาย: ต้องเปลี่ยนทุก 90 วัน
                    </p>

                    {/* Progress bar */}
                    {!pwStatus.isExpired && (
                      <div className="mt-2 w-full max-w-[240px] bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${pwStatus.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, (pwStatus.daysLeft / 90) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => setShowPasswordModal(true)}
                  className={`flex-shrink-0 font-semibold shadow ${
                    pwStatus.isExpired
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-[#001489] hover:bg-[#001a70] text-white'
                  }`}
                >
                  <KeyRound className="size-4 mr-2" />
                  เปลี่ยนรหัสผ่าน
                </Button>
              </div>
            </div>
            {/* ==================== END PASSWORD SECTION ==================== */}
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-8 pt-6 border-t justify-end">
              <Button variant="outline" onClick={handleCancel}>ยกเลิก</Button>
              <Button onClick={handleSave}>บันทึกการเปลี่ยนแปลง</Button>
            </div>
          )}
        </Card>

        <Card className="mt-4 p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>หมายเหตุ:</strong> ข้อมูลบางส่วน เช่น ชื่อ-นามสกุล อีเมล และข้อมูลองค์กร จะต้องติดต่อ admin เพื่อทำการเปลี่ยนแปลง
          </p>
        </Card>
      </div>

      {/* ==================== PASSWORD CHANGE MODAL ==================== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-[#CB333B]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-[#001489] p-2 rounded-lg">
                  <KeyRound className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">เปลี่ยนรหัสผ่าน</h2>
                  <p className="text-xs text-gray-500">กรุณากรอกข้อมูลให้ครบถ้วน</p>
                </div>
              </div>
              <button onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="size-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">รหัสผ่านปัจจุบัน</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10 h-11"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">รหัสผ่านใหม่</Label>
                <div className="relative">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="กรอกรหัสผ่านใหม่"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 h-11"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">ยืนยันรหัสผ่านใหม่</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPw ? 'text' : 'password'}
                    placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 h-11"
                  />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              {newPassword.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">เงื่อนไขรหัสผ่าน</p>
                  {getPasswordRequirements().map((req, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${req.met ? 'text-green-600' : 'text-slate-400'}`}>
                      {req.met
                        ? <CheckCircle2 size={15} className="flex-shrink-0" />
                        : <AlertCircle size={15} className="flex-shrink-0" />
                      }
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                disabled={passwordLoading}
              >
                ยกเลิก
              </Button>
              <Button
                className="flex-1 bg-[#CB333B] hover:bg-[#a82930] text-white font-semibold"
                onClick={handleChangePassword}
                disabled={passwordLoading || !currentPassword || !getPasswordRequirements().every(r => r.met)}
              >
                {passwordLoading ? (
                  <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />กำลังบันทึก...</span>
                ) : 'บันทึกรหัสผ่านใหม่'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}