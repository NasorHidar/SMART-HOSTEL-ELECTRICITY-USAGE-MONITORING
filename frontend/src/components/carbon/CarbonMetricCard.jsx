/**
 * components/carbon/CarbonMetricCard.jsx
 *
 * Animated glassmorphism metric card for carbon data.
 * Design matches existing MetricCard.jsx aesthetic.
 */

import { useEffect, useRef } from 'react';

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
  const cardRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const onMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * -12;
      card.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${y}deg) scale(1.02)`;
    };
    const onMouseLeave = () => {
      card.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)';
    };

    card.addEventListener('mousemove', onMouseMove);
    card.addEventListener('mouseleave', onMouseLeave);
    return () => {
      card.removeEventListener('mousemove', onMouseMove);
      card.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  const isLoading = value == null;

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5
                 flex flex-col gap-3 overflow-hidden cursor-default
                 transition-transform duration-200 ease-out"
      style={{ boxShadow: `0 0 24px ${glow}, 0 4px 16px rgba(0,0,0,0.4)` }}
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
          <div className="h-7 w-3/4 rounded-lg bg-white/10 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
        </div>
      ) : (
        <div>
          <div className={`text-2xl font-bold font-mono ${color} leading-none`}>
            {value}
            <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">{subtitle}</p>
          )}
        </div>
      )}

      {/* Label */}
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
};

export default CarbonMetricCard;
