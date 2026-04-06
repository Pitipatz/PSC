import { useNavigate } from 'react-router-dom';
import { NavigationMenu } from './NavigationMenu';
import { logoutUser } from '../utils/auth';

interface HeaderProps {
    user: {
    name?: string;
    branch?: string;
    avatar_url?: string;
  } | null;
  title?: string;
  subtitle?: string;
}

export function Header({ user, title, subtitle }: HeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-md border-b-4 border-[#CB333B] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto py-4 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Navigation Menu Wrapper */}
          <div className="bg-[#001489] rounded-lg p-1">
            <NavigationMenu />
          </div>
          
          <img src="/Paisan_Logo.png" alt="Logo" className="h-12 hidden sm:block" />
          
          <div className="hidden md:block border-l pl-6">
            <h1 className="text-xl font-bold text-[#001489]">{title}</h1>
            <p className="text-gray-500 text-sm">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-gray-50 border px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
            <div className="w-8 h-8 bg-[#001489] text-white rounded-full flex items-center justify-center text-sm font-bold overflow-hidden border border-gray-200">
              {user?.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'G'}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-gray-800">
                {user?.name ? user.name.split(' ')[0] : 'Guest'}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-[#001489] font-semibold">
                {user?.branch || 'รอยืนยันสาขา'}
              </span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="text-red-600 p-2 border rounded-full hover:bg-red-50 transition-colors"
            title="ออกจากระบบ"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}