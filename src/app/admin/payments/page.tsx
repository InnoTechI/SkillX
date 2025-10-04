'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TokenManager } from '@/lib/http';

interface PaymentData {
  totalRevenue: number;
  pendingPayments: number;
  pendingCount: number;
  monthlyRevenue: number;
  avgOrderValue: number;
  transactions: Array<{
    id: string;
    customer: string;
    order: string;
    amount: number;
    status: string;
    date: string;
    method: string;
    orderId: string;
    createdAt: string;
  }>;
}

export default function PaymentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Payment action handlers
  const handleConfirmPayment = async (orderId: string, transactionId: string) => {
    setActionLoading(transactionId);
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          'pricing.paymentStatus': 'paid',
          status: 'in_progress'
        })
      });

      if (response.ok) {
        await fetchPaymentData(); // Refresh data
      } else {
        alert('Failed to confirm payment');
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
      alert('Error confirming payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = (orderId: string) => {
    window.open(`/admin/orders?orderId=${orderId}`, '_blank');
  };

  const handleDownloadReceipt = (transactionId: string, orderNumber: string) => {
    // Generate a simple receipt download
    const receiptData = paymentData?.transactions.find(t => t.id === transactionId);
    if (receiptData) {
      const receiptContent = `
Receipt for ${orderNumber}
Customer: ${receiptData.customer}
Amount: $${receiptData.amount}
Date: ${receiptData.date}
Status: ${receiptData.status}
Transaction ID: ${transactionId}
      `.trim();
      
      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${orderNumber}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

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

    fetchPaymentData();
  }, [isAuthenticated, user, authLoading]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const token = TokenManager.getAccessToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('/api/admin/payments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setPaymentData(data.data);
      } else {
        setError('Failed to fetch payment data');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          Loading payments...
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
            onClick={fetchPaymentData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!paymentData) return null;

  const kpiCards = [
    { 
      title: 'Total Revenue', 
      value: `$${paymentData.totalRevenue.toFixed(2)}`, 
      change: 'All time earnings', 
      icon: '�' 
    },
    { 
      title: 'Pending Payments', 
      value: `$${paymentData.pendingPayments.toFixed(2)}`, 
      change: `${paymentData.pendingCount} invoices`, 
      icon: '⏳' 
    },
    { 
      title: 'This Month', 
      value: `$${paymentData.monthlyRevenue.toFixed(2)}`, 
      change: 'Current month', 
      icon: '📈' 
    },
    { 
      title: 'Avg. Order Value', 
      value: `$${paymentData.avgOrderValue.toFixed(2)}`, 
      change: 'Per order', 
      icon: '📊' 
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
                  <div className="text-sm text-gray-600 mt-1">{kpi.change}</div>
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
              <span className="text-sm font-semibold text-gray-900">
                Payment Transactions ({paymentData.transactions.length})
              </span>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                ⬇️ <span>Export</span>
              </button>
            </div>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-gray-100">
            {paymentData.transactions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No transactions found
              </div>
            ) : (
              paymentData.transactions.map((txn) => (
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
                    <div className="text-sm font-semibold text-gray-900">${txn.amount.toFixed(2)}</div>
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
                      <button 
                        onClick={() => handleConfirmPayment(txn.orderId, txn.id)}
                        disabled={actionLoading === txn.id}
                        className="px-4 py-2 rounded-lg text-xs font-medium bg-[rgba(98,127,248,1)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {actionLoading === txn.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          'Confirm Payment'
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewDetails(txn.orderId)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <span>👁️</span>
                          <span>View Details</span>
                        </button>
                        <button 
                          onClick={() => handleDownloadReceipt(txn.id, txn.order)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <span>🧾</span>
                          <span>Receipt</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
