import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // TODO: POST /api/auth/login
    // Mock: accept any non-empty credentials
    await new Promise((r) => setTimeout(r, 600));
    if (username && password) {
      login('mock-jwt-token', username);
      navigate('/admin');
    } else {
      setError('Enter username and password.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-[#e8e3db] shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="font-display text-4xl font-semibold text-[#1c1917]">Restorano</div>
          <div className="text-[#78716c] text-sm mt-1">Admin Login</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-[#78716c] block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              className="w-full border border-[#e8e3db] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#78716c] block mb-1">Password</label>
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
