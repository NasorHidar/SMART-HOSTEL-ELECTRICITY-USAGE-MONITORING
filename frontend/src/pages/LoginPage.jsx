/**
 * src/pages/LoginPage.jsx
 * Clean, premium login screen — esp_id + password authentication.
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const LoginPage = () => {
  const [espId, setEspId]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const { login, loading, error } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanId = espId.trim();
    if (!cleanId || !password) return;
    console.log(`[LoginPage] Submitting login request for: "${cleanId}"`);
    const result = await login(cleanId, password);
    console.log(`[LoginPage] Login result received:`, result);
  };

  const displayError = error === 'Login failed. Please try again.' ? t('loginFailed') : error;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Language Toggle in Top-Right */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleLanguage}
          className="glass-card px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white
                     hover:border-slate-500 rounded-xl transition-all duration-150 flex items-center gap-2 border border-slate-300 dark:border-slate-600/50"
          style={{ boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)' }}
        >
          <span>🌐</span>
          <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
        </button>
      </div>

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
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('smartMeter')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('hostelElectricityMonitor')}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Device ID Field */}
          <div className="flex flex-col gap-2">
            <label htmlFor="esp-id-input" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('deviceId')}
            </label>
            <input
              id="esp-id-input"
              type="text"
              placeholder={t('enterIdPlaceholder')}
              value={espId}
              onChange={(e) => setEspId(e.target.value.toUpperCase())}
              className="input-field font-mono tracking-widest text-lg text-center"
              autoComplete="off"
              autoFocus
              required
            />
            <p className="text-slate-500 text-xs text-center">
              {t('enterIdHelp')}
            </p>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-2">
            <label htmlFor="password-input" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('password')}
            </label>
            <div className="relative">
              <input
                id="password-input"
                type={showPw ? 'text' : 'password'}
                placeholder={t('enterPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field text-center w-full pr-12"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-sm"
                tabIndex={-1}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {displayError}
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            disabled={loading || !espId.trim() || !password}
            className="btn-brand mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {t('signingIn')}
              </>
            ) : (
              t('viewDashboardBtn')
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-500">
          {t('noAccountHelp')}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
