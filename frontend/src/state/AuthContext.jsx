import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('quizapp_token');
    if (!token) {
      setLoading(false);
      return;
    }
    apiClient
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('quizapp_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userInfo, navigate) => {
    localStorage.setItem('quizapp_token', token);
    setUser(userInfo);

    // Force password reset on first login
    if (userInfo.first_login) {
      navigate('/first-reset');
      return;
    }

    // Normal redirect
    if (userInfo.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };


  const logout = () => {
    localStorage.removeItem('quizapp_token');
    setUser(null);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('quizapp_token');
    if (!token) return;
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data.user);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

