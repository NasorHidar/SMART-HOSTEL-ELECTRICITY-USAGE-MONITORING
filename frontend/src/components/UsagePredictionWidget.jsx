/**
 * components/UsagePredictionWidget.jsx
 *
 * Displays AI-powered usage predictions and a switchable history table.
 *
 * Layout:
 *   • Three prediction cards  — Daily / Weekly / Monthly forecasts
 *   • "History" button        — top-right corner, opens the history panel
 *   • History panel (modal)   — tab-switched table: Daily | Weekly | Monthly
 */

import { useState, useEffect, useCallback } from 'react';
import { getPredictions } from '../api/api';
import { useLanguage } from '../context/LanguageContext';

// ─── Confidence bar colours ───────────────────────────────────────────────────
const confidenceColor = (pct) => {
  if (pct >= 70) return { bar: '#22c55e', text: 'text-emerald-500 dark:text-emerald-400' };
  if (pct >= 40) return { bar: '#f59e0b', text: 'text-amber-500 dark:text-amber-400' };
  return { bar: '#ef4444', text: 'text-red-500 dark:text-red-400' };
};

// ─── History helpers ──────────────────────────────────────────────────────────
// Build synthetic daily history rows from the actual daily kWh + prediction
const buildDailyHistory = (dailyKWh, prediction) => {
  const now = new Date();
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const isToday = i === 0;
    rows.push({
      label: isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      actual: isToday ? dailyKWh : null,
      predicted: isToday ? prediction?.predictedKWh : null,
      isToday,
    });
  }
  return rows;
};

const buildWeeklyHistory = (weeklyKWh, dailyKWh) => {
  const now = new Date();
  const rows = [];
  for (let i = 3; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    const isCurrent = i === 0;
    rows.push({
      label: isCurrent
        ? 'Current Week'
        : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      actual: isCurrent ? weeklyKWh : null,
      isToday: isCurrent,
    });
  }
  return rows;
};

