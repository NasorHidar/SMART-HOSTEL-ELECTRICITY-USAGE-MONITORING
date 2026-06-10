import { useState, useEffect } from 'react';
import { acknowledgeAlert } from '../api/api';
import { useLanguage } from '../context/LanguageContext';

const SEVERITY_CONFIG = {
  critical: {
    badge:  'badge-critical',
    icon:   '🔴',
    labelKey: 'critical',
    border: 'border-red-500/40',
    bg:     'bg-red-500/5',
  },
  anomaly: {
    badge:  'badge-anomaly',
    icon:   '⚠️',
    labelKey: 'anomaly',
    border: 'border-amber-500/40',
    bg:     'bg-amber-500/5',
  },
  info: {
    badge:  'badge-info',
    icon:   'ℹ️',
    labelKey: 'info',
    border: 'border-blue-500/40',
    bg:     'bg-blue-500/5',
  },
};

const AlertItem = ({ alert, onAcknowledge }) => {
  const [acking, setAcking] = useState(false);
  const { t, formatNumber, formatDate } = useLanguage();
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.anomaly;

  const handleAck = async () => {
    setAcking(true);
    await onAcknowledge(alert._id);
    setAcking(false);
  };

  return (
    <div
      className={`flex items-start gap-4 rounded-xl border p-4 ${cfg.border} ${cfg.bg} transition-all duration-300 animate-slide-up`}
    >
      <span className="text-xl mt-0.5 shrink-0">{cfg.icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cfg.badge}>{t(cfg.labelKey)}</span>
          {alert.avg_power != null && (
            <span className="text-xs text-slate-400 font-mono">
              {t('avgPower', { power: formatNumber(alert.avg_power, 0) })}
            </span>
          )}
        </div>

        <p className="text-sm text-slate-200 leading-relaxed">{alert.message}</p>

        <p className="text-xs text-slate-500 mt-1.5">
          {alert.createdAt ? formatDate(alert.createdAt) : t('unknownTime')}
        </p>
      </div>

      <button
        id={`ack-btn-${alert._id}`}
        onClick={handleAck}
        disabled={acking}
        className="text-xs text-slate-400 hover:text-slate-200 border border-surface-border
                   hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors duration-150
                   shrink-0 disabled:opacity-50"
      >
        {acking ? '…' : t('dismiss')}
      </button>
    </div>
  );
};

const AlertsPanel = ({ alerts = [], onRefresh }) => {
  const { t, formatNumber } = useLanguage();
  // ✅ Sync via useEffect — never mutate state directly during render
  const [localAlerts, setLocalAlerts] = useState(alerts);

  useEffect(() => {
    setLocalAlerts(alerts);
  }, [alerts]);

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId);
      setLocalAlerts((prev) => prev.filter((a) => a._id !== alertId));
      onRefresh?.();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-100">{t('aiAnomalyAlerts')}</h3>
          {localAlerts.length > 0 && (
            <span className="h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {formatNumber(localAlerts.length)}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">{t('analyzedEvery5m')}</span>
      </div>

      {/* Alert List */}
      {localAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="text-5xl">✅</div>
          <p className="text-slate-400 font-medium">{t('noActiveAlerts')}</p>
          <p className="text-slate-500 text-sm text-center max-w-xs">
            {t('monitoringDescription')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {localAlerts.map((alert) => (
            <AlertItem
              key={alert._id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
