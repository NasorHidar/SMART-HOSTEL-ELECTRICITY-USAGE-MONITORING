import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';

const CustomTooltip = ({ active, payload, t, formatNumber, language }) => {
  if (!active || !payload?.length) return null;

  // Get the original ISO timestamp from the data point (not the formatted label)
  const original = payload[0]?.payload;
  let timeStr = '';
  try {
    if (original?.timestamp) {
      const date = new Date(original.timestamp);
      timeStr = date.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
        hour12: false
      });
    }
  } catch {
    timeStr = original?.timeLabel || '';
  }

  return (
    <div className="glass-card px-4 py-3 text-sm border-brand-600/40">
      <p className="text-slate-400 mb-1">{timeStr}</p>
      <p className="text-brand-400 font-semibold font-mono">
        {formatNumber(payload[0]?.value, 1)} W
      </p>
      {payload[1] && (
        <p className="text-sky-400 font-mono text-xs">
          {formatNumber(payload[1].value, 1)} V
        </p>
      )}
    </div>
  );
};

const PowerChart = ({ data = [] }) => {
  const { language, t, formatNumber } = useLanguage();

  if (!data.length) {
    return (
      <div className="glass-card p-8 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-slate-400">{t('noChartData')}</p>
          <p className="text-slate-500 text-sm">{t('readingsAppearSoon')}</p>
        </div>
      </div>
    );
  }

  const formattedData = data.map((d) => {
    let timeLabel = '';
    if (d.timestamp) {
      const date = new Date(d.timestamp);
      timeLabel = date.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    return {
      ...d,
      timeLabel,
    };
  });

  const maxPower = Math.max(...data.map((d) => d.power || 0), 100);

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{t('powerConsumption')}</h3>
          <p className="text-slate-400 text-sm">{t('last24HoursAverage')}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full bg-brand-500 inline-block" />
            {t('chartLegendPower')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full bg-sky-500 inline-block" />
            {t('chartLegendVoltage')}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={formattedData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#25a265" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#25a265" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="voltageGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />

          <XAxis
            dataKey="timeLabel"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />

          <YAxis
            yAxisId="power"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            domain={[0, Math.ceil(maxPower * 1.2)]}
            tickFormatter={(v) => `${formatNumber(v)}W`}
          />

          <YAxis
            yAxisId="voltage"
            orientation="right"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            domain={[180, 260]}
            tickFormatter={(v) => `${formatNumber(v)}V`}
          />

          <Tooltip content={<CustomTooltip t={t} formatNumber={formatNumber} language={language} />} />

          {/* Anomaly threshold line at 800W */}
          <ReferenceLine
            yAxisId="power"
            y={800}
            stroke="#f59e0b"
            strokeDasharray="6 3"
            strokeOpacity={0.6}
            label={{ value: t('thresholdLabel'), fill: '#f59e0b', fontSize: 10, position: 'right' }}
          />

          <Area
            yAxisId="power"
            type="monotone"
            dataKey="power"
            stroke="#25a265"
            strokeWidth={2}
            fill="url(#powerGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#25a265', strokeWidth: 0 }}
          />

          <Area
            yAxisId="voltage"
            type="monotone"
            dataKey="voltage"
            stroke="#38bdf8"
            strokeWidth={1.5}
            fill="url(#voltageGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PowerChart;
