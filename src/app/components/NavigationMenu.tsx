import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { Menu, History, LogOut, User, Search } from 'lucide-react';
import { getCurrentUser, logoutUser } from '../utils/auth';

export function NavigationMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();

  const handleLogout = () => {
    logoutUser();
    navigate('/');
    setOpen(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const menuItems = [
    {
      icon: Search,
      label: 'ตรวจสอบราคา',
      path: '/pricecheck',
      description: 'ตรวจสอบราคากลางรถบรรทุก',
      permission: 'report.view' // ทุกคนที่มีสิทธิ์ดูรายงานเข้าได้
    },
    {
      icon: History,
      label: 'ประวัติการค้นหา',
      path: '/history',
      description: 'ดูประวัติการตรวจสอบราคา',
      permission: 'report.view'
    },
    {
      icon: User, // ตัวอย่างเมนูใหม่
      label: 'จัดการพนักงาน',
      path: '/admin/users',
      description: 'จัดการสิทธิ์และข้อมูลพนักงาน',
      permission: 'user.manage' // เฉพาะ Admin เท่านั้น
    }
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-white/10 text-white"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 bg-gradient-to-b from-[#001489] to-[#001a70] text-white border-r-0">
        <SheetHeader className="border-b border-white/20 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <img src="/Paisan_Logo-White-Border.png" alt="Paisan Capital" className="h-12 w-auto" />
              <SheetTitle className="text-white text-xl">Paisan Capital</SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            เมนูนำทางระบบตรวจสอบราคากลางรถบรรทุก
          </SheetDescription>
        </SheetHeader>

        {/* User Info */}
        <div className="bg-white/10 rounded-lg p-4 mb-6 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">{user?.name || 'ผู้ใช้งาน'}</p>
              <p className="text-xs text-white/70">{user?.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            // 🛡️ เพิ่มบรรทัดป้องกันตรงนี้ครับ
            // ถ้าไม่มี User หรือ User ไม่มี Permissions ให้ข้าม Item นี้ไปเลย (หรือ return null)
            if (!user || !user.permissions) {
              return null;
            }
            
            // 1. เช็กสิทธิ์: ถ้าเมนูไม่มีเงื่อนไข (null) หรือ user มีสิทธิ์ตรงกับที่ต้องการ
            // (สมมติว่า user object ของคุณมี array ชื่อ permissions เก็บอยู่)
            // แก้ไขในส่วน filter/map เมนู
            const hasPermission = !item.permission || (Array.isArray(user?.permissions) && user.permissions.includes(item.permission));
            
            // 2. ถ้าไม่มีสิทธิ์ ให้ข้ามการวาดเมนูนี้ไปเลย
            if (!hasPermission) return null;
            
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-start gap-4 p-4 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#CB333B] shadow-lg'
                    : 'hover:bg-white/10'
                }`}
              >
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-xs text-white/70 mt-1">{item.description}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-6 left-6 right-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 mr-2" />
            ออกจากระบบ
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}