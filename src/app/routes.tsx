import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CheckPricePage from './pages/CheckPricePage';
import HistoryPage from './pages/HistoryPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import ProfilePage from './pages/ProfilePage';
import { AdminRoute } from './ProtectedRoute'; // Import ตัวที่เราสร้าง
import ResetPasswordPage from './pages/ResetPasswordPage';
import { FeedbackForm } from './components/FeedbackForm';
// import MyCoolErrorPage from './pages/MyCoolErrorPage'; // Import เข้ามา!

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: '/HomePage',
        element: <HomePage />,
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
        path: '/feedback', // 👈 เพิ่ม Route สำหรับหน้า Feedbacks ที่เราเพิ่งทำ
        element: <FeedbackForm />,
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
        element: <Navigate to="/" />, 
      },
    ]
  },
]);