import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext({
  user: null,
  token: null,
  isLoggedIn: false,
  login: () => {},
  logout: () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = useCallback((authUser, authToken) => {
    if (authUser) {
      localStorage.setItem('user', JSON.stringify(authUser));
      setUser(authUser);
    }
    if (authToken) {
      localStorage.setItem('token', authToken);
      setToken(authToken);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === 'user') {
        try {
          setUser(event.newValue ? JSON.parse(event.newValue) : null);
        } catch (error) {
          setUser(null);
        }
      }
      if (event.key === 'token') {
        setToken(event.newValue || null);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoggedIn: Boolean(token),
      login,
      logout
    }),
    [user, token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
