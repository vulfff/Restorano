import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const { isAdmin, username, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

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
        {/* Language toggle */}
        <div className="flex items-center gap-1 text-xs text-[#78716c]">
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={i18n.language === 'en' ? 'font-semibold text-[#1c1917]' : 'hover:text-[#1c1917] transition-colors'}
          >
            EN
          </button>
          <span className="text-[#d6d0c8]">|</span>
          <button
            onClick={() => i18n.changeLanguage('et')}
            className={i18n.language === 'et' ? 'font-semibold text-[#1c1917]' : 'hover:text-[#1c1917] transition-colors'}
          >
            ET
          </button>
        </div>

        <span className="text-xs text-[#d6d0c8]">|</span>

        {isAdmin ? (
          <>
            <Link to="/admin" className="text-sm text-[#78716c] hover:text-[#0f4c3a] transition-colors">
              {t('nav.layoutBuilder')}
            </Link>
            <span className="text-xs text-[#d6d0c8]">|</span>
            <span className="text-sm text-[#78716c]">{username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-[#b91c1c] hover:text-[#991b1b] transition-colors"
            >
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <Link to="/login" className="text-sm text-[#78716c] hover:text-[#0f4c3a] transition-colors">
            {t('nav.adminLogin')}
          </Link>
        )}
      </div>
    </nav>
  );
}
