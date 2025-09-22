'use client';

import { useEffect, useState } from 'react';
import { TokenManager } from '@/lib/http';

export default function ReportsPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Temporarily bypass authentication for testing
    setIsAuthorized(true);
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
    );
  }

  if (!isAuthorized) return null;

  const metricCards = [
    { title: 'Total Resumes', value: '234', change: '+12% This Month', icon: '📄' },
    { title: 'Avg. Completion Time', value: '3.2 days', change: '-0.5 days This Month', icon: '⏱️' },
    { title: 'Revenue', value: '$28,450', change: '+18% This Month', icon: '💰' },
    { title: 'Active Clients', value: '67', change: '+8% This Week', icon: '👥' }
  ];

  const monthlyPayments = [
    { month: 'Jan 2025', resumes: 45, revenue: 6750 },
    { month: 'Feb 2025', resumes: 52, revenue: 7800 },
    { month: 'Mar 2025', resumes: 48, revenue: 7200 },
    { month: 'Apr 2025', resumes: 61, revenue: 9150 },
    { month: 'May 2025', resumes: 56, revenue: 8700 },
    { month: 'Jun 2025', resumes: 67, revenue: 10050 }
  ];

  const serviceBreakdown = [
    { label: 'Executive Resume', percent: 38, color: '#84CC16', orders: 45 },
    { label: 'Technical Resume', percent: 27, color: '#8B5CF6', orders: 32 },
    { label: 'Entry Level Resume', percent: 24, color: '#22C55E', orders: 27 },
    { label: 'Career Change Resume', percent: 11, color: '#FB923C', orders: 13 }
  ];

  const recentPayments = [
    { id: 'PAY-001', customer: 'John Smith', amount: '$299', date: '2025-01-14', status: 'Completed' },
    { id: 'PAY-002', customer: 'Sarah Johnson', amount: '$199', date: '2025-01-14', status: 'Completed' },
    { id: 'PAY-003', customer: 'Mike Davis', amount: '$399', date: '2025-01-13', status: 'Completed' },
    { id: 'PAY-004', customer: 'Emily Chen', amount: '$249', date: '2025-01-13', status: 'Completed' }
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
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Transactions</h2>
            <div className="divide-y divide-gray-100">
              {monthlyPayments.map((m) => (
                <div key={m.month} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{m.month}</div>
                    <div className="text-xs text-gray-500">{m.resumes} resumes completed</div>
                  </div>
                  <div className="text-emerald-600 text-sm font-semibold">${m.revenue.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Type Chart */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Type breakdown</h2>
            <div className="space-y-5">
              {serviceBreakdown.map((s) => (
                <div key={s.label} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm text-gray-800">{s.label}</div>
                      <div className="text-sm text-gray-800">{s.percent}%</div>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${s.percent}%`, backgroundColor: s.color }} />
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">{s.orders} orders</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
