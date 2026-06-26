/**
 * components/carbon/CarbonTrendChart.jsx
 *
 * Recharts AreaChart showing daily CO₂ emissions over the last 30 days.
 * Responsive, dark-mode compatible, mobile-friendly.
 * Tab switcher: CO₂ (kg) vs Energy (kWh).
 */

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useLanguage } from '../../context/LanguageContext';

const CustomTooltip = ({ active, payload, label, language }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-sm px-4 py-3 shadow-xl text-sm">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: {parseFloat(p.value).toFixed(3)} {p.unit}
        </p>
      ))}
    </div>
  );
};

const CarbonTrendChart = ({ data = [], loading = false }) => {
  const { t, language, formatNumber } = useLanguage();
  const [activeTab, setActiveTab] = useState('co2');

  const chartData = useMemo(() =>
    data.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString(
        language === 'bn' ? 'bn-BD' : 'en-US',
        { month: 'short', day: 'numeric' }
      ),
    })),
    [data, language]
  );

  const avgCO2 = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData.reduce((s, d) => s + d.co2, 0) / chartData.length;
  }, [chartData]);

  const tabs = [
    { key: 'co2',  label: t('co2Label'),  unit: 'kg CO₂', color: '#34d399', stroke: '#6ee7b7' },
    { key: 'kwh',  label: t('kwhLabel'),  unit: 'kWh',    color: '#818cf8', stroke: '#a5b4fc' },
  ];
  const tab = tabs.find((t) => t.key === activeTab);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 h-72 animate-pulse">
        <div className="h-4 w-48 bg-white/10 rounded mb-4" />
        <div className="h-full bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
         style={{ boxShadow: '0 0 30px rgba(52,211,153,0.06), 0 4px 24px rgba(0,0,0,0.4)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span>📈</span> {t('carbonTrendTitle')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{t('last30Days')}</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl border border-white/10 bg-slate-800/60 p-1 gap-1">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setActiveTab(tb.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150
                ${activeTab === tb.key
                  ? 'bg-emerald-500/30 text-emerald-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
          <span className="text-4xl">🌱</span>
          <p className="text-sm">{t('noChartData')}</p>
          <p className="text-xs">{t('readingsAppearSoon')}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={tab.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={tab.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(2)}
            />
            <Tooltip
              content={<CustomTooltip language={language} />}
            />
            {activeTab === 'co2' && (
              <ReferenceLine
                y={avgCO2}
                stroke="rgba(251,191,36,0.4)"
                strokeDasharray="4 4"
                label={{ value: `avg ${avgCO2.toFixed(2)}`, fill: '#fbbf24', fontSize: 10 }}
              />
            )}
            <Area
              type="monotone"
              dataKey={activeTab}
              name={tab.label}
              unit={tab.unit}
              stroke={tab.stroke}
              strokeWidth={2}
              fill="url(#carbonGrad)"
              dot={false}
              activeDot={{ r: 4, fill: tab.color, stroke: '#fff', strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: tab.color }} />
          {tab.label}
        </span>
        {activeTab === 'co2' && chartData.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-px border-t border-dashed border-amber-400" />
            {t('averageLabel')}: {formatNumber(avgCO2, 3)} kg CO₂
          </span>
        )}
      </div>
    </div>
  );
};

export default CarbonTrendChart;
