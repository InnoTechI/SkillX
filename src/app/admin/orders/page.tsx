'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminNavigation from '@/components/AdminNavigation';

interface Order {
  _id: string;
  orderNumber: string;
  client: {
    _id: string;
    name: string;
    email: string;
  };
  assignedAdmin?: {
    _id: string;
    name: string;
  };
  serviceType: string;
  status: string;
  priority: number;
  urgencyLevel: string;
  pricing: {
    totalAmount: number;
    currency: string;
  };
  timeline: {
    estimatedCompletion: string;
    lastActivity: string;
  };
  createdAt: string;
}

interface OrdersData {
  orders: Order[];
  statistics?: {
    totalOrders: number;
    totalRevenue: number;
    statusBreakdown: { [key: string]: number };
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function OrdersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchOrders = async (page = 1, status = '', search = '') => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const response = await fetch(`/api/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setOrdersData(result.data);
        setOrders(result.data.orders);
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setIsUpdating(orderId);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error(`Failed to update order: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Refresh orders list
        await fetchOrders(currentPage, statusFilter, searchQuery);
      } else {
        throw new Error(result.message || 'Failed to update order');
      }
    } catch (err) {
      console.error('Error updating order:', err);
      alert(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrders(1, statusFilter, searchQuery);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
    fetchOrders(1, status, searchQuery);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchOrders(page, statusFilter, searchQuery);
  };

  const formatServiceType = (serviceType: string) => {
    return serviceType.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'in_review':
        return 'bg-purple-100 text-purple-800';
      case 'payment_pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'draft_ready':
        return 'bg-indigo-100 text-indigo-800';
      case 'client_review':
        return 'bg-pink-100 text-pink-800';
      case 'revision_requested':
        return 'bg-red-100 text-red-800';
      case 'in_revision':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (urgencyLevel: string) => {
    switch (urgencyLevel.toLowerCase()) {
      case 'express':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-orange-100 text-orange-800';
      case 'standard':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role && ['admin', 'super_admin'].includes(user.role)) {
      fetchOrders();
    }
  }, [isAuthenticated, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || !user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Access denied. Admin privileges required.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <AdminNavigation />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-600">Manage and track all resume orders</p>
          
          {/* Statistics Cards */}
          {ordersData?.statistics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-100">
                <div className="text-sm text-gray-500">Total Orders</div>
                <div className="text-2xl font-bold text-gray-900">{ordersData.statistics.totalOrders}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-100">
                <div className="text-sm text-gray-500">Total Revenue</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(ordersData.statistics.totalRevenue)}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-100">
                <div className="text-sm text-gray-500">Active Orders</div>
                <div className="text-2xl font-bold text-gray-900">
                  {Object.entries(ordersData.statistics.statusBreakdown)
                    .filter(([status]) => !['completed', 'delivered', 'cancelled', 'refunded'].includes(status))
                    .reduce((sum, [, count]) => sum + count, 0)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filter and Search */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search orders, customers, or IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="draft_ready">Draft Ready</option>
              <option value="client_review">Client Review</option>
              <option value="revision_requested">Revision Requested</option>
              <option value="in_revision">In Revision</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button 
              onClick={handleSearch}
              className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-700"
            >
              Search
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="text-red-800">Error: {error}</div>
            <button 
              onClick={() => fetchOrders(currentPage, statusFilter, searchQuery)}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-12 text-center">
            <div className="text-gray-500">Loading orders...</div>
          </div>
        ) : (
          <>
            {/* Orders Table */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  All Orders ({ordersData?.pagination.totalItems || 0})
                </h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  Export
                </button>
              </div>
              
              {orders.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No orders found. {statusFilter || searchQuery ? 'Try adjusting your filters.' : ''}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{order.client.name}</div>
                            <div className="text-sm text-gray-500">{order.client.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatServiceType(order.serviceType)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.urgencyLevel)}`}>
                              {order.urgencyLevel.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(order.pricing.totalAmount, order.pricing.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(order.timeline.estimatedCompletion)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button 
                              onClick={() => window.open(`/admin/orders/${order._id}`, '_blank')}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                            
                            {/* Status Update Dropdown */}
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                              disabled={isUpdating === order._id}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_review">In Review</option>
                              <option value="payment_pending">Payment Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="draft_ready">Draft Ready</option>
                              <option value="client_review">Client Review</option>
                              <option value="revision_requested">Revision Requested</option>
                              <option value="in_revision">In Revision</option>
                              <option value="completed">Completed</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            
                            {isUpdating === order._id && (
                              <span className="text-xs text-gray-500">Updating...</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {ordersData?.pagination && ordersData.pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((ordersData.pagination.currentPage - 1) * 10) + 1} to{' '}
                  {Math.min(ordersData.pagination.currentPage * 10, ordersData.pagination.totalItems)} of{' '}
                  {ordersData.pagination.totalItems} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!ordersData.pagination.hasPrevPage}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: ordersData.pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === ordersData.pagination.totalPages || 
                      Math.abs(page - currentPage) <= 2
                    )
                    .map((page, index, array) => {
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && <span className="px-2 text-gray-500">...</span>}
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`px-4 py-2 text-sm border rounded-lg ${
                              page === currentPage
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!ordersData.pagination.hasNextPage}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
