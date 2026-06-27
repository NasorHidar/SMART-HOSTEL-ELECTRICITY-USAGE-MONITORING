/**
 * pages/CarbonDashboardPage.jsx
 *
 * Full Carbon Footprint & Sustainability Analytics Dashboard.
 * Fetches data from 4 carbon API endpoints and renders all carbon components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth }     from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getCarbonProfile,
  getCarbonTrends,
  getCarbonLeaderboard,
  getCarbonInsights,
} from '../api/carbonApi';

import CarbonMetricCard       from '../components/carbon/CarbonMetricCard';
import CarbonTrendChart       from '../components/carbon/CarbonTrendChart';
import EnvironmentalEquivalents from '../components/carbon/EnvironmentalEquivalents';
import SustainabilityScore    from '../components/carbon/SustainabilityScore';
import TreesOffset            from '../components/carbon/TreesOffset';
import CarbonSavings          from '../components/carbon/CarbonSavings';
import CarbonLeaderboard      from '../components/carbon/CarbonLeaderboard';

const POLL_MS = 60000; // refresh every 60 s

const CarbonDashboardPage = ({ onNavigate }) => {
  const { user }                          = useAuth();
  const { t, language, formatNumber, formatDate } = useLanguage();

  const [profile,     setProfile]     = useState(null);
  const [trendData,   setTrendData]   = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [insights,    setInsights]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [lastUpdate,  setLastUpdate]  = useState(null);

  const isFetching = useRef(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    if (!silent) setLoading(true);
    setError('');
    try {
      const [profRes, trendRes, lbRes, insRes] = await Promise.allSettled([
        getCarbonProfile(user.esp_id),
        getCarbonTrends(user.esp_id, 30),
        getCarbonLeaderboard(),
        getCarbonInsights(user.esp_id),
      ]);

      if (profRes.status === 'fulfilled')  setProfile(profRes.value.data);
      if (trendRes.status === 'fulfilled') setTrendData(trendRes.value.data.trend || []);
      if (lbRes.status === 'fulfilled')    setLeaderboard(lbRes.value.data.leaderboard || []);
      if (insRes.status === 'fulfilled')   setInsights(insRes.value.data.insights || []);

      setLastUpdate(new Date());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch carbon data.');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user.esp_id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const interval = setInterval(() => fetchAll(true), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ── Computed shortcuts ───────────────────────────────────────────────────────
  const daily    = profile?.daily;
  const monthly  = profile?.monthly;
  const lifetime = profile?.lifetime;
  const score    = profile?.score;
  const savings  = profile?.savings;
  const equivs   = profile?.equivalents;
  const trees    = profile?.treesNeeded;

  const metricCards = [
    {
      id: 'today-co2',
      icon: '🌱',
      label: t('todayCO2'),
      value: daily?.co2 != null ? formatNumber(daily.co2, 3) : null,
      unit: 'kg CO₂',
      subtitle: `${formatNumber(daily?.kwh ?? 0, 4)} kWh`,
      color: 'text-emerald-600 dark:text-emerald-400',
      glow:  'rgba(52,211,153,0.2)',
    },
    {
      id: 'monthly-co2',
      icon: '📅',
      label: t('monthlyCO2'),
      value: monthly?.co2 != null ? formatNumber(monthly.co2, 2) : null,
      unit: 'kg CO₂',
      subtitle: `${formatNumber(monthly?.kwh ?? 0, 3)} kWh ${t('thisMonth')}`,
      color: 'text-sky-600 dark:text-sky-400',
      glow:  'rgba(56,189,248,0.2)',
    },
    {
      id: 'lifetime-co2',
      icon: '♾️',
      label: t('lifetimeCO2'),
      value: lifetime?.co2 != null ? formatNumber(lifetime.co2, 2) : null,
      unit: 'kg CO₂',
      subtitle: `${formatNumber(lifetime?.kwh ?? 0, 3)} kWh ${t('total')}`,
      color: 'text-violet-600 dark:text-violet-400',
      glow:  'rgba(167,139,250,0.2)',
    },
    {
      id: 'trees-needed',
      icon: '🌳',
      label: t('treesNeededCard'),
      value: trees?.monthly != null ? formatNumber(trees.monthly, 2) : null,
      unit: t('trees'),
      subtitle: t('perYearToOffset'),
      color: 'text-lime-600 dark:text-lime-400',
      glow:  'rgba(163,230,53,0.2)',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          {/* Brand + back */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-white/10 hover:border-slate-500 dark:hover:border-white/20
                         rounded-lg px-3 py-2 text-xs transition-all duration-150 flex items-center gap-1.5"
            >
              ← {t('backToDashboard')}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌿</span>
              <div>
                <h1 className="font-bold text-slate-800 dark:text-slate-100 leading-tight text-sm sm:text-base">
                  {t('carbonDashboardTitle')}
                </h1>
                <p className="text-slate-500 text-[10px] hidden sm:block">{t('carbonDashboardSub')}</p>
              </div>
            </div>
          </div>

          {/* Right side: live + user info */}
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <p className="text-[10px] text-slate-600 hidden sm:block">
                {t('lastUpdated')}: {lastUpdate.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </p>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                   style={{ boxShadow: '0 0 8px rgba(52,211,153,0.7)' }} />
              <span className="text-xs text-emerald-400 font-medium">{t('live')}</span>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.student_name}</span>
              <span className="text-[10px] text-slate-500">{t('room')} {user.room_number}</span>
            </div>
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
            <button onClick={() => fetchAll()} className="ml-auto underline hover:no-underline text-xs">
              {t('retry') || 'Retry'}
            </button>
          </div>
        )}

        {/* Page title */}
        <div className="animate-fade-in">
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('welcomeBack')} {user.student_name}</p>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3 mt-1">
            <span>🌿</span> {t('carbonDashboardTitle')}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {t('emissionFactor')}: <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {formatNumber(profile?.emissionFactor ?? 0.67, 2)} kg CO₂/kWh
            </span>
            &nbsp;·&nbsp; {t('bangladeshGrid')}
          </p>
        </div>

        {/* Section: 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {metricCards.map((c) => (
            <CarbonMetricCard
              key={c.id}
              icon={c.icon}
              label={c.label}
              value={c.value}
              unit={c.unit}
              subtitle={c.subtitle}
              color={c.color}
              glow={c.glow}
            />
          ))}
        </div>

        {/* Section: Score + Equivalents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <SustainabilityScore
            score={score?.score}
            label={score?.label}
            tier={score?.tier}
            loading={loading}
          />
          <EnvironmentalEquivalents
            equivalents={equivs}
            loading={loading}
          />
        </div>

        {/* Section: Trees Offset + Savings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <TreesOffset treesNeeded={trees} loading={loading} />
          <CarbonSavings savings={savings} loading={loading} />
        </div>

        {/* Section: Trend Chart */}
        <div className="animate-fade-in">
          <CarbonTrendChart data={trendData} loading={loading} />
        </div>

        {/* Section: AI Sustainability Insights */}
        <div
          className="rounded-2xl border border-violet-500/20 bg-violet-500/5 backdrop-blur-md p-6 animate-fade-in"
          style={{ boxShadow: '0 0 24px rgba(139,92,246,0.08), 0 4px 16px rgba(0,0,0,0.4)' }}
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>🤖</span> {t('aiInsightsTitle')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t('aiInsightsSub')}</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
              <span className="text-4xl">🤖</span>
              <p className="text-sm">{t('noInsightsYet')}</p>
              <p className="text-xs">{t('insightsGenerated')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((ins, idx) => (
                <div
                  key={ins._id || idx}
                  className="rounded-xl border border-violet-500/15 bg-violet-500/8 p-4 flex gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30
                                  flex items-center justify-center text-sm">
                    🌿
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{ins.insight}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-500">
                        {formatDate(ins.date)}
                      </span>
                      {ins.sustainabilityScore != null && (
                        <span className="text-[10px] text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-full border border-violet-500/20">
                          {t('score')}: {formatNumber(ins.sustainabilityScore)}/100
                        </span>
                      )}
                      {ins.dailyCO2 != null && (
                        <span className="text-[10px] text-slate-500">
                          {t('dailyCO2Short')}: {formatNumber(ins.dailyCO2, 3)} kg CO₂
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-slate-600 mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
            {t('poweredByGemini')}
          </p>
        </div>

        {/* Section: Leaderboard */}
        <div className="animate-fade-in">
          <CarbonLeaderboard
            leaderboard={leaderboard}
            currentEspId={user.esp_id}
            loading={loading}
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/5 py-4 text-center text-xs text-slate-500 dark:text-slate-600">
        {t('hostelElectricityMonitor')}
      </footer>
    </div>
  );
};

export default CarbonDashboardPage;
