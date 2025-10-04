'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TokenManager } from '@/lib/http';

interface RevisionRequest {
  id: string;
  order: string;
  customer: string;
  request: string;
  status: string;
  priority: string;
  submittedDate: string;
  dueDate: string | null;
  feedback?: string;
  adminNotes?: string;
}

interface RevisionsData {
  revisions: RevisionRequest[];
  statistics: {
    totalRevisions: number;
    statusBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
  };
  pagination: {
    currentPage: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function RevisionsPage() {
  const { user, isLoading } = useAuth();
  const [revisionsData, setRevisionsData] = useState<RevisionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Revision action handlers
  const handleRevisionAction = async (revisionId: string, action: string, status?: string) => {
    setActionLoading(revisionId);
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`/api/revisions/${revisionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: status || action,
          adminNotes: action === 'rejected' ? 'Revision request rejected by admin' : undefined
        })
      });

      if (response.ok) {
        await fetchRevisions(); // Refresh data
      } else {
        alert(`Failed to ${action} revision`);
      }
    } catch (err) {
      console.error(`Error ${action} revision:`, err);
      alert(`Error ${action} revision`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewOrder = (orderNumber: string) => {
    window.open(`/admin/orders?search=${orderNumber}`, '_blank');
  };

  const fetchRevisions = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('/api/revisions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch revisions');
      }

      const data = await response.json();
      setRevisionsData(data.data);
    } catch (err: any) {
      console.error('Error fetching revisions:', err);
      setError(err.message || 'Failed to fetch revisions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      if (!['admin', 'super_admin'].includes(user.role)) {
        window.location.href = '/login';
        return;
      }
      fetchRevisions();
    } else if (!isLoading && !user) {
      window.location.href = '/login';
    }
  }, [user, isLoading]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchRevisions();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return null;
  }

  const revisionRequests = revisionsData?.revisions || [];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
                 className={`text-sm px-3 py-2 rounded-full ${item.name === 'Revisions' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
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
          <h1 className="text-2xl font-bold text-gray-900">Revision Requests</h1>
          <p className="text-gray-600">Manage customer revision requests and track progress</p>
        </div>

        {/* Filter and Search */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search revision requests..."
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black">
              <option>All Status</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-black">
              <option>All Priority</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <button className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-700">
              Filter
            </button>
          </div>
        </div>

        {/* Revision Requests */}
        <div className="space-y-4">
          {revisionRequests.map((revision) => (
            <div key={revision.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{revision.id}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      revision.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      revision.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {revision.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      revision.priority === 'High' ? 'bg-red-100 text-red-800' :
                      revision.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {revision.priority} Priority
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Order:</span> {revision.order} | 
                    <span className="font-medium ml-2">Customer:</span> {revision.customer}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Submitted:</span> {revision.submittedDate} | 
                    <span className="font-medium ml-2">Due:</span> {revision.dueDate}
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Revision Request:</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{revision.request}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleViewOrder(revision.order)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                  >
                    View Order
                  </button>
                  <button 
                    onClick={() => window.open(`/orders/${revision.order}/original`, '_blank')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    View Original
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {revision.status === 'Pending' && (
                    <>
                      <button 
                        onClick={() => handleRevisionAction(revision.id, 'start', 'in_progress')}
                        disabled={actionLoading === revision.id}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        {actionLoading === revision.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            <span>Starting...</span>
                          </>
                        ) : (
                          'Start Revision'
                        )}
                      </button>
                      <button 
                        onClick={() => handleRevisionAction(revision.id, 'reject', 'rejected')}
                        disabled={actionLoading === revision.id}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {revision.status === 'In Progress' && (
                    <button 
                      onClick={() => handleRevisionAction(revision.id, 'complete', 'completed')}
                      disabled={actionLoading === revision.id}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                      {actionLoading === revision.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          <span>Completing...</span>
                        </>
                      ) : (
                        'Mark Complete'
                      )}
                    </button>
                  )}
                  {revision.status === 'Completed' && (
                    <button 
                      onClick={() => window.open(`/revisions/${revision.id}/completed`, '_blank')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                    >
                      View Completed
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
