'use client';

import { useEffect, useState } from 'react';
import { TokenManager } from '@/lib/http';

export default function RevisionsPage() {
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

  const revisionRequests = [
    { 
      id: 'REV-001', 
      order: 'ORD-001', 
      customer: 'John Smith', 
      request: 'Please add my recent project experience and update the skills section', 
      status: 'Pending', 
      priority: 'High',
      submittedDate: '2025-01-14',
      dueDate: '2025-01-16'
    },
    { 
      id: 'REV-002', 
      order: 'ORD-003', 
      customer: 'Mike Davis', 
      request: 'Change the format to ATS-friendly and update contact information', 
      status: 'In Progress', 
      priority: 'Medium',
      submittedDate: '2025-01-13',
      dueDate: '2025-01-15'
    },
    { 
      id: 'REV-003', 
      order: 'ORD-002', 
      customer: 'Sarah Johnson', 
      request: 'Minor formatting adjustments and add a professional summary', 
      status: 'Completed', 
      priority: 'Low',
      submittedDate: '2025-01-12',
      dueDate: '2025-01-14'
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
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Status</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                    View Order
                  </button>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                    View Original
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {revision.status === 'Pending' && (
                    <>
                      <button className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                        Start Revision
                      </button>
                      <button className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                        Reject
                      </button>
                    </>
                  )}
                  {revision.status === 'In Progress' && (
                    <button className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                      Mark Complete
                    </button>
                  )}
                  {revision.status === 'Completed' && (
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
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
