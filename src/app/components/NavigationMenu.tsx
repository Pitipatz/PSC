import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { Menu, History, LogOut, User, Search } from 'lucide-react';
import { getCurrentUser, logoutUser } from '../utils/auth';
import { usePermissions } from '../hooks/usePermissions';

export function NavigationMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();

  const { hasPermission, loading } = usePermissions();

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
      label: 'ระบบตรวจสอบราคากลาง',
      path: '/pricecheck',
      description: 'ตรวจสอบราคากลางรถบรรทุก',
      permission: 'price.check' // ใช้ชื่อให้ตรงกับในตาราง permissions ของคุณ
    },
    {
      icon: History,
      label: 'ประวัติการตรวจสอบราคากลาง',
      path: '/history',
      description: 'ดูประวัติการตรวจสอบราคา',
      permission: 'report.view'
    },
    {
      icon: User,
      label: 'จัดการพนักงาน',
      path: '/admin/users',
      description: 'จัดการสิทธิ์และข้อมูลพนักงาน',
      permission: 'user.manage'
    }
  ];

  // 2. กรองเมนูที่ User ไม่มีสิทธิ์ออกไปก่อน
  const visibleMenuItems = menuItems.filter(item => {
    // ถ้าเมนูไหนไม่ได้ระบุ permission ไว้ ให้แสดงได้เลย
    if (!item.permission) return true;
    // ถ้ามีระบุไว้ ให้ไปเช็กผ่านฟังก์ชัน hasPermission
    return hasPermission(item.permission);
  });

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
        <button 
          onClick={() => handleNavigate('/profile')} // หรือ path หน้า profile ของคุณ
          className="w-full bg-white/10 rounded-lg p-4 mb-6 border border-white/20 flex items-center justify-between group hover:bg-white/20 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">{user?.name || 'ผู้ใช้งาน'}</p>                <p className="text-xs text-white/70">{user?.email || ''}</p>
            </div>
          </div>
          {/* เพิ่มไอคอนลูกศรเล็กๆ เพื่อบอกว่ากดเข้าไปได้ */}
          <div className="text-white/40 group-hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </div>
        </button>

        {/* Navigation Items */}
        <nav className="space-y-2">
          {/* 🟢 นำ loading มาใช้งานตรงนี้ */}
          {loading ? (
            <div className="p-4 text-sm text-white/50">กำลังตรวจสอบสิทธิ์...</div>
          ) : (
            visibleMenuItems.map((item) => {
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
            })
          )}
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