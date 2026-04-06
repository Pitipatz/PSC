import { useState, useEffect } from 'react';
import { supabase } from '../../utils/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Search, UserPlus, Edit2, ShieldCheck } from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    // ดึงข้อมูลพนักงานพร้อม Role และข้อมูลสาขา/แผนก
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, employee_id, first_name, last_name, email,
        branches (name_th as branch_name),
        departments (name_th as dept_name),
        user_roles (roles (role_name))
      `);

    if (!error) setUsers(data);
    setLoading(false);
  };

  const filteredUsers = users.filter(u => 
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.employee_id?.includes(searchTerm)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#001489]">จัดการพนักงาน</h1>
          <p className="text-gray-500">จัดการข้อมูลสิทธิ์ สังกัด และสถานะบัญชีพนักงาน</p>
        </div>
        <Button className="bg-[#001489] hover:bg-[#000f66]">
          <UserPlus className="mr-2 h-4 w-4" /> เพิ่มพนักงานใหม่
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="ค้นหาชื่อพนักงาน หรือ รหัสพนักงาน..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[120px]">รหัสพนักงาน</TableHead>
              <TableHead>ชื่อ-นามสกุล</TableHead>
              <TableHead>สาขา / แผนก</TableHead>
              <TableHead>ตำแหน่ง (Role)</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">กำลังโหลดข้อมูล...</TableCell></TableRow>
            ) : filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.employee_id || '-'}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{user.branches?.branch_name || 'ไม่ระบุ'}</p>
                    <p className="text-xs text-gray-500">{user.departments?.dept_name || '-'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {user.user_roles?.map((ur: any) => (
                    <Badge key={ur.roles.role_name} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <ShieldCheck className="w-3 h-3 mr-1" /> {ur.roles.role_name}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#001489]">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}