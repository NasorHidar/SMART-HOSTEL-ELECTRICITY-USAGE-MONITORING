/**
 * src/pages/PaymentFailed.jsx
 *
 * Shown when SSLCommerz redirects back with ?status=failed|cancelled.
 * Displays the failure reason and offers retry / dashboard navigation.
 */

import { useLanguage } from '../context/LanguageContext';

const REASON_MAP = {
  missing_tran_id: 'Transaction reference was missing.',
  not_found:       'Transaction record was not found in the system.',
  server_error:    'A server error occurred during verification.',
};

const PaymentFailed = ({ onNavigate, urlParams }) => {
  const { t } = useLanguage();

  const status        = urlParams.get('status') || 'failed';
  const reason        = urlParams.get('reason') || '';
  const transactionId = urlParams.get('transactionId') || '';
  const isCancelled   = status === 'cancelled';

  const readableReason = REASON_MAP[reason] || null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div
          className="glass-card p-8 flex flex-col items-center gap-5 text-center"
          style={{
            boxShadow: isCancelled
              ? '0 0 50px rgba(100,116,139,0.15), 0 4px 24px rgba(0,0,0,0.4)'
              : '0 0 50px rgba(239,68,68,0.15), 0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          {/* Icon */}
          <div className={`h-24 w-24 rounded-full flex items-center justify-center
            ${isCancelled
              ? 'bg-slate-500/20 border-2 border-slate-500/40'
              : 'bg-red-500/20 border-2 border-red-500/40'
            }`}>
            <span className="text-5xl">{isCancelled ? '⊘' : '❌'}</span>
          </div>

          {/* Title */}
          <div>
            <h1 className={`text-2xl font-bold ${isCancelled ? 'text-slate-300' : 'text-red-300'}`}>
              {isCancelled ? t('paymentCancelled') : t('paymentFailed')}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isCancelled ? t('paymentCancelledSub') : t('paymentFailedSub')}
            </p>
          </div>

          {/* Reason */}
          {readableReason && (
            <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-left">
              <p className="text-xs text-red-400 font-medium mb-1">Reason</p>
              <p className="text-sm text-slate-300">{readableReason}</p>
            </div>
          )}

          {/* Transaction ID */}
          {transactionId && (
            <div className="w-full bg-slate-900/50 rounded-lg px-4 py-3 text-left">
              <p className="text-xs text-slate-500 mb-1">{t('transactionId')}</p>
              <p className="font-mono text-slate-400 text-sm break-all">{transactionId}</p>
            </div>
          )}

          {/* Suggestions */}
          <div className="w-full bg-slate-900/40 border border-surface-border rounded-xl p-4 text-left text-sm">
            <p className="text-slate-400 font-medium mb-2">{t('whatToDoNext')}</p>
            <ul className="flex flex-col gap-1.5">
              {[
                t('tryAgainSuggestion'),
                t('checkBalanceSuggestion'),
                t('contactSupportSuggestion'),
              ].map((tip, i) => (
                <li key={i} className="text-slate-500 flex items-start gap-2">
                  <span className="text-brand-400 mt-0.5">•</span> {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full">
            <button
              id="retry-payment-btn"
              onClick={() => onNavigate('payment')}
              className="btn-brand w-full py-3"
            >
              🔄 {t('retryPayment')}
            </button>
            <button
              id="back-to-dashboard-failed-btn"
              onClick={() => onNavigate('dashboard')}
              className="w-full py-3 rounded-xl border border-surface-border text-sm text-slate-400
                         hover:text-white hover:border-slate-500 transition-colors"
            >
              🏠 {t('backToDashboard')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
