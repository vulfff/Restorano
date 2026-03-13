import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function Navbar() {
  const { isAdmin, username, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-[#e8e3db] px-6 py-3.5 flex items-center justify-between">
      <Link to="/" className="font-display text-2xl font-semibold tracking-wide text-[#1c1917] hover:text-[#0f4c3a] transition-colors">
        Restorano
      </Link>
      <div className="flex items-center gap-5">
        {isAdmin ? (
          <>
            <Link to="/admin" className="text-sm text-[#78716c] hover:text-[#0f4c3a] transition-colors">
              Layout Builder
            </Link>
            <span className="text-xs text-[#d6d0c8]">|</span>
            <span className="text-sm text-[#78716c]">{username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-[#b91c1c] hover:text-[#991b1b] transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="text-sm text-[#78716c] hover:text-[#0f4c3a] transition-colors">
            Admin Login
          </Link>
        )}
      </div>
    </nav>
  );
}
