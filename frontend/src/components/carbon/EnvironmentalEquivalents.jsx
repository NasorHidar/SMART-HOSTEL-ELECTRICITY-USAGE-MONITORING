/**
 * components/carbon/EnvironmentalEquivalents.jsx
 *
 * Shows 4 relatable equivalences for the user's monthly CO₂ emissions:
 *   - Car kilometers driven
 *   - Liters of gasoline burned
 *   - Smartphone charges
 *   - Fan hours
 */

import { useLanguage } from '../../context/LanguageContext';

const EquivCard = ({ icon, value, unit, description, color, bg }) => (
  <div
    className="rounded-xl border p-4 flex flex-col gap-2 relative overflow-hidden"
    style={{ borderColor: `${color}30`, background: bg }}
  >
    <div
      className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-15 blur-xl pointer-events-none"
      style={{ background: color }}
    />
    <span className="text-2xl">{icon}</span>
    <div>
      <span className="text-xl font-bold font-mono" style={{ color }}>{value}</span>
      <span className="text-sm text-slate-600 dark:text-slate-400 ml-1.5">{unit}</span>
    </div>
    <p className="text-[11px] text-slate-500 leading-snug">{description}</p>
  </div>
);

const EnvironmentalEquivalents = ({ equivalents, loading = false }) => {
  const { t, formatNumber } = useLanguage();

  if (loading) {
    return (
      <div className="rounded-2xl glass-card p-6">
        <div className="h-4 w-56 bg-slate-200 dark:bg-white/10 rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      icon: '🚗',
      value: formatNumber(equivalents?.carKm ?? 0, 1),
      unit:  t('km'),
      description: t('carEquivalent'),
      color: '#f97316',
      bg:    'rgba(249,115,22,0.06)',
    },
    {
      icon: '⛽',
      value: formatNumber(equivalents?.gasolineLiters ?? 0, 2),
      unit:  t('liters'),
      description: t('gasolineEquivalent'),
      color: '#fb923c',
      bg:    'rgba(251,146,60,0.06)',
    },
    {
      icon: '📱',
      value: formatNumber(equivalents?.smartphones ?? 0),
      unit:  t('charges'),
      description: t('smartphoneEquivalent'),
      color: '#818cf8',
      bg:    'rgba(129,140,248,0.06)',
    },
    {
      icon: '💨',
      value: formatNumber(equivalents?.fanHours ?? 0),
      unit:  t('hours'),
      description: t('fanEquivalent'),
      color: '#38bdf8',
      bg:    'rgba(56,189,248,0.06)',
    },
  ];

  return (
    <div
      className="rounded-2xl glass-card p-6"
      style={{ boxShadow: '0 0 20px rgba(249,115,22,0.04), 0 4px 16px rgba(0,0,0,0.4)' }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>🌍</span> {t('environmentalEquivalents')}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{t('equivalentsSub')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c, i) => (
          <EquivCard key={i} {...c} />
        ))}
      </div>
    </div>
  );
};

export default EnvironmentalEquivalents;
