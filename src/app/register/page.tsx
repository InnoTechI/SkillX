'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthAPI, TokenManager } from '@/lib/http';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const [role, setRole] = useState<'admin' | 'user'>('admin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = role === 'admin' 
        ? await AuthAPI.registerAdmin({
            email,
            password,
            firstName,
            lastName,
            phone,
          })
        : await AuthAPI.registerUser({
            email,
            password,
            firstName,
            lastName,
            phone,
          });
      
      if (response.success && response.data) {
        // Store tokens and user data
        TokenManager.setTokens(response.data.tokens);
        TokenManager.setUser(response.data.user);
        
        // Update auth context
        login(response.data.user);
        
        // Redirect to dashboard or home page
        router.push('/');
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      className="min-h-[80vh] flex items-center justify-center px-6 py-16 text-white"
      style={{ background: 'radial-gradient(69.05% 70.98% at 15.4% 72.36%, rgba(0, 0, 0, 0.92) 37.02%, #202FE9 62.5%, #666666 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl ring-1 ring-gray-200 text-gray-900 relative">
        <Link href="/" className="absolute top-4 left-4 inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors" aria-label="Back to Home">
          <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          <span className="text-sm font-medium">Back</span>
        </Link>

        <div className="mb-8 pt-6">
          <div className="flex justify-center items-center gap-2 mb-4">
            <img src="/logo.png" alt="SkillX" className="h-10 w-auto" />
            <span className="text-2xl font-bold text-gray-900">SkillX</span>
          </div>
          <h1 className="text-3xl font-bold">Create account</h1>
          <p className="text-gray-600">Choose role and fill your details.</p>
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-gray-700 placeholder-gray-500"
                placeholder="John"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-gray-700 placeholder-gray-500"
                placeholder="Doe"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-gray-700 placeholder-gray-500"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-gray-700 placeholder-gray-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-gray-700 placeholder-gray-500"
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : `Create ${role === 'admin' ? 'Admin' : 'User'} account`}
          </button>

          <p className="text-sm text-gray-600 text-center">
            Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
          </p>
        </form>
      </div>
    </section>
  );
}


