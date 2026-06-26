/**
 * src/pages/PaymentPage.jsx
 *
 * Bill payment initiation page.
 * Shows current month's bill breakdown and a payment method selector.
 * Fetches bill data server-side (amount is never taken from client state).
 */

import { useState, useEffect } from 'react';
import { useAuth }     from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentBill, createPayment } from '../api/paymentApi';

// ── Payment method definitions ────────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id: 'VISA',
    label: 'Visa',
    logo: '/payment-logos/visa.svg',
    color: 'from-blue-600 to-blue-800',
    border: 'border-blue-500/40',
    text: 'text-blue-300',
  },
  {
    id: 'MASTERCARD',
    label: 'MasterCard',
    logo: '/payment-logos/mastercard.svg',
    color: 'from-red-700 to-orange-700',
    border: 'border-red-500/40',
    text: 'text-red-300',
  },
  {
    id: 'AMEX',
    label: 'Amex',
    logo: '/payment-logos/amex.svg',
    color: 'from-sky-700 to-sky-900',
    border: 'border-sky-500/40',
    text: 'text-sky-300',
  },
  {
    id: 'BKASH',
    label: 'bKash',
    logo: '/payment-logos/bkash.svg',
    color: 'from-pink-600 to-pink-800',
    border: 'border-pink-500/40',
    text: 'text-pink-300',
  },
  {
    id: 'NAGAD',
    label: 'Nagad',
    logo: '/payment-logos/nagad.svg',
    color: 'from-orange-600 to-red-700',
    border: 'border-orange-500/40',
    text: 'text-orange-300',
  },
  {
    id: 'ROCKET',
    label: 'Rocket',
    logo: '/payment-logos/rocket.svg',
    color: 'from-violet-600 to-violet-900',
    border: 'border-violet-500/40',
    text: 'text-violet-300',
  },
  {
    id: 'UPAY',
    label: 'Upay',
    logo: '/payment-logos/upay.svg',
    color: 'from-purple-600 to-purple-900',
    border: 'border-purple-500/40',
    text: 'text-purple-300',
  },
];

