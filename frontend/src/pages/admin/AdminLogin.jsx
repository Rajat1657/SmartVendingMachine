import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Store, AlertCircle } from 'lucide-react';

export const AdminLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@vending.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e0e5ec] text-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md neu-card p-6 sm:p-8">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 neu-btn rounded-2xl flex items-center justify-center mb-4 text-blue-600 text-2xl font-black">
            🌾
          </div>
          <h1 className="text-2xl font-black text-slate-800">Shopkeeper Portal</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Remote Vending Machine Control & Analytics
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-extrabold neu-badge">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs font-bold text-slate-700">
          <div>
            <label className="block text-slate-500 uppercase tracking-wider mb-2">
              Owner Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 neu-input text-slate-800 placeholder-slate-400 focus:outline-none text-sm font-semibold"
                placeholder="admin@vending.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 neu-input text-slate-800 placeholder-slate-400 focus:outline-none text-sm font-semibold"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black rounded-2xl shadow-lg transition duration-150 flex items-center justify-center text-base"
          >
            {loading ? 'Authenticating...' : 'Sign In to Shopkeeper Portal'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 font-semibold">
          Demo Credentials: <br />
          <span className="font-mono text-slate-700 font-bold">admin@vending.com</span> / <span className="font-mono text-slate-700 font-bold">admin123</span>
        </div>
      </div>
    </div>
  );
};
