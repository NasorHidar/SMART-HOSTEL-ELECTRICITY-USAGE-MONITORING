/**
 * src/pages/DashboardPage.jsx
 * Main user dashboard — real-time metrics, chart, and alerts.
 * Polls the backend every 5 seconds.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../api/api';
import MetricCard  from '../components/MetricCard';
import PowerChart  from '../components/PowerChart';
import AlertsPanel from '../components/AlertsPanel';

// ─── Metric card definitions ──────────────────────────────────────────────────
const METRIC_DEFS = [
  {
    key:   'voltage',
    label: 'Voltage',
    unit:  'V',
    icon:  '🔌',
    color: 'text-sky-400',
    glow:  'rgba(56,189,248,0.2)',
  },
  {
    key:   'current',
    label: 'Current',
    unit:  'A',
    icon:  '⚡',
    color: 'text-brand-400',
    glow:  'rgba(37,162,101,0.2)',
  },
  {
    key:   'power',
    label: 'Power',
    unit:  'W',
    icon:  '💡',
    color: 'text-amber-400',
    glow:  'rgba(251,191,36,0.2)',
  },
  {
    key:   'dailyKWh',
    label: "Today's Energy",
    unit:  'kWh',
    icon:  '📊',
    color: 'text-violet-400',
    glow:  'rgba(167,139,250,0.2)',
  },
];

const POLL_INTERVAL_MS = 5000;

const DashboardPage = () => {
  const { user, logout } = useAuth();

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  // Use a ref to prevent StrictMode double-fetch issues
  const isFetching = useRef(false);

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <header className="border-b border-surface-border bg-surface-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="font-bold text-slate-100 leading-tight">Smart Meter</h1>
              <p className="text-slate-500 text-xs hidden sm:block">Hostel Electricity Monitor</p>
            </div>
          </div>

          {/* Live indicator + User + Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-brand-400 animate-pulse-slow' : 'bg-slate-500'}`}
                style={isLive ? { boxShadow: '0 0 8px rgba(72,190,132,0.7)' } : {}}
              />
              <span className={`text-xs font-medium ${isLive ? 'text-brand-400' : 'text-slate-500'}`}>
                {isLive ? 'Live' : 'Offline'}
              </span>
            </div>

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-200">{user.student_name}</span>
              <span className="text-xs text-slate-500">Room {user.room_number} · {user.esp_id}</span>
            </div>

            <button
              id="logout-btn"
              onClick={logout}
              className="text-xs text-slate-400 hover:text-white border border-surface-border
                         hover:border-slate-500 rounded-lg px-3 py-2 transition-colors duration-150"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300 flex items-center gap-3">
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
            <p className="text-slate-400 text-sm">Welcome back,</p>
            <h2 className="text-3xl font-bold text-slate-100">
              {user.student_name || user.esp_id}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Room {user.room_number} &nbsp;·&nbsp; Device{' '}
              <span className="font-mono text-brand-400">{user.esp_id}</span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500">
              Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}
            </p>
            <p className="text-xs text-slate-600">Refreshes every 5 s</p>
          </div>
        </div>

        {/* Section: Energy Budget Bar */}
        <div className="glass-card px-6 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300 font-medium">Daily Energy Budget</span>
            <span className={`font-mono font-semibold ${usagePercent > 80 ? 'text-red-400' : 'text-brand-400'}`}>
              {(data?.dailyKWh || 0).toFixed(3)} / {limitKWh} kWh
              {' '}({usagePercent.toFixed(0)}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-surface-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${budgetColor}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent > 80 && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <span>⚠️</span> You've used {usagePercent.toFixed(0)}% of your daily budget.
            </p>
          )}
        </div>

        {/* Section: Real-Time Metric Cards */}
        {loading && !data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {METRIC_DEFS.map((m) => (
              <div key={m.key} className="glass-card p-6 h-36 animate-pulse">
                <div className="h-3 bg-surface-border rounded w-1/2 mb-4" />
                <div className="h-8 bg-surface-border rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {METRIC_DEFS.map((m) => (
              <MetricCard
                key={m.key}
                label={m.label}
                value={metricsValues[m.key]}
                unit={m.unit}
                icon={m.icon}
                color={m.color}
                glow={m.glow}
              />
            ))}
          </div>
        )}

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
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Latest Reading Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-surface-border">
                    {['Timestamp', 'Voltage', 'Current', 'Power', 'Cumulative Energy'].map((h) => (
                      <th key={h} className="pb-3 pr-6 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-slate-300 font-mono">
                    <td className="py-3 pr-6 text-slate-400 font-sans">
                      {latest.timestamp ? new Date(latest.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 pr-6 text-sky-400">{latest.voltage?.toFixed(1)} V</td>
                    <td className="py-3 pr-6 text-brand-400">{latest.current?.toFixed(3)} A</td>
                    <td className="py-3 pr-6 text-amber-400">{latest.power?.toFixed(1)} W</td>
                    <td className="py-3 pr-6 text-violet-400">{latest.energy?.toFixed(5)} kWh</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border py-4 text-center text-xs text-slate-600">
        Smart Hostel Electricity Monitoring System &nbsp;·&nbsp; Powered by Gemini AI
      </footer>
    </div>
  );
};

export default DashboardPage;
