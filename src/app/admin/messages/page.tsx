'use client';

import { useEffect, useState } from 'react';

export default function MessagesPage() {
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

  const conversations = [
    {
      id: 'CONV-001',
      customer: 'John Smith',
      lastMessage: 'Can you please update my resume with the new project experience?',
      timestamp: '5 min ago',
      unread: true,
      unreadCount: 2,
      status: 'active'
    },
    {
      id: 'CONV-002',
      customer: 'Sarah Johnson',
      lastMessage: 'Thank you for the quick turnaround on my resume!',
      timestamp: '15 min ago',
      unread: true,
      unreadCount: 1,
      status: 'resolved'
    },
    {
      id: 'CONV-003',
      customer: 'Mike Davis',
      lastMessage: 'I need some clarification on the career change section',
      timestamp: '1 hours ago',
      unread: false,
      unreadCount: 0,
      status: 'active'
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
                 className={`text-sm px-3 py-2 rounded-full ${item.name === 'Messages' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
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
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">Communicate with your clients</p>
        </div>

        {/* Messages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">Conversations</h2>
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Search conversation...."
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <div key={conv.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                        {conv.customer.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{conv.customer}</div>
                          {conv.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">{conv.unreadCount}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500">{conv.id}</div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">{conv.lastMessage}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-500 whitespace-nowrap ml-2">{conv.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">John Smith</h3>
                <p className="text-sm text-gray-500">ORD-001 • Executive Resume</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Active
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 space-y-5 max-h-96 overflow-y-auto">
              {/* Customer bubble */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">👤</div>
                <div className="max-w-xl">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-900">Hi! I wanted to check on the progress of my resume. Could you please provide an update?</p>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">2 hours ago</p>
                </div>
              </div>

              {/* Admin reply bubble (green) */}
              <div className="flex items-start gap-3 justify-end">
                <div className="max-w-xl">
                  <div className="bg-[#ECFBD9] rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-800">Hello John! Your resume is currently in progress. I’m working on the experience section and should have a draft ready by tomorrow. I’ll upload it to your portal once completed.</p>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 text-right">1 hour ago</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">A</div>
              </div>

              {/* Customer follow-up */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">👤</div>
                <div className="max-w-xl">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-900">Thanks for the update! When can I expect the draft?</p>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">5 min ago</p>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-100 p-4">
              <div className="flex items-center gap-3 rounded-xl ring-1 ring-gray-200 px-3 py-2 bg-white">
                <button className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">🔗</button>
                <input
                  type="text"
                  placeholder="Type your message"
                  className="flex-1 px-2 py-2 outline-none bg-transparent text-sm text-black placeholder-gray-500"
                />
                <button className="w-9 h-9 rounded-lg bg-[rgba(98,127,248,1)] text-white hover:opacity-90">📤</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
