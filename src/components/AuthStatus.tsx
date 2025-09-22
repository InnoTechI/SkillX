'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function AuthStatus() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="text-sm text-gray-600">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-4">
        <a
          href="/login"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          Log In
        </a>
        <a
          href="/register"
          className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
        >
          Register
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm">
        <span className="text-gray-600">Welcome, </span>
        <span className="font-medium text-gray-900">{user?.fullName}</span>
        <span className="text-xs text-gray-500 ml-2">({user?.role})</span>
      </div>
      <button
        onClick={logout}
        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
