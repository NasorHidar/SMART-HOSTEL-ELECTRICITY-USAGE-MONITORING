/**
 * src/components/PowerChart.jsx
 * 24-hour power consumption chart using Recharts.
 */

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
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  // Get the original ISO timestamp from the data point (not the formatted label)
  const original = payload[0]?.payload;
  let timeStr = '';
  try {
    if (original?.timestamp) {
      timeStr = format(new Date(original.timestamp), 'HH:mm, MMM d');
    }
  } catch {
    timeStr = original?.timeLabel || '';
  }

  return (
    <div className="glass-card px-4 py-3 text-sm border-brand-600/40">
      <p className="text-slate-400 mb-1">{timeStr}</p>
      <p className="text-brand-400 font-semibold font-mono">
        {payload[0]?.value?.toFixed(1)} W
      </p>
      {payload[1] && (
        <p className="text-sky-400 font-mono text-xs">
          {payload[1].value?.toFixed(1)} V
        </p>
      )}
    </div>
  );
};

const PowerChart = ({ data = [] }) => {
  if (!data.length) {
    return (
      <div className="glass-card p-8 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-slate-400">No chart data yet.</p>
          <p className="text-slate-500 text-sm">Readings will appear once data is collected.</p>
        </div>
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    timeLabel: d.timestamp ? format(new Date(d.timestamp), 'HH:mm') : '',
  }));

  const maxPower = Math.max(...data.map((d) => d.power || 0), 100);

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Power Consumption</h3>
          <p className="text-slate-400 text-sm">Last 24 hours — hourly average</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full bg-brand-500 inline-block" />
            Power (W)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full bg-sky-500 inline-block" />
            Voltage (V)
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
            tickFormatter={(v) => `${v}W`}
          />

          <YAxis
            yAxisId="voltage"
            orientation="right"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            domain={[180, 260]}
            tickFormatter={(v) => `${v}V`}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Anomaly threshold line at 800W */}
          <ReferenceLine
            yAxisId="power"
            y={800}
            stroke="#f59e0b"
            strokeDasharray="6 3"
            strokeOpacity={0.6}
            label={{ value: '⚠ 800W threshold', fill: '#f59e0b', fontSize: 10, position: 'right' }}
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
