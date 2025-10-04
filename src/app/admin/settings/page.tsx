'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TokenManager } from '@/lib/http';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  profileImage?: string;
  isEmailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    timezone: string;
    language: string;
  };
}

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUserProfile = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('/api/user/details', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      if (data.success) {
        setUserProfile(data.data.user);
      } else {
        throw new Error(data.message || 'Failed to fetch user profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !user) {
      window.location.href = '/login';
      return;
    }

    const role = String(user?.role || '').toLowerCase();
    const hasAdminAccess = role === 'admin' || role === 'super_admin';
    
    if (!hasAdminAccess) {
      window.location.href = '/login';
      return;
    }

    fetchUserProfile();
  }, [isAuthenticated, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          Loading settings...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchUserProfile();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'delivery', name: 'Delivery', icon: '🚚' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'appearance', name: 'Appearance', icon: '🎨' },
    { id: 'permissions', name: 'Permissions', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      {/* Top Nav */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SkillX" className="h-7 w-auto" />
            <span className="text-sm font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700">SKILL X</span>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {[
              { name: 'Dashboard', href: '/admin' },
              { name: 'Orders', href: '/admin/orders' },
              { name: 'Messages', href: '/admin/messages' },
              { name: 'Payments', href: '/admin/payments' },
              { name: 'Revisions', href: '/admin/revisions' },
              { name: 'Reports', href: '/admin/reports' },
              { name: 'Settings', href: '/admin/settings' }
            ].map((item, idx) => (
              <a key={item.name}
                 className={`text-sm px-3 py-2 rounded-full ${item.name === 'Settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
                 href={item.href}>
                {item.name}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-gray-500">
            <button aria-label="notifications">🔔</button>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">👤</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
        {/* Horizontal tabs */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex items-center gap-4 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${
                  activeTab === tab.id
                    ? 'bg-gray-100 text-gray-900 border-gray-200'
                    : 'text-gray-600 hover:bg-gray-50 border-transparent'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="text-sm font-medium">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left profile summary */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-[#E5E7EB] flex items-center justify-center text-2xl font-bold text-indigo-700 select-none">
                  {userProfile?.firstName?.charAt(0)?.toUpperCase() || 'U'}{userProfile?.lastName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="mt-3 font-semibold text-gray-900">
                  {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Loading...'}
                </div>
                <span className="mt-2 inline-flex px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 capitalize">
                  {userProfile?.role || 'User'}
                </span>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Email:</span>
                  <span className="text-gray-900">{userProfile?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phone:</span>
                  <span className="text-gray-900">{userProfile?.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Email Verified:</span>
                  <span className={`${userProfile?.isEmailVerified ? 'text-green-600' : 'text-red-600'}`}>
                    {userProfile?.isEmailVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Joined On:</span>
                  <span className="text-gray-900">
                    {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Last Login:</span>
                  <span className="text-gray-900">
                    {userProfile?.lastLogin ? new Date(userProfile.lastLogin).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right content card */}
          <section className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Settings</h2>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setSaving(true);
                    setError(null);
                    
                    try {
                      const formData = new FormData(e.currentTarget);
                      const profileData = {
                        firstName: formData.get('firstName') as string,
                        lastName: formData.get('lastName') as string,
                        email: formData.get('email') as string,
                        phone: formData.get('phone') as string
                      };

                      const token = TokenManager.getAccessToken();
                      const response = await fetch('/api/user/details', {
                        method: 'PUT',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(profileData)
                      });

                      const result = await response.json();
                      
                      if (result.success) {
                        setUserProfile(result.data.user);
                        // Show success message
                        alert('Profile updated successfully!');
                      } else {
                        throw new Error(result.message || 'Failed to update profile');
                      }
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to update profile');
                      alert('Failed to update profile. Please try again.');
                    } finally {
                      setSaving(false);
                    }
                  }} className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-2xl">
                          {userProfile?.firstName?.charAt(0)?.toUpperCase() || '👤'}
                          {userProfile?.lastName?.charAt(0)?.toUpperCase() || ''}
                        </span>
                      </div>
                      <div>
                        <button type="button" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                          Change Photo
                        </button>
                        <p className="text-sm text-gray-500 mt-1">JPG, PNG up to 2MB</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                        <input
                          type="text"
                          defaultValue={userProfile?.firstName || ''}
                          name="firstName"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        <input
                          type="text"
                          defaultValue={userProfile?.lastName || ''}
                          name="lastName"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          defaultValue={userProfile?.email || ''}
                          name="email"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input
                          type="tel"
                          defaultValue={userProfile?.phone || ''}
                          name="phone"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <div className="inline-flex px-3 py-1 rounded-full bg-lime-100 text-lime-700 text-xs font-medium capitalize">
                          {userProfile?.role || 'User'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          userProfile?.isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {userProfile?.isEmailVerified ? 'Verified' : 'Pending Verification'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Joined</label>
                        <input
                          type="text"
                          value={userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'}
                          disabled
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Login</label>
                        <input
                          type="text"
                          value={userProfile?.lastLogin ? new Date(userProfile.lastLogin).toLocaleString() : 'N/A'}
                          disabled
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit"
                        disabled={saving}
                        className="w-full h-10 bg-[rgba(98,127,248,1)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
                          />
                        </div>
                        <button className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-700">
                          Update Password
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                        </div>
                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                          Enable 2FA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Email Notifications</h3>
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Push Notifications</h3>
                        <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Order Updates</h3>
                        <p className="text-sm text-gray-600">Get notified about order status changes</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Billing & Subscription</h2>
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Current Plan</h3>
                      <p className="text-2xl font-bold text-gray-900 mb-1">Professional Plan</p>
                      <p className="text-sm text-gray-600">$99/month • Billed monthly</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                            <span className="text-white text-sm">💳</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                            <p className="text-sm text-gray-600">Expires 12/25</p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                          Update
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Billing History</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">January 2025</p>
                            <p className="text-sm text-gray-600">Professional Plan</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">$99.00</p>
                            <p className="text-sm text-green-600">Paid</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">December 2024</p>
                            <p className="text-sm text-gray-600">Professional Plan</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">$99.00</p>
                            <p className="text-sm text-green-600">Paid</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
