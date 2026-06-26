/**
 * src/App.jsx
 *
 * Root component — handles auth-based routing between Login, Dashboard,
 * and Payment pages using a lightweight in-app navigation state.
 * Also handles SSLCommerz gateway return redirects via URL search params.
 */

import { useState, useEffect } from 'react';
import { useAuth }       from './context/AuthContext';
import LoginPage         from './pages/LoginPage';
import DashboardPage     from './pages/DashboardPage';
import PaymentPage       from './pages/PaymentPage';
import PaymentHistory    from './pages/PaymentHistory';
import PaymentSuccess    from './pages/PaymentSuccess';
import PaymentFailed     from './pages/PaymentFailed';
import CarbonDashboardPage from './pages/CarbonDashboardPage';

const App = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  /**
   * On first render, check if the URL contains SSLCommerz gateway return params.
   * The gateway POSTs to the backend webhook, which then redirects the user's
   * browser to the frontend with ?status=success|failed|cancelled.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success')   setCurrentPage('success');
    if (status === 'failed')    setCurrentPage('failed');
    if (status === 'cancelled') setCurrentPage('failed');
  }, []);

  // Navigation handler — cleans the URL when navigating away from return pages
  const handleNavigate = (page) => {
    if (page === 'dashboard') {
      // Remove gateway return params from URL without triggering page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setCurrentPage(page);
  };

  // Unauthenticated
  if (!user) return <LoginPage />;

  // SSLCommerz return pages (need access to URL params)
  const urlParams = new URLSearchParams(window.location.search);

  // Authenticated page routing
  switch (currentPage) {
    case 'payment':
      return <PaymentPage onNavigate={handleNavigate} />;
    case 'history':
      return <PaymentHistory onNavigate={handleNavigate} />;
    case 'success':
      return <PaymentSuccess onNavigate={handleNavigate} urlParams={urlParams} />;
    case 'failed':
      return <PaymentFailed onNavigate={handleNavigate} urlParams={urlParams} />;
    case 'carbon':
      return <CarbonDashboardPage onNavigate={handleNavigate} />;
    default:
      return <DashboardPage onNavigate={handleNavigate} />;
  }
};

export default App;
