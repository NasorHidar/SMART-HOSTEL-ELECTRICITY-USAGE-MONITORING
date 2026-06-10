/**
 * src/context/AuthContext.jsx
 * Global auth state — user info and JWT token.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { loginByEspId } from '../api/api';

const AuthContext = createContext(null);

const STORAGE_TOKEN = 'sm_token';
const STORAGE_USER  = 'sm_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const login = useCallback(async (esp_id) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await loginByEspId(esp_id);
      localStorage.setItem(STORAGE_TOKEN, data.token);
      localStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    setUser(null);
    setError('');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
