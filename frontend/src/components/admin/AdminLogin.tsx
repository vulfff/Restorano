import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import * as authApi from '../../api/authApi';
import { useTranslation } from 'react-i18next';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await authApi.login(username, password);
      login(token, username);
      navigate('/admin');
    } catch (err: unknown) {
      // Axios 401 means wrong credentials
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 401) {
        setError(t('login.errorInvalid'));
      } else {
        setError(t('login.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-[#e8e3db] shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="font-display text-4xl font-semibold text-[#1c1917]">Restorano</div>
          <div className="text-[#78716c] text-sm mt-1">{t('login.subtitle')}</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-[#78716c] block mb-1">{t('login.username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              className="w-full border border-[#e8e3db] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#78716c] block mb-1">{t('login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#e8e3db] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="py-3 bg-[#0f4c3a] text-white rounded-lg font-semibold hover:bg-[#1a6b52] transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
