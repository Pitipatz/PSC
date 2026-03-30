import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CheckPricePage from './pages/CheckPricePage';
import HistoryPage from './pages/HistoryPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import ProfilePage from './pages/ProfilePage';
import { AdminRoute } from './ProtectedRoute'; // Import ตัวที่เราสร้าง
// import MyCoolErrorPage from './pages/MyCoolErrorPage'; // Import เข้ามา!

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
    // errorElement: <MyCoolErrorPage />, // ใช้ได้แล้ว!
  },
  {
    path: '/pricecheck',
    element: <CheckPricePage />,
  },
  {
    path: '/history',
    element: <HistoryPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
  {
    path: '/usersmanagement',
    element: (
      <AdminRoute>
        <UserManagementPage />
      </AdminRoute>
    ),
  },
  {
    path: '/unauthorized',
    element: <div className="p-10 text-center">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>,
  },
  {
    path: '*',
    element: <Navigate to="/" />, // ถ้าพิมพ์มั่วให้กลับไปหน้าแรก
  },
  /*
  {
    path: '*',
    element: <MyCoolErrorPage />, // ใช้ตัวเดียวกันดักหน้า 404 ด้วยก็ได้ครับ
  },
  */
]);