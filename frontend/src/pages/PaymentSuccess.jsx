/**
 * src/pages/PaymentSuccess.jsx
 *
 * Shown after the SSLCommerz gateway redirects back with ?status=success.
 * Reads URL params, optionally verifies with the backend, and shows a receipt.
 * Auto-redirects to dashboard after 10 seconds.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { verifyPayment } from '../api/paymentApi';

const PaymentSuccess = ({ onNavigate, urlParams }) => {
  const { t, formatNumber, formatDate } = useLanguage();

  const transactionId = urlParams.get('transactionId') || '';
  const amount = parseFloat(urlParams.get('amount') || '0');
  const month = urlParams.get('month') || '';

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showReceipt, setShowReceipt] = useState(false);

  // ── Verify transaction with backend ────────────────────────────────────────
  useEffect(() => {
    if (!transactionId) {
      setVerifying(false);
      return;
    }
    const doVerify = async () => {
      try {
        const { data } = await verifyPayment(transactionId);
        setVerified(data.paymentStatus === 'paid');
      } catch {
        // Even if verify call fails, gateway redirected here as success
        setVerified(true);
      } finally {
        setVerifying(false);
      }
    };
    doVerify();
  }, [transactionId]);

  // ── Auto-redirect countdown ─────────────────────────────────────────────
  useEffect(() => {
    if (verifying) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          onNavigate('dashboard');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verifying, onNavigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">

        {verifying ? (
          /* Verifying state */
          <div className="glass-card p-10 flex flex-col items-center gap-4 text-center"
            style={{ boxShadow: '0 0 60px rgba(37,162,101,0.15)' }}>
            <div className="h-16 w-16 rounded-full border-4 border-brand-500/30 border-t-brand-400 animate-spin" />
            <p className="text-slate-700 dark:text-slate-300 font-medium">{t('verifyingPayment')}</p>
            <p className="text-slate-500 dark:text-slate-600 text-sm">{t('verifyingPaymentSub')}</p>
          </div>
        ) : (
          /* Success state */
          <div className="glass-card p-8 flex flex-col items-center gap-5 text-center"
            style={{ boxShadow: '0 0 60px rgba(37,162,101,0.2), 0 4px 24px rgba(0,0,0,0.4)' }}>

            {/* Success Icon */}
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-brand-500/20 border-2 border-brand-500/40 flex items-center justify-center animate-pulse-slow">
                <span className="text-5xl">✅</span>
              </div>
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full border-2 border-brand-400/20 scale-110 animate-ping" style={{ animationDuration: '2s' }} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">{t('paymentSuccessful')}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('paymentSuccessfulSub')}</p>
            </div>

            {/* Amount highlight */}
            {amount > 0 && (
              <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl px-8 py-4 w-full">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('amountPaid')}</p>
                <p className="text-4xl font-bold font-mono text-brand-600 dark:text-brand-400">
                  ৳ {formatNumber(amount, 2)}
                </p>
                {month && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('billingMonth')}: {month}</p>
                )}
              </div>
            )}

            {/* Transaction ID */}
            {transactionId && (
              <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-lg px-4 py-3 text-left border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 mb-1">{t('transactionId')}</p>
                <p className="font-mono text-slate-700 dark:text-slate-300 text-sm break-all">{transactionId}</p>
              </div>
            )}

            {/* Receipt toggle */}
            <button
              id="view-receipt-btn"
              onClick={() => setShowReceipt((v) => !v)}
              className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 underline underline-offset-4 transition-colors"
            >
              {showReceipt ? t('hideReceipt') : t('viewReceipt')} 🧾
            </button>

            {/* Receipt modal */}
            {showReceipt && (
              <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-surface-border rounded-xl p-4 text-left text-sm flex flex-col gap-2 animate-fade-in">
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-surface-border/50">
                  <span className="text-slate-500">{t('device')}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono">—</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-surface-border/50">
                  <span className="text-slate-500">{t('billingMonth')}</span>
                  <span className="text-slate-700 dark:text-slate-300">{month || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-surface-border/50">
                  <span className="text-slate-500">{t('date')}</span>
                  <span className="text-slate-700 dark:text-slate-300">{formatDate(new Date().toISOString())}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">{t('status')}</span>
                  <span className="text-brand-600 dark:text-brand-300 font-semibold">✅ {t('statusPaid')}</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 w-full">
              <button
                id="go-to-dashboard-btn"
                onClick={() => onNavigate('dashboard')}
                className="btn-brand w-full py-3"
              >
                🏠 {t('backToDashboard')}
              </button>
              <button
                id="view-history-from-success-btn"
                onClick={() => onNavigate('history')}
                className="w-full py-3 rounded-xl border border-slate-300 dark:border-surface-border text-sm text-slate-600 dark:text-slate-400
                           hover:text-slate-900 dark:hover:text-white hover:border-slate-500 transition-colors"
              >
                📜 {t('viewPaymentHistory')}
              </button>
            </div>

            {/* Countdown */}
            <p className="text-xs text-slate-600">
              {t('redirectingIn')} {countdown}s...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
