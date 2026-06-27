import React, { memo } from 'react';

const CarbonMetricCard = ({
  icon,
  label,
  value,
  unit,
  subtitle,
  color = 'text-emerald-400',
  glow  = 'rgba(52,211,153,0.2)',
  trend,          // optional: 'up' | 'down' | null
  trendValue,     // optional: string like "−12%"
}) => {
  const isLoading = value == null;

  return (
    <div
      className="relative rounded-2xl glass-card p-5
                 flex flex-col gap-3 overflow-hidden cursor-default
                 hover:scale-[1.02] hover:shadow-2xl hover:border-brand-500/20
                 transition-all duration-300 ease-out"
      style={{ boxShadow: `0 0 24px ${glow}, 0 4px 16px rgba(0,0,0,0.15)` }}
    >
      {/* Subtle background glow blob */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: glow }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-2xl select-none" role="img">{icon}</span>
        {trend && (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
              ${trend === 'down' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
          >
            {trendValue}
          </span>
        )}
      </div>

      {/* Value */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-7 w-3/4 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
        </div>
      ) : (
        <div>
          <div className={`text-2xl font-bold font-mono ${color} leading-none`}>
            {value}
            <span className="text-sm font-normal text-slate-600 dark:text-slate-400 ml-1">{unit}</span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">{subtitle}</p>
          )}
        </div>
      )}

      {/* Label */}
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
};

export default memo(CarbonMetricCard);
