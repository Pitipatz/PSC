import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Briefcase, Pencil, Camera, Image as ImageIcon, Mail, Phone, Building2, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { Header } from '../components/Header';
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
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  // 1. ดึงข้อมูล User จาก Supabase เมื่อโหลดหน้า
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const authUser = getCurrentUser();
        if (!authUser) {
          navigate('/');
          return;
        }

        // ดึงข้อมูลจากตาราง profiles พร้อมชื่อสาขา
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser(user);
  };

  const getInitials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  // 2. บันทึกข้อมูลลง Database จริง
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

      setUser(editedUser); // อัปเดต state หลักหลังจากบันทึกสำเร็จ
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
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 3. ฟังก์ชันจำลองการอัปโหลด (แนะนำให้ใช้ Supabase Storage ในอนาคต)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleInputChange('avatar_url', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#001489] border-t-transparent"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header 
      user={{
        name: `${user.first_name} ${user.last_name}`,
        // เปลี่ยนจาก branch_name เป็น name_th
        branch: user.branches?.name_th, 
        avatar_url: user.avatar_url
      }}
      title='แก้ไขข้อมูลส่วนตัว'
      subtitle='Employee Profile' />
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto py-10 px-4">
        <Card className="p-6">
          {/* Avatar Section */}
          <div className="flex items-center bg-[#001489] text-white justify-between rounded-md py-4 px-6 gap-6 mb-8 pb-6 border-b">
            <div className="relative">
              <Avatar 
                className="size-24 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleAvatarClick}
              >
                <AvatarImage src={isEditing ? editedUser?.avatar_url : user.avatar_url} />
                <AvatarFallback className="text-2xl bg-gray-100 text-[#001489] font-bold">
                  {getInitials || 'G'}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                  onClick={handleAvatarClick}
                >
                  <Camera className="size-8 text-white" />
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-gray-600">{user.job_level}</p>
              <p className="text-sm text-gray-500 mt-1">รหัสพนักงาน: {user.employee_id}</p>
            </div>
            {!isEditing && (
              <Button onClick={handleEdit}><Pencil className="size-5" />แก้ไขข้อมูล</Button>
            )}
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg bg-[#001489] text-white py-2 px-4 rounded-md flex items-center gap-ont-semibold mb-4 flex items-center gap-2">
                <UserIcon className="size-5" />
                ข้อมูลส่วนตัว
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name - Read Only */}
                <div>
                  <Label htmlFor="first_name">ชื่อ</Label>
                  <Input
                    id="first_name"
                    value={user.first_name}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                {/* Last Name - Read Only */}
                <div>
                  <Label htmlFor="last_name">นามสกุล</Label>
                  <Input
                    id="last_name"
                    value={user.last_name}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                {/* Nickname - Editable */}
                <div>
                  <Label htmlFor="nickname">ชื่อเล่น</Label>
                  <Input
                    id="nickname"
                    value={isEditing ? editedUser?.nickname : user.nickname}
                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                    disabled={!isEditing}
                    placeholder="กรอกชื่อเล่น"
                  />
                </div>

                {/* Employee ID - Read Only */}
                <div>
                  <Label htmlFor="employee_id">รหัสพนักงาน</Label>
                  <Input
                    id="employee_id"
                    value={user.employee_id}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg bg-[#001489] text-white py-2 px-4 rounded-md flex items-center gap-ont-semibold mb-4 flex items-center gap-2">
                <Phone className="size-5" />
                ข้อมูลติดต่อ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email - Read Only */}
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="size-4" />
                    อีเมล
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                {/* Phone - Editable */}
                <div>
                  <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                  <Input
                    id="phone"
                    value={isEditing ? editedUser?.phone : user.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="0812345678"
                  />
                </div>

                {/* Internal Phone - Editable */}
                <div>
                  <Label htmlFor="internal_phone">เบอร์ภายใน</Label>
                  <Input
                    id="internal_phone"
                    value={isEditing ? editedUser?.internal_phone : user.internal_phone}
                    onChange={(e) => handleInputChange('internal_phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="1234"
                  />
                </div>
              </div>
            </div>

            {/* Organization Information */}
            <div>
              <h3 className="text-lg bg-[#001489] text-white py-2 px-4 rounded-md flex items-center gap-ont-semibold mb-4 flex items-center gap-2">
                <Building2 className="size-5" />
                ข้อมูลองค์กร
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch - Read Only */}
                <div>
                  <Label htmlFor="branch_id">สาขา</Label>
                  <Input
                    id="branch_id"
                    value={`สาขา ${user.branches?.name_th}`}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                {/* Department - Read Only */}
                <div>
                  <Label htmlFor="dept_id">แผนก</Label>
                  <Input
                    id="dept_id"
                    value={user.departments?.name_th}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                {/* Job Level - Read Only */}
                <div>
                  <Label htmlFor="job_level" className="flex items-center gap-2">
                    <Briefcase className="size-4" />
                    ตำแหน่ง
                  </Label>
                  <Input
                    id="job_level"
                    value={user.job_level}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                {/* Joined Date - Read Only */}
                <div>
                  <Label htmlFor="joined_date" className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    วันที่เริ่มงาน
                  </Label>
                  <Input
                    id="joined_date"
                    value={new Date(user.joined_date).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Avatar URL - Editable */}
            <div>
              <h3 className="text-lg bg-[#001489] text-white py-2 px-4 rounded-md flex items-center gap-ont-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="size-5" />
                รูปโปรไฟล์
              </h3>
              <div>
                <Label htmlFor="avatar_url">URL รูปภาพ</Label>
                <Input
                  id="avatar_url"
                  value={isEditing ? editedUser?.avatar_url : user.avatar_url}
                  onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  ใส่ URL ของรูปโปรไฟล์ที่ต้องการใช้ หรือคลิกที่รูปโปรไฟล์ด้านบนเพื่ออัพโหลดไฟล์
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 mt-8 pt-6 border-t justify-end">
              <Button variant="outline" onClick={handleCancel}>
                ยกเลิก
              </Button>
              <Button onClick={handleSave}>
                บันทึกการเปลี่ยนแปลง
              </Button>
            </div>
          )}
        </Card>

        {/* Info Note */}
        <Card className="mt-4 p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>หมายเหตุ:</strong> ข้อมูลบางส่วน เช่น ชื่อ-นามสกุล อีเมล และข้อมูลองค์กร 
            จะต้องติดต่อฝ่าย HR เพื่อทำการเปลี่ยนแปลง
          </p>
        </Card>
      </div>
    </div>
  );
}