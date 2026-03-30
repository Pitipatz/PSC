import { Navigate } from 'react-router-dom';
import { getCurrentUser } from './utils/auth';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();

  // 1. ถ้าไม่ได้ Login ให้ดีดไปหน้า Login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. ถ้า Login แล้วแต่ไม่ใช่ Admin (เช็กจากสิทธิ์ที่มี)
  if (!user.permissions?.includes('user.manage')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}