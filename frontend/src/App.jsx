/**
 * src/App.jsx
 * Root component — handles auth-based routing between Login and Dashboard.
 */

import { useAuth } from './context/AuthContext';
import LoginPage    from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

const App = () => {
  const { user } = useAuth();
  return user ? <DashboardPage /> : <LoginPage />;
};

export default App;
