'use client';

import { useEffect } from 'react';
import { TokenManager } from '@/lib/http';

export default function QuickAccessPage() {
  useEffect(() => {
    // Set test admin user for quick access
    const testUser = {
      id: 'test-admin-123',
      email: 'admin@skillx.com',
      firstName: 'Test',
      lastName: 'Admin',
      fullName: 'Test Admin',
      role: 'admin',
      isEmailVerified: true
    };
    
    const testTokens = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresIn: '7d'
    };
    
    TokenManager.setUser(testUser);
    TokenManager.setTokens(testTokens);
    
    // Redirect to admin dashboard
    window.location.href = '/admin';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Setting up admin access...</p>
        <p className="text-sm text-gray-500 mt-2">Redirecting to admin dashboard...</p>
      </div>
    </div>
  );
}

