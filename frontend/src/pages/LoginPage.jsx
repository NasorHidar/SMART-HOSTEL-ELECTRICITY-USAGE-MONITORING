/**
 * src/pages/LoginPage.jsx
 * Clean, premium login screen — esp_id only authentication.
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [espId, setEspId]   = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!espId.trim()) return;
    await login(espId.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background blobs */}
      <div
        className="absolute top-[-15%] left-[-10%] h-[500px] w-[500px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #25a265 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)' }}
      />

      {/* Login Card */}
      <div className="glass-card w-full max-w-md p-10 flex flex-col gap-8 animate-fade-in relative">
        {/* Logo / Icon */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl"
            style={{
              background: 'linear-gradient(135deg, rgba(37,162,101,0.3) 0%, rgba(18,130,81,0.2) 100%)',
              border: '1px solid rgba(37,162,101,0.4)',
              boxShadow: '0 0 30px rgba(37,162,101,0.2)',
            }}
          >
            ⚡
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-100">Smart Meter</h1>
            <p className="text-slate-400 text-sm mt-1">Hostel Electricity Monitor</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="esp-id-input" className="text-sm font-medium text-slate-300">
              Device ID
            </label>
            <input
              id="esp-id-input"
              type="text"
              placeholder="e.g. ESP-2049"
              value={espId}
              onChange={(e) => setEspId(e.target.value.toUpperCase())}
              className="input-field font-mono tracking-widest text-lg text-center"
              autoComplete="off"
              autoFocus
              required
            />
            <p className="text-slate-500 text-xs text-center">
              Enter the ID printed on your meter device
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            disabled={loading || !espId.trim()}
            className="btn-brand mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Signing in…
              </>
            ) : (
              'View My Dashboard →'
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-500">
          Don't have an account? Contact your hostel admin to register your device.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
