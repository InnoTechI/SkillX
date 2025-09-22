'use client';

import { useEffect, useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';

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
    { title: 'Total Orders', value: '1,247', change: '+12%', icon: '📋' },
    { title: 'Revenue', value: '$45,680', change: '+18%', icon: '💰' },
    { title: 'Active Customers', value: '892', change: '+8%', icon: '👥' },
    { title: 'Avg. Completion Time', value: '2.3 days', change: '-15%', icon: '⏱️' }
  ];

  const recentPayments = [
    { id: 'PAY-001', customer: 'John Smith', amount: '$299', date: '2025-01-14', status: 'Completed' },
    { id: 'PAY-002', customer: 'Sarah Johnson', amount: '$199', date: '2025-01-14', status: 'Completed' },
    { id: 'PAY-003', customer: 'Mike Davis', amount: '$399', date: '2025-01-13', status: 'Completed' },
    { id: 'PAY-004', customer: 'Emily Chen', amount: '$249', date: '2025-01-13', status: 'Completed' }
  ];

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <AdminNavigation />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Report Period</h3>
            <select className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 3 months</option>
              <option>Last year</option>
              <option>Custom range</option>
            </select>
            <button className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-700">
              Generate Report
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metricCards.map((metric) => (
            <div key={metric.title} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500">{metric.title}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</div>
                  <div className="text-sm text-green-600 mt-1">{metric.change}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 text-xl">
                  {metric.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Payments */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.customer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Type Chart */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Type Distribution</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm text-gray-700">Executive Resume</span>
                </div>
                <span className="text-sm font-medium text-gray-900">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-700">Entry Level Resume</span>
                </div>
                <span className="text-sm font-medium text-gray-900">30%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-sm text-gray-700">Career Change Resume</span>
                </div>
                <span className="text-sm font-medium text-gray-900">15%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-sm text-gray-700">Technical Resume</span>
                </div>
                <span className="text-sm font-medium text-gray-900">10%</span>
              </div>
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 text-center">
                Chart visualization would be implemented here using a charting library like Chart.js or Recharts
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
