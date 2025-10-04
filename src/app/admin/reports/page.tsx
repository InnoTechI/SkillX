'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TokenManager } from '@/lib/http';

interface ReportsData {
  metrics: {
    totalResumes: number;
    avgCompletionTime: number;
    revenue: number;
    activeClients: number;
    changes: {
      resumesChange: string;
      completionTimeChange: string;
      revenueChange: string;
      clientsChange: string;
    };
  };
  monthlyPayments: Array<{
    month: string;
    resumes: number;
    revenue: number;
  }>;
  serviceBreakdown: Array<{
    label: string;
    percent: number;
    color: string;
    orders: number;
  }>;
}

export default function ReportsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
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

    fetchReportsData();
  }, [isAuthenticated, user, authLoading]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const token = TokenManager.getAccessToken();
      
      const response = await fetch('/api/admin/reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setReportsData(data.data);
      } else {
        setError(data.message || 'Failed to fetch reports data');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          Loading reports...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const role = String(user?.role || '').toLowerCase();
  const hasAdminAccess = role === 'admin' || role === 'super_admin';
  
  if (!hasAdminAccess) return null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchReportsData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!reportsData) return null;

  const metricCards = [
    { 
      title: 'Total Resumes', 
      value: reportsData.metrics.totalResumes.toString(), 
      change: reportsData.metrics.changes.resumesChange + ' This Month', 
      icon: '�' 
    },
    { 
      title: 'Avg. Completion Time', 
      value: `${reportsData.metrics.avgCompletionTime} days`, 
      change: reportsData.metrics.changes.completionTimeChange + ' This Month', 
      icon: '⏱️' 
    },
    { 
      title: 'Revenue', 
      value: `$${reportsData.metrics.revenue.toLocaleString()}`, 
      change: reportsData.metrics.changes.revenueChange + ' This Month', 
      icon: '💰' 
    },
    { 
      title: 'Active Clients', 
      value: reportsData.metrics.activeClients.toString(), 
      change: reportsData.metrics.changes.clientsChange + ' This Week', 
      icon: '👥' 
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
            ].map((item, idx) => (
              <a key={item.name}
                 className={`text-sm px-3 py-2 rounded-full ${item.name === 'Reports' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
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
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Track performance metrics and generate business insights</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metricCards.map((metric) => (
            <div key={metric.title} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500">{metric.title}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</div>
                  <div className="text-xs text-emerald-600 mt-1">{metric.change}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 text-xl">
                  {metric.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Transactions (Monthly) */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Transactions</h2>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              <div className="pr-4">
                {reportsData.monthlyPayments.map((m) => (
                  <div key={m.month} className="py-3 flex items-center justify-between mr-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{m.month}</div>
                      <div className="text-xs text-gray-500">{m.resumes} resumes completed</div>
                    </div>
                    <div className="text-emerald-600 text-sm font-semibold ml-4 flex-shrink-0">${m.revenue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Service Type Chart */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Type breakdown</h2>
            <div className="space-y-4 flex-1">
              {reportsData.serviceBreakdown.map((s) => (
                <div key={s.label} className="">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-800">{s.label}</div>
                    <div className="text-sm font-semibold text-gray-800">{s.percent}%</div>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${s.percent}%`, backgroundColor: s.color }} />
                  </div>
                  <div className="text-xs text-gray-500">{s.orders} orders</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