const PaymentPage = ({ onNavigate }) => {
  const { user }                              = useAuth();
  const { t, formatNumber, formatDate, language } = useLanguage();

  const [bill, setBill]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [paying, setPaying]           = useState(false);
  const [error, setError]             = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);

  // ── Load current bill ───────────────────────────────────────────────────────
  useEffect(() => {
    const fetchBill = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await getCurrentBill(user.esp_id);
        setBill(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load bill data.');
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [user.esp_id]);

  // ── Initiate payment ────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!selectedMethod) {
      setError(t('selectPaymentMethod'));
      return;
    }
    setPaying(true);
    setError('');
    try {
      const { data } = await createPayment(user.esp_id);
      // Redirect user to SSLCommerz hosted payment page
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err.response?.data?.message || 'Payment initiation failed.');
      setPaying(false);
    }
  };

  // ── Status badge ─────────────────────────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    const map = {
      paid:     { bg: 'bg-brand-500/20 border-brand-500/40 text-brand-300', label: t('statusPaid'),    icon: '✅' },
      unpaid:   { bg: 'bg-red-500/20 border-red-500/40 text-red-300',       label: t('statusUnpaid'),  icon: '⚠️' },
      partial:  { bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300', label: t('statusPartial'), icon: '🔸' },
    };
    const cfg = map[status] || map.unpaid;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${cfg.bg}`}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-surface-border bg-surface-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2"
              id="back-to-dashboard-btn"
            >
              ← {t('backToDashboard')}
            </button>
          </div>
          <h1 className="font-bold text-slate-100 flex items-center gap-2">
            💳 {t('payBill')}
          </h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300 flex items-center gap-3 animate-fade-in">
            <span>⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        {/* ── Bill Summary Card ─────────────────────────────────────────────── */}
        <div className="glass-card p-6 flex flex-col gap-5 animate-fade-in"
          style={{ boxShadow: '0 0 40px rgba(56,189,248,0.07), 0 4px 24px rgba(0,0,0,0.4)' }}>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                ⚡ {t('currentBill')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {loading ? '...' : bill?.billingMonth} · {user.esp_id}
              </p>
            </div>
            {!loading && bill && <StatusBadge status={bill.paymentStatus} />}
          </div>

          {loading ? (
            /* Loading skeleton */
            <div className="flex flex-col gap-3 animate-pulse">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 rounded-xl bg-surface-border/50" />
              ))}
            </div>
          ) : bill ? (
            <>
              {/* Bill breakdown rows */}
              <div className="flex flex-col gap-2">
                {/* Energy Charge */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/50 border border-surface-border">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    ⚡ {t('energyCharge')}
                    <span className="text-xs text-slate-600">
                      ({formatNumber(bill.monthlyKWh, 3)} kWh)
                    </span>
                  </span>
                  <span className="font-mono font-semibold text-sky-400">
                    ৳ {formatNumber(bill.energyCharge, 2)}
                  </span>
                </div>

                {/* Demand Charge */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/50 border border-surface-border">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    📊 {t('demandCharge')}
                    <span className="text-xs text-slate-600">({t('flatRate')})</span>
                  </span>
                  <span className="font-mono font-semibold text-amber-400">
                    ৳ {formatNumber(bill.demandCharge, 2)}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-surface-border my-1" />

                {/* Total */}
                <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-brand-500/30 bg-brand-500/10">
                  <span className="font-semibold text-slate-200 flex items-center gap-2">
                    💰 {t('totalPayable')}
                  </span>
                  <span className="font-mono font-bold text-2xl text-brand-400">
                    ৳ {formatNumber(bill.totalAmount, 2)}
                  </span>
                </div>
              </div>

              {/* Last payment info */}
              {bill.lastPaymentDate && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span>🕒</span>
                  {t('lastPaymentDate')}: {formatDate(bill.lastPaymentDate)}
                  {bill.lastTransactionId && (
                    <span className="font-mono text-slate-600 ml-1">
                      · {bill.lastTransactionId}
                    </span>
                  )}
                </p>
              )}

              {/* Already Paid Banner */}
              {bill.isPaid ? (
                <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 px-5 py-4 flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-brand-300">{t('billAlreadyPaid')}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t('billAlreadyPaidSub')}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* ── Payment Method Selector ───────────────────────────────── */}
                  <div className="relative">
                    {/* Processing Overlay */}
                    {paying && (
                      <div className="absolute inset-0 z-10 rounded-xl bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center animate-fade-in">
                        <div className="bg-slate-800/80 px-4 py-2 rounded-lg border border-surface-border text-sm font-medium text-slate-200 flex items-center gap-3 shadow-xl">
                          <span className="h-4 w-4 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
                          Processing...
                        </div>
                      </div>
                    )}
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">
                      {t('selectPaymentMethod')}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method.id}
                          id={`method-${method.id.toLowerCase()}`}
                          onClick={() => setSelectedMethod(method.id)}
                          disabled={paying}
                          className={`
                            relative flex flex-col items-center justify-center gap-2
                            rounded-xl border py-4 px-3 transition-all duration-300 ease-out outline-none
                            focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
                            ${paying ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-lg'}
                            ${selectedMethod === method.id
                              ? `bg-gradient-to-br ${method.color} ${method.border} scale-[1.02] shadow-xl ring-1 ring-white/20`
                              : 'border-surface-border bg-slate-900/40 hover:border-slate-500 hover:bg-slate-800/50'
                            }
                          `}
                        >
                          <img src={method.logo} alt={method.label} className="h-8 w-auto object-contain drop-shadow-md" />
                          <span className={`text-xs font-semibold tracking-wide ${selectedMethod === method.id ? 'text-white' : 'text-slate-400'}`}>
                            {method.label}
                          </span>
                          {selectedMethod === method.id && (
                            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pay Now Button */}
                  <button
                    id="pay-now-btn"
                    onClick={handlePay}
                    disabled={paying || !selectedMethod}
                    className={`btn-brand w-full flex items-center justify-center gap-3 py-4 text-base transition-all duration-300 ${paying ? 'opacity-80 cursor-wait shadow-none transform-none' : ''}`}
                  >
                    {paying ? (
                      <>
                        <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Initiating Secure Payment...
                      </>
                    ) : (
                      <>
                        <span>🔒</span>
                        {t('payNow')} — ৳ {formatNumber(bill.totalAmount, 2)}
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-600">
                    🔐 {t('securePaymentNote')}
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6">{t('noBillData')}</p>
          )}
        </div>

        {/* View History Link */}
        <div className="text-center">
          <button
            id="view-history-btn"
            onClick={() => onNavigate('history')}
            className="text-sm text-slate-400 hover:text-brand-400 transition-colors underline underline-offset-4"
          >
            {t('viewPaymentHistory')} →
          </button>
        </div>
      </main>

      <footer className="border-t border-surface-border py-4 text-center text-xs text-slate-600">
        {t('securePaymentFooter')}
      </footer>
    </div>
  );
};

export default PaymentPage;
