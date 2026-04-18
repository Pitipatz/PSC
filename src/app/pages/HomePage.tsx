import { Card, CardContent } from '../components/ui/card';
import { LayoutDashboard } from 'lucide-react';

export default function HomePage() {
  // ไม่ต้องเรียก <Header /> ซ้ำที่นี่แล้ว เพราะ MainLayout จะจัดการให้
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">หน้าแรก</h1>
        <p className="text-slate-500 mt-2">Dashboard Overview</p>
      </div>

      <Card className="border-dashed border-2 bg-white/50">
        <CardContent className="flex flex-col items-center justify-center py-20 text-gray-400">
          <LayoutDashboard size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">ยินดีต้อนรับเข้าสู่ระบบ Paisan Capital</p>
          <p className="text-sm">กรุณาเลือกเมนูจากแถบด้านซ้ายเพื่อเริ่มใช้งาน</p>
        </CardContent>
      </Card>
    </div>
  );
}