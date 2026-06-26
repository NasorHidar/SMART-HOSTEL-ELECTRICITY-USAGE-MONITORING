/**
 * components/carbon/CarbonLeaderboard.jsx
 *
 * Top 10 hostel rooms ranked by monthly energy efficiency.
 * Gold/silver/bronze medals for top 3. Room numbers only (no student names).
 */

import { useLanguage } from '../../context/LanguageContext';

const MEDALS = ['🥇', '🥈', '🥉'];

const TIER_COLORS = {
  excellent: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  good:      { color: 'text-teal-400',    bg: 'bg-teal-500/10',    border: 'border-teal-500/20'    },
  moderate:  { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  high:      { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
};

const ScoreBadge = ({ score, tier }) => {
  const cfg = TIER_COLORS[tier] || TIER_COLORS.moderate;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {score}
    </span>
  );
};

const CarbonLeaderboard = ({ leaderboard = [], currentEspId, loading = false }) => {
  const { t, formatNumber } = useLanguage();

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <div className="h-4 w-44 bg-white/10 rounded mb-4 animate-pulse" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
      style={{ boxShadow: '0 0 24px rgba(251,191,36,0.05), 0 4px 16px rgba(0,0,0,0.4)' }}
    >
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span>🏆</span> {t('leaderboardTitle')}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{t('leaderboardSub')}</p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
          <span className="text-4xl">🏆</span>
          <p className="text-sm">{t('noLeaderboardData')}</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_5rem_6rem_4rem] gap-2 text-[10px] text-slate-500 uppercase tracking-wider px-3 pb-2 border-b border-white/5">
            <span>#</span>
            <span>{t('room')}</span>
            <span className="text-right">{t('kwhLabel')}</span>
            <span className="text-right">{t('co2Label')}</span>
            <span className="text-right">{t('score')}</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5 mt-1">
            {leaderboard.map((entry, idx) => {
              const isMe = entry.esp_id === currentEspId?.toUpperCase();
              return (
                <div
                  key={entry.esp_id}
                  className={`grid grid-cols-[2rem_1fr_5rem_6rem_4rem] gap-2 items-center px-3 py-3 rounded-xl
                    transition-colors duration-150
                    ${isMe
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'hover:bg-white/3'}`}
                >
                  {/* Rank */}
                  <span className="text-base text-center">
                    {idx < 3 ? MEDALS[idx] : (
                      <span className="text-xs text-slate-500 font-mono">{formatNumber(idx + 1)}</span>
                    )}
                  </span>

                  {/* Room */}
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isMe ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {t('room')} {formatNumber(entry.room_number)}
                      {isMe && <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">{t('you')}</span>}
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono">{entry.esp_id}</p>
                  </div>

                  {/* kWh */}
                  <p className="text-right text-xs font-mono text-slate-300">
                    {formatNumber(entry.monthlyKWh, 2)}
                  </p>

                  {/* CO₂ */}
                  <p className="text-right text-xs font-mono text-emerald-400">
                    {formatNumber(entry.monthlyCO2, 3)}
                  </p>

                  {/* Score */}
                  <div className="flex justify-end">
                    <ScoreBadge score={formatNumber(entry.score)} tier={entry.tier} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="text-[10px] text-slate-600 mt-4 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        {t('leaderboardNote')}
      </p>
    </div>
  );
};

export default CarbonLeaderboard;
