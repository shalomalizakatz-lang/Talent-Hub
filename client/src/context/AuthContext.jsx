import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(null); // null = unknown/loading
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { authenticated } = await api.get('/auth/session');
      setAuthenticated(authenticated);
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (password) => {
    setError('');
    try {
      await api.post('/auth/login', { password });
      setAuthenticated(true);
      return true;
    } catch (err) {
      setError(err.message || 'Login failed');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
