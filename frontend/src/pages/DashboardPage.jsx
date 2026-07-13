import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getDashboard } from '../api/api';
import MetricCard  from '../components/MetricCard';
import PowerChart  from '../components/PowerChart';
import AlertsPanel from '../components/AlertsPanel';
import CarbonWidget from '../components/CarbonWidget';
import VoiceAssistantWidget from '../components/VoiceAssistantWidget';
import UsagePredictionWidget from '../components/UsagePredictionWidget';
import { io } from 'socket.io-client';

// ─── Metric card definitions ──────────────────────────────────────────────────
const METRIC_DEFS = [
  {
    key:   'voltage',
    labelKey: 'voltage',
    unit:  'V',
    icon:  '🔌',
    color: 'text-sky-600 dark:text-sky-400',
    glow:  'rgba(56,189,248,0.2)',
  },
  {
    key:   'current',
    labelKey: 'current',
    unit:  'A',
    icon:  '⚡',
    color: 'text-brand-600 dark:text-brand-400',
    glow:  'rgba(37,162,101,0.2)',
  },
  {
    key:   'power',
    labelKey: 'power',
    unit:  'W',
    icon:  '💡',
    color: 'text-amber-600 dark:text-amber-400',
    glow:  'rgba(251,191,36,0.2)',
  },
  {
    key:   'dailyKWh',
    labelKey: 'todaysEnergy',
    unit:  'kWh',
    icon:  '📊',
    color: 'text-violet-600 dark:text-violet-400',
    glow:  'rgba(167,139,250,0.2)',
  },
];

const POLL_INTERVAL_MS = 5000;

