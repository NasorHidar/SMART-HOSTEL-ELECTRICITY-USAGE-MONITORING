/**
 * src/components/MetricCard.jsx
 * Animated card displaying a single electrical metric.
 */

import { useState, useEffect, useRef } from 'react';

const MetricCard = ({
  label,
  value,
  unit,
  icon,
  color = 'text-brand-400',
  glow  = 'rgba(37,162,101,0.25)',
  trend,
}) => {
  // ✅ Use a React state key to re-trigger the CSS animation safely,
  //    instead of directly manipulating classList (which breaks during scroll).
  const [animKey, setAnimKey] = useState(0);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setAnimKey((k) => k + 1); // new key → element remounts → animation replays
      prevValue.current = value;
    }
  }, [value]);

  const displayValue =
    value == null
      ? '—'
      : typeof value === 'number'
        ? value.toFixed(unit === 'kWh' ? 4 : unit === 'A' ? 3 : 1)
        : value;

  return (
    <div
      className="glass-card p-6 flex flex-col gap-3 hover:scale-[1.02] transition-transform duration-200 cursor-default"
      style={{ boxShadow: `0 0 30px ${glow}, 0 4px 24px rgba(0,0,0,0.4)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">{label}</span>
        <span className={`text-2xl ${color}`}>{icon}</span>
      </div>

      {/* Value — key forces remount to replay animate-slide-up */}
      <div key={animKey} className="flex items-end gap-2 animate-slide-up">
        <span className={`metric-value ${color}`}>{displayValue}</span>
        <span className="text-slate-400 text-lg font-mono mb-1">{unit}</span>
      </div>

      {/* Optional trend indicator */}
      {trend != null && (
        <div className={`text-xs font-medium ${trend >= 0 ? 'text-red-400' : 'text-brand-400'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs last hour
        </div>
      )}

      {/* Bottom accent line */}
      <div
        className={`h-0.5 rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-30 ${color}`}
      />
    </div>
  );
};

export default MetricCard;
