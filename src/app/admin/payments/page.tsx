'use client';

import { useEffect, useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';

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
      <AdminNavigation />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payments & Transactions</h1>
          <p className="text-gray-600">Monitor payment transactions and revenue</p>
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
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <div className="flex gap-2">
              <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                <option>All Status</option>
                <option>Completed</option>
                <option>Pending</option>
                <option>Failed</option>
              </select>
              <button className="px-4 py-1 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700">
                Export
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{txn.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.customer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.order}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{txn.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        txn.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        txn.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                      {txn.status === 'Pending' && (
                        <button className="text-green-600 hover:text-green-900">Approve</button>
                      )}
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
