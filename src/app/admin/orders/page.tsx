'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TokenManager } from '@/lib/http';

interface Order {
  _id: string;
  orderNumber: string;
  client: {
    fullName: string;
    email: string;
  };
  serviceType: string;
  status: string;
  pricing: {
    totalAmount: number;
    paymentStatus: string;
  };
  timeline: {
    estimatedCompletion: string;
  };
  createdAt: string;
}

export default function OrdersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Action handlers
  const handleViewOrder = (order: Order) => {
    // Create a detailed view modal or navigate to order details
    alert(`Viewing order ${order.orderNumber}\n\nClient: ${order.client.fullName}\nService: ${order.serviceType}\nStatus: ${order.status}\nAmount: $${order.pricing.totalAmount}`);
  };

  const handleChatWithClient = (order: Order) => {
    // Navigate to messages page with this order selected
    window.location.href = `/admin/messages?order=${order.orderNumber}`;
  };

  const handleOrderActions = (order: Order) => {
    const actions = [];
    
    // Add available actions based on order status
    if (order.status === 'pending') {
      actions.push('Start Review', 'Cancel Order');
    } else if (order.status === 'in_review') {
      actions.push('Approve Payment', 'Request More Info');
    } else if (order.status === 'payment_pending') {
      actions.push('Confirm Payment', 'Send Reminder');
    } else if (order.status === 'in_progress') {
      actions.push('Mark Draft Ready', 'Add Internal Note');
    } else if (order.status === 'draft_ready') {
      actions.push('Send to Client', 'Continue Editing');
    } else if (order.status === 'client_review') {
      actions.push('Mark Completed', 'Request Feedback');
    } else if (order.status === 'revision_requested') {
      actions.push('Start Revision', 'View Revision Details');
    }
    
    actions.push('View Order Details', 'Download Files', 'Export Data');
    
    const action = prompt(`Available actions for ${order.orderNumber}:\n\n${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nEnter action number:`);
    
    if (action && parseInt(action) > 0 && parseInt(action) <= actions.length) {
      const selectedAction = actions[parseInt(action) - 1];
      alert(`Executing: ${selectedAction} for order ${order.orderNumber}`);
      
      // In a real implementation, you would call the appropriate API endpoint here
      if (selectedAction.includes('Payment')) {
        // Handle payment actions
        handlePaymentAction(order._id, selectedAction);
      } else if (selectedAction.includes('Status') || selectedAction.includes('Mark')) {
        // Handle status changes
        handleStatusChange(order._id, selectedAction);
      }
    }
  };

  const handlePaymentAction = async (orderId: string, action: string) => {
    setActionLoading(orderId);
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
          adminNote: `Payment ${action.toLowerCase()} by admin`
        })
      });

      if (response.ok) {
        await fetchOrders(); // Refresh data
        alert('Payment status updated successfully');
      } else {
        alert('Failed to update payment status');
      }
    } catch (err) {
      console.error('Error updating payment:', err);
      alert('Error updating payment status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (orderId: string, action: string) => {
    setActionLoading(orderId);
    try {
      const token = TokenManager.getAccessToken();
      let newStatus = '';
      
      if (action.includes('Draft Ready')) newStatus = 'draft_ready';
      else if (action.includes('Completed')) newStatus = 'completed';
      else if (action.includes('Review')) newStatus = 'in_review';
      
      if (newStatus) {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            status: newStatus,
            adminNote: `Status updated to ${newStatus} by admin`
          })
        });

        if (response.ok) {
          await fetchOrders(); // Refresh data
          alert('Order status updated successfully');
        } else {
          alert('Failed to update order status');
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error updating order status');
    } finally {
      setActionLoading(null);
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

    fetchOrders();
  }, [isAuthenticated, user, authLoading]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = TokenManager.getAccessToken();
      
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data?.orders || []);
      } else {
        setError(data.message || 'Failed to fetch orders');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          Loading orders...
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
            onClick={fetchOrders}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
            <span className="text-sm font-semibold text-gray-900">Orders ({orders.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor(order.status) }} />
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.client?.fullName || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{order.client?.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {order.serviceType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatus(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.pricing?.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {order.pricing?.paymentStatus === 'paid' ? 'Confirmed' : 'Pending'}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Due: {order.timeline?.estimatedCompletion ? new Date(order.timeline.estimatedCompletion).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleViewOrder(order)}
                            disabled={actionLoading === order._id}
                            className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs hover:bg-blue-200 disabled:opacity-50"
                          >
                            👁️ View
                          </button>
                          <button 
                            onClick={() => handleChatWithClient(order)}
                            disabled={actionLoading === order._id}
                            className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs hover:bg-green-200 disabled:opacity-50"
                          >
                            💬 Chat
                          </button>
                          <button 
                            onClick={() => handleOrderActions(order)}
                            disabled={actionLoading === order._id}
                            className="px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoading === order._id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-700"></div>
                            ) : (
                              '⋯'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function dotColor(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': '#60A5FA', // blue
    'in_review': '#60A5FA', // blue  
    'payment_pending': '#F59E0B', // amber
    'in_progress': '#F59E0B', // amber
    'draft_ready': '#8B5CF6', // purple
    'client_review': '#8B5CF6', // purple
    'revision_requested': '#F97316', // orange
    'in_revision': '#F97316', // orange
    'completed': '#10B981', // green
    'delivered': '#10B981', // green
    'cancelled': '#EF4444', // red
    'refunded': '#EF4444' // red
  };
  return statusMap[status] || '#9CA3AF'; // gray default
}

function renderStatus(status: string) {
  const statusMap: Record<string, { bg: string; fg: string; label: string }> = {
    'pending': { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Pending' },
    'in_review': { bg: '#DBEAFE', fg: '#1D4ED8', label: 'In Review' },
    'payment_pending': { bg: '#FEF3C7', fg: '#B45309', label: 'Payment Pending' },
    'in_progress': { bg: '#FEF3C7', fg: '#B45309', label: 'In Progress' },
    'draft_ready': { bg: '#EDE9FE', fg: '#7C3AED', label: 'Draft Ready' },
    'client_review': { bg: '#EDE9FE', fg: '#7C3AED', label: 'Client Review' },
    'revision_requested': { bg: '#FFEDD5', fg: '#C2410C', label: 'Revision Requested' },
    'in_revision': { bg: '#FFEDD5', fg: '#C2410C', label: 'In Revision' },
    'completed': { bg: '#DCFCE7', fg: '#047857', label: 'Completed' },
    'delivered': { bg: '#DCFCE7', fg: '#047857', label: 'Delivered' },
    'cancelled': { bg: '#FEE2E2', fg: '#DC2626', label: 'Cancelled' },
    'refunded': { bg: '#FEE2E2', fg: '#DC2626', label: 'Refunded' }
  };
  
  const item = statusMap[status] || { bg: '#F3F4F6', fg: '#374151', label: status || 'Unknown' };
  return (
    <span 
      className="inline-flex items-center gap-1 align-middle text-[11px] font-medium px-3 py-1 rounded-full" 
      style={{ backgroundColor: item.bg, color: item.fg }}
    >
      {item.label}
    </span>
  );
}
