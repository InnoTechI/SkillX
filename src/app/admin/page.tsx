'use client';

import { useEffect, useState } from 'react';

type OrderItem = {
  id: string;
  customer: string;
  title: string;
  status: 'In Progress' | 'New' | 'Pending Revision' | 'Completed';
  due?: string;
};

export default function AdminDashboardPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('authUser');
      if (!raw) {
        setIsAuthorized(false);
        return;
      }
      const user = JSON.parse(raw || '{}');
      const role = String(user?.role || '').toLowerCase();
      const ok = role === 'admin' || role === 'super_admin';
      setIsAuthorized(ok);
      if (!ok) {
        window.location.href = '/login';
      }
    } catch {
      setIsAuthorized(false);
      window.location.href = '/login';
    }
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
    );
  }

  if (!isAuthorized) return null;

  const summary = [
    { label: 'Total Application Today', icon: '📋', value: '12', sub: '+3 from yesterday' },
    { label: 'Resumes In Progress', icon: '⏱️', value: '24', sub: '8 assigned today' },
    { label: 'Resumes Delivered', icon: '✅', value: '156', sub: '+12 this week' },
    { label: 'Pending Payments', icon: '💳', value: '$2,340', sub: '5 invoices pending' }
  ];

  const orders: OrderItem[] = [
    { id: 'ORD-001', customer: 'John Smith', title: 'Executive Resume', status: 'In Progress', due: '2025-01-15' },
    { id: 'ORD-002', customer: 'Sarah Johnson', title: 'Entry level Resume', status: 'New', due: '2025-01-15' },
    { id: 'ORD-003', customer: 'Mike Davis', title: 'Career Change Resume', status: 'Pending Revision', due: '2025-01-15' },
    { id: 'ORD-004', customer: 'Emily Chen', title: 'Technical Resume', status: 'Completed', due: '2025-01-15' }
  ];

  const bottomStats = [
    { label: 'This Month', value: '67 Resumes', sub: '+12% from last month', icon: '📈' },
    { label: 'Active Users', value: '234', sub: '+8 new this week', icon: '👥' },
    { label: 'Revenue', value: '$12,450', sub: '+15% this month', icon: '💲' }
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
                 className={`text-sm px-3 py-2 rounded-full ${item.name === 'Dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
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
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, Alex Johnson! Here's what's happening today.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summary.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-2">{s.value}</div>
                  <div className="text-[11px] text-gray-500 mt-1">{s.sub}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-blue-200 p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">Recent Orders</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {orders.map((o) => (
                <li key={o.id} className="px-5 py-4 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">{o.id} {renderStatus(o.status)}</div>
                    <div className="text-sm font-medium text-gray-900">{o.customer}</div>
                    <div className="text-xs text-gray-500">{o.title}</div>
                  </div>
                  <div className="text-[11px] text-gray-500">{o.due ? `Due\n${o.due}` : ''}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
            <div className="text-sm font-semibold text-gray-900 mb-4">Notifications</div>
            <div className="space-y-4 text-sm">
              <Notification dotColor="#EF4444" title="Payment confirmation needed for ORD-001" time="5 min ago" />
              <Notification dotColor="#3B82F6" title="New message from Sarah Johnson" time="15 min ago" />
              <Notification dotColor="#10B981" title="Resume delivered for ORD-004" time="1 hour ago" />
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bottomStats.map((b) => (
            <div key={b.label} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">{b.icon}</div>
              <div>
                <div className="text-xs text-gray-500">{b.label}</div>
                <div className="text-xl font-bold text-gray-900">{b.value}</div>
                <div className="text-[11px] text-emerald-600">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function renderStatus(status: OrderItem['status']) {
  const map: Record<OrderItem['status'], { color: string; label: string }> = {
    'In Progress': { color: 'rgba(98, 127, 248, 1)', label: 'In Progress' },
    'New': { color: 'rgba(98, 127, 248, 1)', label: 'New' },
    'Pending Revision': { color: 'rgba(98, 127, 248, 1)', label: 'Pending Revision' },
    'Completed': { color: 'rgba(98, 127, 248, 1)', label: 'Completed' }
  };
  const item = map[status];
  return (
    <span className="inline-flex items-center gap-1 align-middle ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: item.color, color: 'white' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'white' }} />
      {item.label}
    </span>
  );
}

type NotificationProps = { dotColor: string; title: string; time: string };
function Notification({ dotColor, title, time }: NotificationProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-2">
        <span className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: dotColor }} />
        <div>
          <div className="text-gray-800">{title}</div>
          <div className="text-[11px] text-gray-500">{time}</div>
        </div>
      </div>
    </div>
  );
}



