import { useEffect, useState } from 'react';
import { supabase } from '../utils/auth';
import { Card, CardContent } from '../components/ui/card'; 
import { Truck } from 'lucide-react';
import { useOutletContext } from 'react-router-dom'; 


export default function HistoryPage() {
  const { setPageInfo } = useOutletContext<any>();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);  

  useEffect(() => {
    // ✅ สั่งเปลี่ยน Title ของ Header จากหน้านี้ได้เลย
    setPageInfo({ 
      title: 'ประวัติการตรวจสอบราคา', 
      subtitle: 'Check Price History' 
    });
  }, [setPageInfo]);

  // ดึงข้อมูลจาก Supabase
  useEffect(() => {
    async function fetchLogs() {
      try {
        const { data, error } = await supabase
          .from('check_price_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <main className="max-w-7xl mx-auto px-8 py-10">
        {loading ? (
          <div className="text-center py-20">กำลังโหลดข้อมูล...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">ไม่พบประวัติการตรวจสอบราคา</div>
        ) : (
          <div className="grid gap-6">
            {logs.map((log) => (
              <Card key={log.id} className="overflow-hidden border-l-4 border-l-[#001489] bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[#001489] font-bold text-lg">
                        <Truck className="h-5 w-5" />
                        {log.brand} - {log.model_found}
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600">
                        <p><strong>ลักษณะ:</strong> {log.vehicle_type}</p>
                        <p><strong>แรงม้า:</strong> {log.horsepower} HP</p>
                        <p><strong>ปี:</strong> {log.year}</p>
                        <p><strong>แชซซี:</strong> {log.chassis_number}</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-xl flex flex-col justify-center items-end min-w-[200px]">
                      <p className="text-xs text-gray-500 uppercase">ราคากลางที่คำนวณได้</p>
                      <p className="text-2xl font-black text-[#CB333B]">
                        {Number(log.central_price).toLocaleString()} บาท
                      </p>
                      <p className="text-[10px] text-gray-400 mt-2">
                        {new Date(log.created_at).toLocaleString('th-TH')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}