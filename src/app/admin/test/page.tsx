'use client';

import { useEffect, useState } from 'react';
import { TokenManager } from '@/lib/http';

export default function AdminTestPage() {
  const [authStatus, setAuthStatus] = useState<any>(null);

  useEffect(() => {
    const user = TokenManager.getUser();
    const isAuthenticated = TokenManager.isAuthenticated();
    const accessToken = TokenManager.getAccessToken();
    
    setAuthStatus({
      user,
      isAuthenticated,
      hasAccessToken: !!accessToken,
      localStorage: {
        skillx_user: localStorage.getItem('skillx_user'),
        skillx_access_token: localStorage.getItem('skillx_access_token'),
        skillx_refresh_token: localStorage.getItem('skillx_refresh_token')
      }
    });
  }, []);

  const setTestAuth = () => {
    // Set test admin user
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
    
    // Refresh the page to update auth status
    window.location.reload();
  };

  const clearAuth = () => {
    TokenManager.clearAll();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Authentication Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Authentication Status</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(authStatus, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-4">
            <button
              onClick={setTestAuth}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Set Test Admin Authentication
            </button>
            <button
              onClick={clearAuth}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 ml-4"
            >
              Clear Authentication
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Navigation</h2>
          <div className="space-y-2">
            <a href="/admin" className="block px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
              Go to Admin Dashboard
            </a>
            <a href="/login" className="block px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
              Go to Login Page
            </a>
            <a href="/register" className="block px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
              Go to Register Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

