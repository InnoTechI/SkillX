'use client';

import { useState } from 'react';

interface TestResult {
  test: string;
  result: any;
  timestamp: string;
}

export default function TestAuthPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (test: string, result: any) => {
    setResults(prev => [...prev, { test, result, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testUserRegistration = async () => {
    setIsLoading(true);
    const userData = {
      email: `testuser${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890'
    };

    try {
      const response = await fetch('/api/auth/register-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      const result = await response.json();
      addResult('User Registration', { status: response.status, ...result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addResult('User Registration', { error: errorMessage });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const testUserLogin = async () => {
    setIsLoading(true);
    const loginData = {
      email: 'testuser@example.com',
      password: 'password123',
      role: 'user'
    };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      const result = await response.json();
      addResult('User Login', { status: response.status, ...result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addResult('User Login', { error: errorMessage });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const testAdminRegistration = async () => {
    setIsLoading(true);
    const adminData = {
      email: `testadmin${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Admin',
      phone: '+1234567891'
    };

    try {
      const response = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminData)
      });
      
      const result = await response.json();
      addResult('Admin Registration', { status: response.status, ...result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addResult('Admin Registration', { error: errorMessage });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    await testUserRegistration();
    await testUserLogin();
    await testAdminRegistration();
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Auth API Testing</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={testUserRegistration}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test User Registration
        </button>
        
        <button
          onClick={testUserLogin}
          disabled={isLoading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Test User Login
        </button>
        
        <button
          onClick={testAdminRegistration}
          disabled={isLoading}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          Test Admin Registration
        </button>
        
        <button
          onClick={runAllTests}
          disabled={isLoading}
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
        >
          Run All Tests
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <button
          onClick={clearResults}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Clear Results
        </button>
        {isLoading && <div className="text-blue-600">Testing...</div>}
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Test Results ({results.length})</h2>
        
        {results.length === 0 ? (
          <p className="text-gray-600">No tests run yet. Click a button above to start testing.</p>
        ) : (
          <div className="space-y-4">
            {results.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded border">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-lg">{item.test}</h3>
                  <span className="text-sm text-gray-500">{item.timestamp}</span>
                </div>
                <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(item.result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}