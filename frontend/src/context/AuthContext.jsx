// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(undefined);

const API_BASE = 'http://localhost:3001';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('arena-token'));
  const [isLoading, setIsLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem('arena-token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (res.data.success) {
          setUser(res.data.user);
          setToken(savedToken);
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, []);

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('arena-token');
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { email: email.trim(), password });
      if (!res.data.success) throw new Error(res.data.message);
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('arena-token', res.data.token);
    } catch (err) {
      // axios throws on 4xx/5xx — extract server message from response
      const serverMsg = err.response?.data?.message;
      throw new Error(serverMsg || err.message || 'Login failed.');
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/register`, {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (!res.data.success) throw new Error(res.data.message);
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('arena-token', res.data.token);
    } catch (err) {
      // axios throws on 4xx/5xx — extract server message from response
      const serverMsg = err.response?.data?.message;
      throw new Error(serverMsg || err.message || 'Registration failed.');
    }
  };

  const logout = () => {
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
