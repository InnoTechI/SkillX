'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigationItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: '📊' },
  { name: 'Orders', href: '/admin/orders', icon: '📋' },
  { name: 'Payments', href: '/admin/payments', icon: '💳' },
  { name: 'Revisions', href: '/admin/revisions', icon: '🔄' },
  { name: 'Reports', href: '/admin/reports', icon: '📈' },
  { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

export default function AdminNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="SkillX" className="h-7 w-auto" />
            <span className="text-sm font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              ADMIN PANEL
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Access */}
          <Link
            href="/admin/quick-access"
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Quick Access"
          >
            ⚡
          </Link>

          {/* Notifications */}
          <button
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Notifications"
          >
            🔔
          </button>

          {/* User Menu */}
          <div className="relative group">
            <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium">
                {user?.firstName?.[0]?.toUpperCase() || '👤'}
              </div>
              <span className="hidden sm:block">{user?.fullName || 'Admin'}</span>
              <span className="text-xs">▼</span>
            </button>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="p-2">
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                  {user?.email}
                </div>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  ⚙️ Settings
                </Link>
                <Link
                  href="/admin/test"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  🧪 Test Tools
                </Link>
                <hr className="my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 bg-white">
        <div className="flex overflow-x-auto py-2 px-4 gap-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600'
                }`}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}