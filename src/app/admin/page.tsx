'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TokenManager } from '@/lib/http';

interface DashboardStats {
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    client: {
      name: string;
      email: string;
    };
    status: string;
    totalAmount: number;
    createdAt: string;
    resumeType: string;
  }>;
  ordersByStatus: {
    pending: number;
    in_progress: number;
    under_review: number;
    completed: number;
    cancelled: number;
  };
}

type OrderItem = {
  id: string;
  customer: string;
  title: string;
  status: 'In Progress' | 'New' | 'Pending Revision' | 'Completed';
  due?: string;
};

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!isAuthenticated || !user) {
      window.location.href = '/login';
      return;
    }

    // Check if user has admin role
    const role = String(user?.role || '').toLowerCase();
    const hasAdminAccess = role === 'admin' || role === 'super_admin';
    
    if (!hasAdminAccess) {
      window.location.href = '/login';
      return;
    }

    fetchDashboardData();
  }, [isAuthenticated, user, authLoading]);

  const fetchDashboardData = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setDashboardData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const role = String(user?.role || '').toLowerCase();
  const hasAdminAccess = role === 'admin' || role === 'super_admin';
  
  if (!hasAdminAccess) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">Loading dashboard...</div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Error loading dashboard: {error}
      </div>
    );
  }

  if (!dashboardData) return null;

  const summary = [
    { 
      label: 'Total Orders', 
      icon: '📋', 
      value: dashboardData.totalOrders.toString(), 
      sub: `${dashboardData.ordersByStatus.pending} pending` 
    },
    { 
      label: 'Orders In Progress', 
      icon: '⏱️', 
      value: dashboardData.ordersByStatus.in_progress.toString(), 
      sub: `${dashboardData.ordersByStatus.under_review} under review` 
    },
    { 
      label: 'Orders Completed', 
      icon: '✅', 
      value: dashboardData.ordersByStatus.completed.toString(), 
      sub: `${dashboardData.ordersByStatus.cancelled} cancelled` 
    },
    { 
      label: 'Total Revenue', 
      icon: '💳', 
      value: `$${dashboardData.totalRevenue.toFixed(2)}`, 
      sub: `from ${dashboardData.totalOrders} orders` 
    }
  ];

  // Convert recent orders to the expected format
  const orders: OrderItem[] = dashboardData.recentOrders.map(order => ({
    id: order.orderNumber,
    customer: order.client.name,
    title: order.resumeType,
    status: mapOrderStatus(order.status),
    due: new Date(order.createdAt).toLocaleDateString()
  }));

  const bottomStats = [
    { 
      label: 'Total Users', 
      value: `${dashboardData.totalUsers} Users`, 
      sub: 'registered in system', 
      icon: '👥' 
    },
    { 
      label: 'Revenue', 
      value: `$${dashboardData.totalRevenue.toFixed(2)}`, 
      sub: 'total earnings', 
      icon: '💲' 
    },
    { 
      label: 'Completion Rate', 
      value: `${Math.round((dashboardData.ordersByStatus.completed / dashboardData.totalOrders) * 100)}%`, 
      sub: 'orders completed', 
      icon: '📈' 
    }
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
            ].map((item) => (
              <a key={item.name}
                 className={`text-sm px-3 py-2 rounded-full ${item.name === 'Dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
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
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summary.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-2">{s.value}</div>
                  <div className="text-[11px] text-gray-500 mt-1">{s.sub}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-blue-200 p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">Recent Orders</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {orders.length > 0 ? orders.map((o) => (
                <li key={o.id} className="px-5 py-4 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">{o.id} {renderStatus(o.status)}</div>
                    <div className="text-sm font-medium text-gray-900">{o.customer}</div>
                    <div className="text-xs text-gray-500">{o.title}</div>
                  </div>
                  <div className="text-[11px] text-gray-500">{o.due ? `Due\n${o.due}` : ''}</div>
                </li>
              )) : (
                <li className="px-5 py-8 text-center text-gray-500">
                  No orders found
                </li>
              )}
            </ul>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
            <div className="text-sm font-semibold text-gray-900 mb-4">Notifications</div>
            <div className="space-y-4 text-sm">
              <Notification dotColor="#EF4444" title="Check recent orders for updates" time="Live" />
              <Notification dotColor="#3B82F6" title="Dashboard refreshed with real data" time="Now" />
              <Notification dotColor="#10B981" title="System connected to database" time="Active" />
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bottomStats.map((b) => (
            <div key={b.label} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">{b.icon}</div>
              <div>
                <div className="text-xs text-gray-500">{b.label}</div>
                <div className="text-xl font-bold text-gray-900">{b.value}</div>
                <div className="text-[11px] text-emerald-600">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function mapOrderStatus(status: string): OrderItem['status'] {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'New';
    case 'in_progress':
      return 'In Progress';
    case 'under_review':
      return 'Pending Revision';
    case 'completed':
      return 'Completed';
    default:
      return 'New';
  }
}

function renderStatus(status: OrderItem['status']) {
  const map: Record<OrderItem['status'], { color: string; label: string }> = {
    'In Progress': { color: 'rgba(98, 127, 248, 1)', label: 'In Progress' },
    'New': { color: 'rgba(98, 127, 248, 1)', label: 'New' },
    'Pending Revision': { color: 'rgba(98, 127, 248, 1)', label: 'Pending Revision' },
    'Completed': { color: 'rgba(98, 127, 248, 1)', label: 'Completed' }
  };
  const item = map[status];
  return (
    <span className="inline-flex items-center gap-1 align-middle ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: item.color, color: 'white' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'white' }} />
      {item.label}
    </span>
  );
}

type NotificationProps = { dotColor: string; title: string; time: string };
function Notification({ dotColor, title, time }: NotificationProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-2">
        <span className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: dotColor }} />
        <div>
          <div className="text-gray-800">{title}</div>
          <div className="text-[11px] text-gray-500">{time}</div>
        </div>
      </div>
    </div>
  );
}