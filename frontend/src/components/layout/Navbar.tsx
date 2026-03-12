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
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <Link to="/" className="text-xl font-bold text-slate-800 hover:text-blue-600 transition-colors">
        Restorano
      </Link>
      <div className="flex items-center gap-4">
        {isAdmin ? (
          <>
            <Link to="/admin" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
              Layout Builder
            </Link>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-sm text-slate-600">{username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
            Admin Login
          </Link>
        )}
      </div>
    </nav>
  );
}
