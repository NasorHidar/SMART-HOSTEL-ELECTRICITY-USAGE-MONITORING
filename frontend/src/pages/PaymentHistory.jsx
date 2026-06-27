/**
 * src/pages/PaymentHistory.jsx
 *
 * Paginated payment history with search and PDF export.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth }     from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getPaymentHistory } from '../api/paymentApi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Status badge helper ───────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    paid:      'bg-brand-500/20 border-brand-500/40 text-brand-600 dark:text-brand-300',
    pending:   'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300',
    failed:    'bg-red-500/20 border-red-500/40 text-red-600 dark:text-red-300',
    cancelled: 'bg-slate-500/20 border-slate-500/40 text-slate-500 dark:text-slate-400',
  };
  const icons = { paid: '✅', pending: '⏳', failed: '❌', cancelled: '⊘' };
  const cls = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
      {icons[status] || '⏳'} {status}
    </span>
  );
};

// ── Method badge ──────────────────────────────────────────────────────────────
const MethodBadge = ({ method }) => {
  const emoji = {
    VISA: '💳', MASTERCARD: '🔴', AMEX: '🟦',
    BKASH: '📱', NAGAD: '🟠', ROCKET: '🚀', UPAY: '💜', OTHER: '💰',
  };
  return (
    <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
      {emoji[method] || '💰'} {method || 'OTHER'}
    </span>
  );
};

const ITEMS_PER_PAGE = 10;

const PaymentHistory = ({ onNavigate }) => {
  const { user }                = useAuth();
  const { t, formatNumber, formatDate, language } = useLanguage();

  const [payments, setPayments]   = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchHistory = useCallback(async (pg = 1, q = '') => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getPaymentHistory(user.esp_id, {
        page: pg, limit: ITEMS_PER_PAGE, search: q,
      });
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, [user.esp_id]);

  useEffect(() => {
    fetchHistory(page, search);
  }, [fetchHistory, page, search]);

  // ── Search submit ─────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  // ── PDF Export ────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Fetch all records for export (no pagination)
      const { data } = await getPaymentHistory(user.esp_id, { limit: 500, search });
      const all = data.payments;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Title
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('Smart Hostel — Payment History', 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Device: ${user.esp_id}  |  Name: ${user.student_name}  |  Room: ${user.room_number}`, 14, 26);
      doc.text(`Exported: ${new Date().toLocaleString('en-US')}`, 14, 32);

      autoTable(doc, {
        startY: 38,
        head: [['Date', 'Billing Month', 'Amount (৳)', 'Method', 'Transaction ID', 'Status']],
        body: all.map((p) => [
          p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-US') : new Date(p.createdAt).toLocaleDateString('en-US'),
          p.billingMonth,
          p.amount.toFixed(2),
          p.paymentMethod || 'OTHER',
          p.transactionId,
          p.paymentStatus.toUpperCase(),
        ]),
        headStyles:  { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      doc.save(`payment-history-${user.esp_id}-${Date.now()}.pdf`);
    } catch (err) {
      setError('Failed to export PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-surface-border bg-white/60 dark:bg-surface-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm flex items-center gap-2"
            id="back-from-history-btn"
          >
            ← {t('backToDashboard')}
          </button>
          <h1 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            📜 {t('paymentHistory')}
          </h1>
          {/* Export PDF */}
          <button
            id="export-pdf-btn"
            onClick={handleExportPDF}
            disabled={exporting || payments.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-surface-border text-sm
                       text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-500 transition-colors disabled:opacity-40"
          >
            {exporting ? (
              <span className="h-4 w-4 rounded-full border-2 border-slate-500 border-t-white animate-spin" />
            ) : (
              <span>📄</span>
            )}
            {t('exportPDF')}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300 flex items-center gap-3">
            <span>⚠️</span><span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        {/* ── Search Bar ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            id="history-search-input"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="input-field flex-1"
          />
          <button type="submit" id="history-search-btn"
            className="btn-brand px-5 py-2.5 text-sm whitespace-nowrap">
            🔍 {t('search')}
          </button>
          {search && (
            <button type="button"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-surface-border text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              ✕
            </button>
          )}
        </form>

        {/* ── Stats Row ─────────────────────────────────────────────────────── */}
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('showing')} {payments.length} {t('of')} {pagination.total} {t('records')}
          {search && <span className="text-brand-600 dark:text-brand-400 ml-2">· {t('filtered')}: "{search}"</span>}
        </div>

        {/* ── Table ──────────────────────────────────────────────────────────── */}
        <div className="glass-card overflow-hidden animate-fade-in">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-brand-500/30 border-t-brand-400 animate-spin" />
              <span className="text-slate-500 text-sm">{t('loading')}...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-16 flex flex-col items-center gap-4 text-center">
              <span className="text-5xl">📭</span>
              <p className="text-slate-400 font-medium">{t('noPaymentHistory')}</p>
              <p className="text-slate-600 text-sm">{t('noPaymentHistorySub')}</p>
              <button
                onClick={() => onNavigate('payment')}
                className="btn-brand px-6 py-2.5 text-sm mt-2"
              >
                💳 {t('payBill')}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-surface-card/60 border-b border-slate-200 dark:border-surface-border">
                    <th className="px-4 py-3.5 font-medium">{t('date')}</th>
                    <th className="px-4 py-3.5 font-medium">{t('billingMonth')}</th>
                    <th className="px-4 py-3.5 font-medium text-right">{t('amount')}</th>
                    <th className="px-4 py-3.5 font-medium">{t('method')}</th>
                    <th className="px-4 py-3.5 font-medium">{t('transactionId')}</th>
                    <th className="px-4 py-3.5 font-medium">{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr
                      key={p._id}
                      className="border-b border-slate-200 dark:border-surface-border/40 hover:bg-slate-50 dark:hover:bg-surface-card/30 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {p.paidAt
                          ? formatDate(p.paidAt)
                          : formatDate(p.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                        {p.billingMonth}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-brand-600 dark:text-brand-400">
                        ৳ {formatNumber(p.amount, 2)}
                      </td>
                      <td className="px-4 py-3.5">
                        <MethodBadge method={p.paymentMethod} />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-500 text-xs truncate max-w-[160px]">
                        {p.transactionId}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={p.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────────── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              id="prev-page-btn"
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-surface-border text-sm text-slate-600 dark:text-slate-400
                         hover:text-slate-900 dark:hover:text-white hover:border-slate-500 disabled:opacity-30 transition-colors"
            >
              ← {t('prev')}
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((pg) => Math.abs(pg - page) <= 2)
              .map((pg) => (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    pg === page
                      ? 'border-brand-500 bg-brand-500/20 text-brand-600 dark:text-brand-300 font-semibold'
                      : 'border-slate-200 dark:border-surface-border text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-500'
                  }`}
                >
                  {pg}
                </button>
              ))}

            <button
              id="next-page-btn"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-surface-border text-sm text-slate-600 dark:text-slate-400
                         hover:text-slate-900 dark:hover:text-white hover:border-slate-500 disabled:opacity-30 transition-colors"
            >
              {t('next')} →
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-surface-border py-4 text-center text-xs text-slate-600">
        {t('hostelElectricityMonitor')} · {t('securePaymentNote')}
      </footer>
    </div>
  );
};

export default PaymentHistory;
