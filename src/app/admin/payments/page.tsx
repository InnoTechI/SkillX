'use client';

import { useEffect, useState } from 'react';
import { TokenManager } from '@/lib/http';

export default function PaymentsPage() {
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

  const kpiCards = [
    { title: 'Total Revenue', value: '$24,580', change: '+12%', icon: '💰' },
    { title: 'Pending Payments', value: '$2,340', change: '5 invoices', icon: '⏳' },
    { title: 'This Month', value: '$8,920', change: '+8%', icon: '📈' },
    { title: 'Avg. Order Value', value: '$156', change: '+5%', icon: '📊' }
  ];

  const transactions = [
    { id: 'TXN-001', customer: 'John Smith', order: 'ORD-001', amount: '$299', status: 'Completed', date: '2025-01-14', method: 'Credit Card' },
    { id: 'TXN-002', customer: 'Sarah Johnson', order: 'ORD-002', amount: '$199', status: 'Pending', date: '2025-01-14', method: 'PayPal' },
    { id: 'TXN-003', customer: 'Mike Davis', order: 'ORD-003', amount: '$399', status: 'Completed', date: '2025-01-13', method: 'Bank Transfer' },
    { id: 'TXN-004', customer: 'Emily Chen', order: 'ORD-004', amount: '$249', status: 'Failed', date: '2025-01-13', method: 'Credit Card' }
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
                 className={`text-sm px-3 py-2 rounded-full ${item.name === 'Payments' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
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
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Track and manage all payment transactions</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpiCards.map((kpi) => (
            <div key={kpi.title} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500">{kpi.title}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-2">{kpi.value}</div>
                  <div className="text-sm text-green-600 mt-1">{kpi.change}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 text-xl">
                  {kpi.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">Payment Transactions</span>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                ⬇️ <span>Export</span>
              </button>
            </div>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-gray-100">
            {transactions.map((txn) => (
              <div key={txn.id} className="px-6 py-5 flex items-center gap-6 justify-between">
                {/* ID + order */}
                <div className="min-w-[180px]">
                  <div className="text-sm font-semibold text-gray-900">{txn.id}</div>
                  <div className="text-[11px] text-gray-500">{txn.order}</div>
                </div>

                {/* Customer */}
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm text-gray-900">{txn.customer}</div>
                </div>

                {/* Amount + method */}
                <div className="min-w-[160px] text-left">
                  <div className="text-sm font-semibold text-gray-900">{txn.amount}</div>
                  <div className="text-[11px] text-gray-500">{txn.method}</div>
                </div>

                {/* Status + date + receipt note */}
                <div className="min-w-[260px] flex items-center gap-6">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                      txn.status === 'Completed'
                        ? 'bg-green-100 text-green-800'
                        : txn.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${
                        txn.status === 'Completed'
                          ? 'bg-green-500'
                          : txn.status === 'Pending'
                          ? 'bg-yellow-400'
                          : 'bg-red-500'
                      }`}
                    />
                    {txn.status}
                  </span>
                  <div className="text-[11px] text-gray-500">{txn.date}</div>
                  <div className="text-[11px] text-gray-500 hidden md:block">
                    {txn.status === 'Pending' ? 'No Receipt' : 'Receipt Available'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {txn.status === 'Pending' ? (
                    <button className="px-4 py-2 rounded-lg text-xs font-medium bg-[rgba(98,127,248,1)] text-white hover:opacity-90">
                      Confirm Payment
                    </button>
                  ) : (
                    <>
                      <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-gray-100 text-gray-700 hover:bg-gray-200">
                        <span>👁️</span>
                        <span>View Details</span>
                      </button>
                      <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-gray-100 text-gray-700 hover:bg-gray-200">
                        <span>🧾</span>
                        <span>Receipt</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
