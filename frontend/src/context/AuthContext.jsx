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

  const login = useCallback(async (esp_id, password) => {
    console.log(`[AuthContext] Initiating login flow for Device ID: "${esp_id}"`);
    setLoading(true);
    setError('');
    try {
      const response = await loginByEspId(esp_id, password);
      console.log('[AuthContext] Login successful. Response data:', response.data);

      const { token, user } = response.data;

      localStorage.setItem(STORAGE_TOKEN, token);
      localStorage.setItem(STORAGE_USER, JSON.stringify(user));
      setUser(user);

      console.log('[AuthContext] Stored token and user in localStorage. User set:', user);
      return { success: true };
    } catch (err) {
      console.error('[AuthContext] Login request failed:', err);
      let msg = 'Login failed. Please try again.';

      if (err.response) {
        // The server responded with an error (4xx or 5xx)
        console.error('[AuthContext] Server error response:', err.response.status, err.response.data);
        msg = err.response.data?.message || `Server error (${err.response.status}).`;
      } else if (err.request) {
        // No response received (server offline, network error, CORS, etc.)
        console.error('[AuthContext] Network error or no response received:', err.request);
        msg = 'Network error: Cannot reach the backend server at http://localhost:5000. Please check if the server is running.';
      } else {
        // Request setup error
        console.error('[AuthContext] Request setup error:', err.message);
        msg = err.message;
      }

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
