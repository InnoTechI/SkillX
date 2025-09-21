'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthUser, TokenManager } from '@/lib/http';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app load
    const savedUser = TokenManager.getUser();
    const hasToken = TokenManager.isAuthenticated();
    
    if (savedUser && hasToken) {
      setUser(savedUser);
    }
    
    setIsLoading(false);
  }, []);

  const login = (userData: AuthUser) => {
    setUser(userData);
  };

  const logout = () => {
    TokenManager.clearAll();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
