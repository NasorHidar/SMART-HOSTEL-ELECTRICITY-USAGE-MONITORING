/**
 * components/carbon/SustainabilityScore.jsx
 *
 * Circular eco-score gauge using SVG arcs with animated fill.
 * Color-coded by tier: Excellent (green) / Good (teal) / Moderate (amber) / High (red).
 */

import { useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const RADIUS = 64;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SustainabilityScore = ({ score, label, tier, loading = false }) => {
  const { t, formatNumber } = useLanguage();
  const arcRef = useRef(null);

  const tierConfig = {
    excellent: { color: '#22c55e', glow: 'rgba(34,197,94,0.35)',  bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  emoji: '🌿' },
    good:      { color: '#10b981', glow: 'rgba(16,185,129,0.35)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', emoji: '👍' },
    moderate:  { color: '#f59e0b', glow: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', emoji: '⚠️' },
    high:      { color: '#ef4444', glow: 'rgba(239,68,68,0.35)',  bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  emoji: '🔴' },
  };

  const cfg = tierConfig[tier] || tierConfig.moderate;
  const safeScore = Math.max(0, Math.min(100, score || 0));
  const progress = CIRCUMFERENCE * (1 - safeScore / 100);

  // Animate arc fill on mount / score change
  useEffect(() => {
    const arc = arcRef.current;
    if (!arc || loading) return;
    arc.style.strokeDashoffset = CIRCUMFERENCE;
    const rAF = requestAnimationFrame(() => {
      arc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)';
      arc.style.strokeDashoffset = progress;
    });
    return () => cancelAnimationFrame(rAF);
  }, [safeScore, loading, progress]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 flex items-center justify-center h-52 animate-pulse">
        <div className="w-32 h-32 rounded-full bg-white/10" />
      </div>
    );
  }

  const labelKey = {
    excellent: 'scoreExcellent',
    good:      'scoreGood',
    moderate:  'scoreModerate',
    high:      'scoreHigh',
  }[tier] || 'scoreModerate';

  return (
    <div
      className="rounded-2xl border p-6 flex flex-col items-center gap-4"
      style={{
        borderColor: cfg.border,
        background:  cfg.bg,
        boxShadow:   `0 0 40px ${cfg.glow}, 0 4px 16px rgba(0,0,0,0.4)`,
      }}
    >
      <div>
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2 justify-center">
          <span>{cfg.emoji}</span> {t('sustainabilityScore')}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 text-center">{t('scoreSub')}</p>
      </div>

      {/* SVG Gauge */}
      <div className="relative flex items-center justify-center">
        <svg width={160} height={160} viewBox="0 0 160 160" className="-rotate-90">
          {/* Track */}
          <circle
            cx={80} cy={80} r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={12}
          />
          {/* Progress arc */}
          <circle
            ref={arcRef}
            cx={80} cy={80} r={RADIUS}
            fill="none"
            stroke={cfg.color}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
            style={{ filter: `drop-shadow(0 0 8px ${cfg.color})` }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-black font-mono" style={{ color: cfg.color }}>
            {formatNumber(safeScore)}
          </span>
          <span className="text-xs text-slate-400">{t('outOf100')}</span>
        </div>
      </div>

      {/* Label badge */}
      <div
        className="px-4 py-1.5 rounded-full text-sm font-semibold border"
        style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
      >
        {t(labelKey)}
      </div>

      {/* Score tiers legend */}
      <div className="w-full grid grid-cols-2 gap-1.5 mt-1">
        {[
          { range: '90–100', key: 'scoreExcellent', color: '#22c55e' },
          { range: '70–89',  key: 'scoreGood',      color: '#10b981' },
          { range: '50–69',  key: 'scoreModerate',  color: '#f59e0b' },
          { range: '0–49',   key: 'scoreHigh',      color: '#ef4444' },
        ].map((r) => (
          <div key={r.key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
            <span>{r.range}: {t(r.key)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SustainabilityScore;