const DashboardPage = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t, formatNumber, formatDate, calculateBill } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  // Use a ref to prevent StrictMode double-fetch issues
  const isFetching = useRef(false);

  // Synthesize alarm sound using Web Audio API
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, duration, startTime) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      playTone(880, 0.25, now);
      playTone(660, 0.25, now + 0.2);
      playTone(880, 0.25, now + 0.4);
    } catch (err) {
      console.error('Failed to play alert sound:', err);
    }
  };

  // Socket.io Real-time connection
  useEffect(() => {
    // Connect to backend server (port 5000)
    const socket = io('http://localhost:5000', {
      withCredentials: true
    });

    socket.emit('join_device', user.esp_id);

    socket.on('new_alert', (newAlert) => {
      console.log('[Socket.io] Real-time alert received:', newAlert);
      setData((prevData) => {
        if (!prevData) return prevData;
        const exists = prevData.alerts?.some((a) => a._id === newAlert._id);
        if (exists) return prevData;
        return {
          ...prevData,
          alerts: [newAlert, ...(prevData.alerts || [])]
        };
      });

      // Play alert sound if severity is critical
      if (newAlert.severity === 'critical') {
        playAlertSound();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user.esp_id]);

  const fetchDashboard = useCallback(async (silent = false) => {
    // Prevent concurrent fetches
    if (isFetching.current) return;
    isFetching.current = true;

    if (!silent) setLoading(true);
    try {
      const { data: res } = await getDashboard(user.esp_id);
      setData(res);
      setLastUpdate(new Date());
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user.esp_id]);

  // Initial load — runs once on mount
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Polling — set up a single interval
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // ── Computed values ──────────────────────────────────────────────────────────
  const latest    = data?.latest;
  const chartData = data?.chartData || [];
  const alerts    = data?.alerts    || [];
  const userInfo  = data?.user      || {};

  const metricsValues = {
    voltage:  latest?.voltage,
    current:  latest?.current,
    power:    latest?.power,
    dailyKWh: data?.dailyKWh,
  };

  const isLive =
    latest &&
    Date.now() - new Date(latest.timestamp).getTime() < 30000;

  const limitKWh     = userInfo.daily_limit_kwh || 5;
  const usagePercent = Math.min(100, ((data?.dailyKWh || 0) / limitKWh) * 100);
  const budgetColor  =
    usagePercent > 80 ? 'bg-red-500' :
    usagePercent > 50 ? 'bg-amber-400' :
    'bg-brand-500';

  // ── Billing Calculations ──────────────────────────────────────────────────
  const dailyBillDetails = calculateBill(data?.dailyKWh || 0);
  const cumulativeBillDetails = calculateBill(latest?.energy || 0);
  const demandCharge = 42.00; // 42 Tk per kW per month
  const estimatedTotalBill = cumulativeBillDetails.total + demandCharge;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <header className="border-b border-surface-border bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="font-bold text-slate-800 dark:text-slate-100 leading-tight whitespace-nowrap">{t('smartMeter')}</h1>
              <p className="text-slate-500 text-xs hidden sm:block truncate">{t('hostelElectricityMonitor')}</p>
            </div>
          </div>

          {/* Live indicator + Language Switch + User + Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-brand-400 animate-pulse-slow' : 'bg-slate-500'}`}
                style={isLive ? { boxShadow: '0 0 8px rgba(72,190,132,0.7)' } : {}}
              />
              <span className={`text-xs font-medium ${isLive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>
                {isLive ? t('live') : t('offline')}
              </span>
            </div>

            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600
                         hover:border-slate-500 rounded-lg px-2.5 py-2 transition-colors duration-150 flex items-center gap-1.5"
            >
              <span>🌐</span>
              <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600
                         hover:border-slate-500 rounded-lg px-2.5 py-2 transition-colors duration-150 flex items-center gap-1.5"
            >
              <span>{isDark ? '☀️' : '🌙'}</span>
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>

            <div className="hidden sm:flex flex-col items-end shrink-0">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{user.student_name}</span>
              <span className="text-xs text-slate-500 whitespace-nowrap">{t('room')} {formatNumber(user.room_number)} · {user.esp_id}</span>
            </div>

            <button
              id="carbon-dashboard-btn"
              onClick={() => onNavigate('carbon')}
              className="text-xs font-semibold text-white border border-emerald-500/50
                         bg-emerald-500/20 hover:bg-emerald-500/40
                         rounded-lg px-3 py-2 transition-all duration-150 flex items-center gap-1.5 shrink-0"
            >
              <span>🌿</span>
              <span className="hidden sm:inline whitespace-nowrap">{t('viewCarbonDashboard')}</span>
            </button>

            <button
              id="pay-bill-btn"
              onClick={() => onNavigate('payment')}
              className="text-xs font-semibold text-white border border-brand-500/50
                         bg-brand-500/20 hover:bg-brand-500/40
                         rounded-lg px-3 py-2 transition-all duration-150 flex items-center gap-1.5 shrink-0"
            >
              <span>💳</span>
              <span className="whitespace-nowrap">{t('payBill')}</span>
            </button>

            <button
              id="logout-btn"
              onClick={logout}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600
                         hover:border-slate-500 rounded-lg px-3 py-2 transition-colors duration-150 shrink-0 whitespace-nowrap"
            >
              {t('signOut')}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-600 dark:text-red-300 flex items-center gap-3">
            <span>⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => fetchDashboard()}
              className="ml-auto underline hover:no-underline text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Section: Device Summary */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="animate-fade-in">
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('welcomeBack')}</p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              {user.student_name || user.esp_id}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {t('room')} {formatNumber(user.room_number)} &nbsp;·&nbsp; {t('device')}{' '}
              <span className="font-mono text-brand-600 dark:text-brand-400">{user.esp_id}</span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500">
              {t('lastUpdated')}: {lastUpdate ? lastUpdate.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US') : '—'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-600">{t('refreshesEvery5s')}</p>
          </div>
        </div>

        {/* Section: Energy Budget Bar */}
        <div className="glass-card px-6 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300 font-medium">{t('dailyEnergyBudget')}</span>
            <span className={`font-mono font-semibold ${usagePercent > 80 ? 'text-red-500 dark:text-red-400' : 'text-brand-600 dark:text-brand-400'}`}>
              {formatNumber(data?.dailyKWh || 0, 3)} / {formatNumber(limitKWh)} kWh
              {' '}({formatNumber(usagePercent, 0)}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${budgetColor}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent > 80 && (
            <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5">
              <span>⚠️</span> {t('usedBudgetWarning', { percent: formatNumber(usagePercent, 0) })}
            </p>
          )}
        </div>

        {/* Section: Real-Time Metric Cards */}
        {loading && !data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {METRIC_DEFS.map((m) => (
              <div key={m.key} className="glass-card p-6 h-36 animate-pulse">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {METRIC_DEFS.map((m) => (
              <MetricCard
                key={m.key}
                label={t(m.labelKey)}
                value={metricsValues[m.key]}
                unit={m.unit}
                icon={m.icon}
                color={m.color}
                glow={m.glow}
              />
            ))}
          </div>
        )}

        {/* Section: Billing details */}
        <div className="glass-card p-6 animate-fade-in flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>💳</span> {t('billingDetails')}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{t('billingDetailsSub')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                id="pay-bill-billing-btn"
                onClick={() => onNavigate('payment')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-500/40
                           bg-brand-500/15 text-brand-700 dark:text-brand-300 hover:bg-brand-500/25 hover:border-brand-500/60
                           transition-all duration-200 text-sm font-semibold"
              >
                <span>💳</span> {t('payBill')}
              </button>
              <button
                id="view-history-billing-btn"
                onClick={() => onNavigate('history')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600
                           text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-500
                           transition-all duration-200 text-sm"
              >
                <span>📜</span> {t('paymentHistory')}
              </button>
            </div>
          </div>

          {/* Billing Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Today's Estimated Cost */}
            <div className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('todaysCost')}</span>
              <span className="text-2xl font-bold text-brand-600 dark:text-brand-400 font-mono">৳ {formatNumber(dailyBillDetails.total, 2)}</span>
              <span className="text-[10px] text-slate-500">
                {formatNumber(data?.dailyKWh || 0, 3)} kWh consumed today
              </span>
            </div>

            {/* Cumulative Bill (Energy Charge) */}
            <div className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('totalCharge')}</span>
              <span className="text-2xl font-bold text-sky-600 dark:text-sky-400 font-mono">৳ {formatNumber(cumulativeBillDetails.total, 2)}</span>
              <span className="text-[10px] text-slate-500">
                Based on {formatNumber(latest?.energy || 0, 4)} kWh cumulative energy
              </span>
            </div>

            {/* Estimated Total Bill (with Demand Charge) */}
            <div className="border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('estimatedTotal')}</span>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">৳ {formatNumber(estimatedTotalBill, 2)}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Includes {t('demandChargeLabel')}: ৳ {formatNumber(demandCharge, 2)}
              </span>
            </div>
          </div>

          {/* Slab Breakdown Table */}
          {cumulativeBillDetails.breakdown && cumulativeBillDetails.breakdown.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('billingBreakdown')}</h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3 font-medium">{t('slabName')}</th>
                      <th className="p-3 font-medium text-right">{t('slabRate')}</th>
                      <th className="p-3 font-medium text-right">{t('slabConsumed')}</th>
                      <th className="p-3 font-medium text-right">{t('slabCharge')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cumulativeBillDetails.breakdown.map((b, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/45 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/25 transition-colors">
                        <td className="p-3 font-medium text-slate-600 dark:text-slate-400">
                          {language === 'bn' ? b.slabNameBn : b.slabName}
                        </td>
                        <td className="p-3 text-right font-mono">৳ {formatNumber(b.rate, 2)}</td>
                        <td className="p-3 text-right font-mono">{formatNumber(b.units, 3)}</td>
                        <td className="p-3 text-right font-mono text-brand-600 dark:text-brand-400">৳ {formatNumber(b.cost, 2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-800/30 font-bold text-slate-800 dark:text-slate-200">
                      <td className="p-3">{t('totalCharge')}</td>
                      <td className="p-3 text-right">—</td>
                      <td className="p-3 text-right font-mono">{formatNumber(latest?.energy || 0, 3)}</td>
                      <td className="p-3 text-right font-mono text-brand-600 dark:text-brand-400">৳ {formatNumber(cumulativeBillDetails.total, 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                <span>
                  {cumulativeBillDetails.type === 'lifeline' ? t('lifelineAppliedText') : t('standardSlabsAppliedText')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section: AI Usage Predictions */}
        <div className="animate-fade-in">
          <UsagePredictionWidget
            esp_id={user.esp_id}
            dailyKWh={data?.dailyKWh || 0}
            weeklyKWh={data?.weeklyKWh || 0}
            monthlyKWh={data?.monthlyKWh || 0}
          />
        </div>

        {/* Carbon Footprint Widget */}
        <div className="animate-fade-in">
          <CarbonWidget dailyKWh={data?.dailyKWh || 0} cumulativeKWh={latest?.energy || 0} />
        </div>

        {/* Floating Voice Assistant */}
        <VoiceAssistantWidget 
          dailyKWh={data?.dailyKWh || 0} 
          estimatedBill={estimatedTotalBill} 
          dailyCost={dailyBillDetails.total}
          onNavigate={onNavigate}
          roomNumber={user.room_number}
        />

        {/* Section: Chart */}
        <div className="animate-fade-in">
          <PowerChart data={chartData} />
        </div>

        {/* Section: Alerts */}
        <div className="animate-fade-in">
          <AlertsPanel alerts={alerts} onRefresh={() => fetchDashboard(true)} />
        </div>

        {/* Section: Latest Reading Details */}
        {latest && (
          <div className="glass-card p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t('latestReadingDetails')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    {[t('timestamp'), t('voltage'), t('current'), t('power'), t('cumulativeEnergy')].map((h) => (
                      <th key={h} className="pb-3 pr-6 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-slate-700 dark:text-slate-300 font-mono">
                    <td className="py-3 pr-6 text-slate-500 dark:text-slate-400 font-sans">
                      {latest.timestamp ? formatDate(latest.timestamp) : '—'}
                    </td>
                    <td className="py-3 pr-6 text-sky-600 dark:text-sky-400">{formatNumber(latest.voltage, 1)} V</td>
                    <td className="py-3 pr-6 text-brand-600 dark:text-brand-400">{formatNumber(latest.current, 3)} A</td>
                    <td className="py-3 pr-6 text-amber-600 dark:text-amber-400">{formatNumber(latest.power, 1)} W</td>
                    <td className="py-3 pr-6 text-violet-600 dark:text-violet-400">{formatNumber(latest.energy, 4)} kWh</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-4 text-center text-xs text-slate-500 dark:text-slate-600">
        {t('hostelElectricityMonitor')}
      </footer>
    </div>
  );
};

export default DashboardPage;
