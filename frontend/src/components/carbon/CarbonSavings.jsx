/**
 * components/carbon/CarbonSavings.jsx
 *
 * Displays CO₂ savings (or increases) compared to the previous period.
 * Week-over-week and month-over-month comparisons.
 */

import { useLanguage } from '../../context/LanguageContext';

const SavingsRow = ({ period, savings, t, formatNumber }) => {
  const improved = savings?.improved ?? false;
  const percent  = Math.abs(savings?.percent ?? 0);
  const saved    = Math.abs(savings?.saved  ?? 0);

  return (
    <div
      className="rounded-xl border p-4 flex items-center gap-4"
      style={{
        borderColor: improved ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
        background:  improved ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
      }}
    >
      <div className="flex-shrink-0 text-3xl">
        {improved ? '📉' : '📈'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">{period}</p>
        <p className={`text-lg font-bold font-mono ${improved ? 'text-emerald-400' : 'text-red-400'}`}>
          {improved ? '−' : '+'}{formatNumber(saved, 3)} kg CO₂
        </p>
        <p className="text-xs text-slate-500">
          {t('vs')} {t('previousPeriod')}:&nbsp;
          <span className="font-mono">{formatNumber(savings?.previous ?? 0, 3)} kg CO₂</span>
        </p>
      </div>

      <div
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-bold border
          ${improved
            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/15'
            : 'text-red-400 border-red-500/30 bg-red-500/15'}`}
      >
        {improved ? '▼' : '▲'} {formatNumber(percent, 1)}%
      </div>
    </div>
  );
};

const CarbonSavings = ({ savings, loading = false }) => {
  const { t, formatNumber } = useLanguage();

  if (loading) {
    return (
      <div className="rounded-2xl glass-card p-6 space-y-3">
        <div className="h-4 w-44 bg-slate-200 dark:bg-white/10 rounded animate-pulse mb-4" />
        {[0, 1].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const hasPrevWeek  = (savings?.week?.previous  ?? 0) > 0;
  const hasPrevMonth = (savings?.month?.previous ?? 0) > 0;

  return (
    <div
      className="rounded-2xl glass-card p-6"
      style={{ boxShadow: '0 0 20px rgba(52,211,153,0.05), 0 4px 16px rgba(0,0,0,0.4)' }}
    >
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>💚</span> {t('carbonSavingsTitle')}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{t('carbonSavingsSub')}</p>
      </div>

      <div className="flex flex-col gap-3">
        {hasPrevWeek ? (
          <SavingsRow
            period={t('thisWeek')}
            savings={savings?.week}
            t={t}
            formatNumber={formatNumber}
          />
        ) : (
          <div className="rounded-xl border border-white/5 bg-white/3 p-4 text-xs text-slate-500 flex items-center gap-2">
            <span>⏳</span> {t('notEnoughWeekData')}
          </div>
        )}

        {hasPrevMonth ? (
          <SavingsRow
            period={t('thisMonth')}
            savings={savings?.month}
            t={t}
            formatNumber={formatNumber}
          />
        ) : (
          <div className="rounded-xl border border-white/5 bg-white/3 p-4 text-xs text-slate-500 flex items-center gap-2">
            <span>⏳</span> {t('notEnoughMonthData')}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarbonSavings;
