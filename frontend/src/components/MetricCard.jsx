import React, { memo } from 'react';
import { useLanguage } from '../context/LanguageContext';

const MetricCard = ({
  label,
  value,
  unit,
  icon,
  color = 'text-brand-600 dark:text-brand-400',
  glow  = 'rgba(37,162,101,0.25)',
  trend,
}) => {
  const { language, formatNumber } = useLanguage();

  const displayValue =
    value == null
      ? '—'
      : typeof value === 'number'
        ? formatNumber(value, unit === 'kWh' ? 4 : unit === 'A' ? 3 : 1)
        : value;

  return (
    <div
      className="glass-card p-6 flex flex-col gap-3 hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 cursor-default"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
        <span className={`text-2xl ${color}`}>{icon}</span>
      </div>

      {/* Value */}
      <div className="flex items-end gap-2">
        <span className={`metric-value ${color} transition-all duration-300`}>{displayValue}</span>
        <span className="text-slate-500 dark:text-slate-400 text-lg font-mono mb-1">{unit}</span>
      </div>

      {/* Optional trend indicator */}
      {trend != null && (
        <div className={`text-xs font-medium ${trend >= 0 ? 'text-red-500 dark:text-red-400' : 'text-brand-600 dark:text-brand-400'}`}>
          {trend >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(trend), 1)}% {language === 'bn' ? 'গত ঘণ্টার তুলনায়' : 'vs last hour'}
        </div>
      )}

      {/* Bottom accent line */}
      <div
        className={`h-0.5 rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-30 ${color}`}
      />
    </div>
  );
};

export default memo(MetricCard);
