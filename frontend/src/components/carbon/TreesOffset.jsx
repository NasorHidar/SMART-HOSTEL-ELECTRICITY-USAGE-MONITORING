/**
 * components/carbon/TreesOffset.jsx
 *
 * Shows how many trees are needed to absorb the user's carbon emissions.
 * 1 mature tree absorbs ~21 kg CO₂ per year.
 */

import { useLanguage } from '../../context/LanguageContext';

const TreeIcon = ({ active = true, size = 28 }) => (
  <span
    className={`select-none transition-all duration-300 ${active ? 'opacity-100' : 'opacity-20'}`}
    style={{ fontSize: size }}
    role="img"
    aria-hidden
  >
    🌳
  </span>
);

const TreesOffset = ({ treesNeeded, loading = false }) => {
  const { t, formatNumber } = useLanguage();

  if (loading) {
    return (
      <div className="rounded-2xl glass-card p-6 h-48 animate-pulse">
        <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded mb-4" />
        <div className="h-16 bg-slate-100 dark:bg-white/5 rounded" />
      </div>
    );
  }

  const monthlyTrees   = treesNeeded?.monthly  ?? 0;
  const lifetimeTrees  = treesNeeded?.lifetime ?? 0;

  // Display up to 10 tree icons; each "filled" represents a fraction
  const iconCount    = 10;
  const filledCount  = Math.min(iconCount, Math.ceil(monthlyTrees));

  return (
    <div
      className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md p-6"
      style={{ boxShadow: '0 0 30px rgba(34,197,94,0.08), 0 4px 16px rgba(0,0,0,0.4)' }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🌳</span> {t('treesNeededTitle')}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{t('treesNeededSub')}</p>
      </div>

      {/* Tree icon grid */}
      <div className="flex flex-wrap gap-1 mb-4">
        {[...Array(iconCount)].map((_, i) => (
          <TreeIcon key={i} active={i < filledCount} />
        ))}
        {monthlyTrees > iconCount && (
          <span className="text-slate-600 dark:text-slate-400 text-sm flex items-center ml-1">
            +{formatNumber(monthlyTrees - iconCount, 0)} {t('more')}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/15">
          <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">{t('treesMonthly')}</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            {formatNumber(monthlyTrees, 2)}
          </p>
          <p className="text-[10px] text-slate-500">{t('treesUnit')}</p>
        </div>
        <div className="bg-teal-500/10 rounded-xl p-3 border border-teal-500/15">
          <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">{t('treesLifetime')}</p>
          <p className="text-2xl font-bold font-mono text-teal-400">
            {formatNumber(lifetimeTrees, 2)}
          </p>
          <p className="text-[10px] text-slate-500">{t('treesUnit')}</p>
        </div>
      </div>

      <p className="text-[10px] text-slate-600 mt-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        {t('treesNote')}
      </p>
    </div>
  );
};

export default TreesOffset;
