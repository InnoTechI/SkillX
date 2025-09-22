'use client';

import { useEffect, useState } from 'react';
import { TokenManager } from '@/lib/http';

export default function OrdersPage() {
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

  const orders = [
    { id: 'ORD-001', customer: 'John Smith', email: 'john@email.com', resumeType: 'Executive Resume', status: 'In Progress', payment: 'Confirmed', created: '2025-01-15', due: '2025-01-18' },
    { id: 'ORD-002', customer: 'Sarah Johnson', email: 'sarah@email.com', resumeType: 'Enter level Resume', status: 'New', payment: 'Pending', created: '2025-01-14', due: '2025-01-19' },
    { id: 'ORD-003', customer: 'Mike Davis', email: 'mike@email.com', resumeType: 'Career Change Resume', status: 'Pending Revision', payment: 'Confirmed', created: '2025-01-12', due: '2025-01-17' },
    { id: 'ORD-004', customer: 'Emily Chen', email: 'emily@email.com', resumeType: 'Technical Resume', status: 'Completed', payment: 'Confirmed', created: '2025-01-10', due: '2025-01-15' },
    { id: 'ORD-005', customer: 'Robert Wilson', email: 'robert@email.com', resumeType: 'Manager Resume', status: 'In Progress', payment: 'Confirmed', created: '2025-01-12', due: '2025-01-20' },
    { id: 'ORD-006', customer: 'Lisa Anderson', email: 'lisa@email.com', resumeType: 'Creative Resume', status: 'New', payment: 'Confirmed', created: '2025-01-13', due: '2025-01-22' }
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
                 className={`text-sm px-3 py-2 rounded-full ${item.name === 'Orders' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
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
          <h1 className="text-2xl font-bold text-gray-900">Order</h1>
          <p className="text-gray-600">Manage all resume orders and track progress</p>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
                <input
                  type="text"
                  placeholder="Search by user, order ID, or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
                />
              </div>
            </div>
            <div>
              <select className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black">
                <option>All Status</option>
                <option>New</option>
                <option>In Progress</option>
                <option>Pending Revision</option>
                <option>Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">Order (6)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resume Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor(order.status) }} />
                        {order.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.customer}</div>
                      <div className="text-xs text-gray-500">{order.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {order.resumeType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatus(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.payment === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {order.payment}
                        </span>
                        <span className="text-[11px] text-gray-500">Due: {order.due}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.created}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs">👁️  View</button>
                        <button className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs">💬  Chat</button>
                        <button className="px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs">⋯</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function dotColor(status: string): string {
  if (status === 'New') return '#60A5FA'; // blue
  if (status === 'In Progress') return '#F59E0B'; // amber
  if (status === 'Pending Revision') return '#F97316'; // orange
  if (status === 'Completed') return '#10B981'; // green
  return '#9CA3AF';
}

function renderStatus(status: string) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    'In Progress': { bg: '#FEF3C7', fg: '#B45309', label: 'In Progress' },
    'New': { bg: '#DBEAFE', fg: '#1D4ED8', label: 'New' },
    'Pending Revision': { bg: '#FFEAD5', fg: '#C2410C', label: 'Pending Revision' },
    'Completed': { bg: '#DCFCE7', fg: '#047857', label: 'Completed' }
  };
  const item = map[status] || { bg: '#F3F4F6', fg: '#374151', label: status };
  return (
    <span className="inline-flex items-center gap-1 align-middle text-[11px] font-medium px-3 py-1 rounded-full" style={{ backgroundColor: item.bg, color: item.fg }}>
      {item.label}
    </span>
  );
}