const buildMonthlyHistory = (monthlyKWh, prediction) => {
  const now = new Date();
  const rows = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const isCurrent = i === 0;
    rows.push({
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      actual: isCurrent ? monthlyKWh : null,
      predicted: isCurrent ? prediction?.predictedKWh : null,
      isToday: isCurrent,
    });
  }
  return rows;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const PredictionCard = ({ icon, label, kwhActual, prediction, accentClass, glowColor }) => {
  const { formatNumber, calculateBill } = useLanguage();
  const conf = prediction?.confidence ?? 0;
  const colors = confidenceColor(conf);
  const predicted = prediction?.predictedKWh;

  const actualCost = kwhActual != null ? calculateBill(kwhActual).total : null;
  const predictedCost = predicted != null ? calculateBill(predicted).total : null;

  return (
    <div
      className="glass-card p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      style={{ '--glow': glowColor }}
    >
      {/* Subtle glow accent */}
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: glowColor }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="text-xl">{icon}</span>
      </div>

      {/* Actual usage */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Actual</span>
        <span className={`text-2xl font-bold font-mono ${accentClass}`}>
          {kwhActual != null ? formatNumber(kwhActual, 3) : '—'}
          <span className="text-sm font-normal text-slate-400 ml-1">kWh</span>
        </span>
        {actualCost != null && (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans mt-0.5">
            ৳ {formatNumber(actualCost, 2)}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-slate-200 dark:bg-slate-700/60" />

      {/* Prediction */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>🤖</span> Predicted
          </span>
          {prediction && (
            <span className={`text-[10px] font-semibold ${colors.text}`}>
              {conf}% confidence
            </span>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-bold font-mono text-slate-700 dark:text-slate-200">
            {predicted != null ? formatNumber(predicted, 3) : '—'}
            <span className="text-sm font-normal text-slate-400 ml-1">kWh</span>
          </span>
          {predictedCost != null && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
              ৳ {formatNumber(predictedCost, 2)}
            </span>
          )}
        </div>

        {/* Confidence bar */}
        {prediction && (
          <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${conf}%`, background: colors.bar }}
            />
          </div>
        )}
      </div>

      {/* Breakdown tooltip-style detail */}
      {prediction?.breakdown && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-2">
          {prediction.breakdown.historicalDaysUsed != null && (
            <div>Historical days: {prediction.breakdown.historicalDaysUsed}</div>
          )}
          {prediction.breakdown.historicalMonthsUsed != null && (
            <div>Historical months: {prediction.breakdown.historicalMonthsUsed}</div>
          )}
          {prediction.breakdown.elapsedHours != null && (
            <div>Elapsed today: {formatNumber(prediction.breakdown.elapsedHours, 1)}h</div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── History modal ────────────────────────────────────────────────────────────

const TABS = ['Daily', 'Weekly', 'Monthly'];

const HistoryModal = ({ open, onClose, dailyKWh, weeklyKWh, monthlyKWh, predictions }) => {
  const [activeTab, setActiveTab] = useState('Daily');
  const { formatNumber, calculateBill } = useLanguage();

  if (!open) return null;

  const rows = {
    Daily:   buildDailyHistory(dailyKWh, predictions?.dailyPrediction),
    Weekly:  buildWeeklyHistory(weeklyKWh, dailyKWh),
    Monthly: buildMonthlyHistory(monthlyKWh, predictions?.monthlyPrediction),
  }[activeTab];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl glass-card shadow-2xl flex flex-col gap-0 overflow-hidden animate-fade-in"
          style={{ maxHeight: '85vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Usage History
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-xl leading-none p-1"
            >
              ×
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 pt-3 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-all duration-150 ${
                  activeTab === tab
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-auto flex-1 px-2 py-2">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="sticky top-0 text-left text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 font-semibold text-right">Actual (kWh & ৳)</th>
                  {activeTab !== 'Weekly' && (
                    <th className="px-4 py-3 font-semibold text-right">Predicted (kWh & ৳)</th>
                  )}
                  <th className="px-4 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                      row.isToday
                        ? 'bg-brand-50 dark:bg-brand-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Period */}
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                      <span className="flex items-center gap-2">
                        {row.isToday && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse-slow" />
                        )}
                        {row.label}
                      </span>
                    </td>

                    {/* Actual */}
                    <td className="px-4 py-3 text-right font-mono">
                      {row.actual != null ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sky-600 dark:text-sky-400 font-semibold">
                            {formatNumber(row.actual, 3)} <span className="text-[10px] font-normal text-slate-400">kWh</span>
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            ৳ {formatNumber(calculateBill(row.actual).total, 2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">No data</span>
                      )}
                    </td>

                    {/* Predicted (Daily + Monthly only) */}
                    {activeTab !== 'Weekly' && (
                      <td className="px-4 py-3 text-right font-mono">
                        {row.predicted != null ? (
                          <div className="flex flex-col items-end">
                            <span className="text-violet-600 dark:text-violet-400 font-semibold">
                              {formatNumber(row.predicted, 3)} <span className="text-[10px] font-normal text-slate-400">kWh</span>
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              ৳ {formatNumber(calculateBill(row.predicted).total, 2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>
                    )}

                    {/* Status badge */}
                    <td className="px-4 py-3 text-right">
                      {row.isToday ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300">
                          Current
                        </span>
                      ) : row.actual != null ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          No readings
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse-slow" />
            Cost calculations are calculated dynamically using the hostel tariff slab rates.
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Main widget ──────────────────────────────────────────────────────────────

const UsagePredictionWidget = ({ esp_id, dailyKWh, weeklyKWh, monthlyKWh }) => {
  const [predictions, setPredictions]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [error, setError]               = useState('');

  const fetchPredictions = useCallback(async () => {
    if (!esp_id) return;
    try {
      setLoading(true);
      const { data } = await getPredictions(esp_id);
      setPredictions(data);
      setError('');
    } catch (err) {
      setError('Prediction service unavailable');
    } finally {
      setLoading(false);
    }
  }, [esp_id]);

  useEffect(() => {
    fetchPredictions();
    // Refresh predictions every 5 minutes
    const interval = setInterval(fetchPredictions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPredictions]);

  // Weekly prediction: extrapolate from daily prediction × 7
  const weeklyPrediction = predictions?.dailyPrediction
    ? {
        predictedKWh: parseFloat((predictions.dailyPrediction.predictedKWh * 7).toFixed(3)),
        confidence: Math.round(predictions.dailyPrediction.confidence * 0.9), // slightly less confident at weekly scale
        breakdown: null,
      }
    : null;

  return (
    <div className="glass-card p-6 flex flex-col gap-5 animate-fade-in">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>🤖</span> AI Usage Predictions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Weighted historical analysis · Live extrapolation
          </p>
        </div>

        {/* History button — top right */}
        <button
          id="usage-history-btn"
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600
                     text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white
                     hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10
                     transition-all duration-200 text-sm font-semibold shrink-0"
        >
          <span>📋</span>
          <span>History</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2 border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
          <span>⚠️</span> {error}
          <button onClick={fetchPredictions} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Prediction cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card p-5 h-52 animate-pulse">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
              <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-3" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PredictionCard
            icon="☀️"
            label="Daily Forecast"
            kwhActual={dailyKWh}
            prediction={predictions?.dailyPrediction}
            accentClass="text-sky-600 dark:text-sky-400"
            glowColor="rgba(56,189,248,0.4)"
          />
          <PredictionCard
            icon="📅"
            label="Weekly Forecast"
            kwhActual={weeklyKWh}
            prediction={weeklyPrediction}
            accentClass="text-violet-600 dark:text-violet-400"
            glowColor="rgba(167,139,250,0.4)"
          />
          <PredictionCard
            icon="🗓️"
            label="Monthly Forecast"
            kwhActual={monthlyKWh}
            prediction={predictions?.monthlyPrediction}
            accentClass="text-amber-600 dark:text-amber-400"
            glowColor="rgba(251,191,36,0.4)"
          />
        </div>
      )}

      {/* Last updated */}
      {predictions?.timestamp && (
        <p className="text-[10px] text-slate-400 text-right">
          Predictions updated: {new Date(predictions.timestamp).toLocaleTimeString()}
        </p>
      )}

      {/* History modal */}
      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        dailyKWh={dailyKWh}
        weeklyKWh={weeklyKWh}
        monthlyKWh={monthlyKWh}
        predictions={predictions}
      />
    </div>
  );
};

export default UsagePredictionWidget;
