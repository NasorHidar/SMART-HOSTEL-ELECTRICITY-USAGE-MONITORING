import React, { memo } from 'react';
import { useLanguage } from '../context/LanguageContext';

const CarbonWidget = ({ dailyKWh = 0, cumulativeKWh = 0 }) => {
  const { t, formatNumber } = useLanguage();

  // Dhaka grid carbon emission factor: 0.475 kg CO2 per kWh
  const EMISSION_FACTOR = 0.475;
  const dailyCO2 = dailyKWh * EMISSION_FACTOR;
  const cumulativeCO2 = cumulativeKWh * EMISSION_FACTOR;

  // 1 standard mature tree absorbs roughly 22 kg of CO2 per year (approx 0.06 kg per day)
  // Let's calculate the daily tree-days of absorption required for daily CO2 footprint
  const treeDaysRequired = dailyCO2 / 0.06;

  return (
    <div
      className="glass-card p-6 flex flex-col gap-5 hover:scale-[1.01] transition-all duration-200 cursor-default"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>🌿</span> {t('carbonFootprintWidgetTitle') || 'Carbon Footprint Calculator'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('carbonFootprintWidgetSub') || 'Estimated impact of your room\'s electrical usage'}
          </p>
        </div>
        <span className="text-3xl text-emerald-400 animate-pulse-slow">🌍</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Footprint */}
        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {t('todaysFootprint') || "Today's Footprint"}
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
            {formatNumber(dailyCO2, 3)} <span className="text-xs font-sans text-slate-500 dark:text-slate-400">kg CO₂</span>
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Based on {formatNumber(dailyKWh, 3)} kWh consumed today
          </span>
        </div>

        {/* Cumulative Footprint */}
        <div className="border border-teal-500/20 bg-teal-500/5 rounded-xl p-4 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            {t('totalFootprint') || 'Total Cumulative Footprint'}
          </span>
          <span className="text-2xl font-bold font-mono text-teal-700 dark:text-teal-300">
            {formatNumber(cumulativeCO2, 2)} <span className="text-xs font-sans text-slate-500 dark:text-slate-400">kg CO₂</span>
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Across {formatNumber(cumulativeKWh, 2)} kWh total energy logs
          </span>
        </div>
      </div>

      {/* Environmental Equivalent */}
      <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <span className="text-3xl">🌳</span>
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t('environmentalEquivalentTitle') || 'Environmental Equivalent'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            It takes{' '}
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              {formatNumber(treeDaysRequired, 1)}
            </span>{' '}
            tree-days to absorb today's carbon emissions. Conserve energy to reduce this!
          </p>
        </div>
      </div>
    </div>
  );
};

export default memo(CarbonWidget);
