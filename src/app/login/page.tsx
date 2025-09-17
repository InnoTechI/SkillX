'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [role, setRole] = useState<'admin' | 'user'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (role === 'user') {
      setError('User login is not enabled yet. Please use Admin.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Login failed');
      }
      try {
        localStorage.setItem('accessToken', data.data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
        localStorage.setItem('authUser', JSON.stringify(data.data.user));
      } catch {}
      const r = String(data?.data?.user?.role || '').toLowerCase();
      window.location.href = r === 'admin' || r === 'super_admin' ? '/admin' : '/';
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="min-h-[80vh] flex items-center justify-center px-6 py-16 text-white"
      style={{ background: 'radial-gradient(69.05% 70.98% at 15.4% 72.36%, rgba(0, 0, 0, 0.92) 37.02%, #202FE9 62.5%, #666666 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl ring-1 ring-gray-200 text-gray-900 relative">
        <a href="/" className="absolute top-4 left-4 inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors" aria-label="Back to Home">
          <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          <span className="text-sm font-medium">Back</span>
        </a>

        <div className="mb-8 pt-6">
          <div className="flex justify-center items-center gap-2 mb-4">
            <img src="/logo.png" alt="SkillX" className="h-10 w-auto" />
            <span className="text-2xl font-bold text-gray-900">SkillX</span>
          </div>
          <h1 className="text-3xl font-bold">Sign in</h1>
          <p className="text-gray-600">Choose your role and enter your details.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`px-4 py-2 rounded-xl font-medium ${role === 'admin' ? 'bg-gray-900 text-white' : 'text-gray-700'}`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setRole('user')}
            className={`px-4 py-2 rounded-xl font-medium ${role === 'user' ? 'bg-gray-900 text-white' : 'text-gray-700'}`}
          >
            User
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-gray-700 placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-gray-700 placeholder-gray-500"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-700 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : `Continue as ${role === 'admin' ? 'Admin' : 'User'}`}
          </button>

          <p className="text-sm text-gray-600 text-center">
            New here? <a href="/register" className="text-blue-600 hover:underline">Create an account</a>
          </p>
        </form>
      </div>
    </section>
  );
}


