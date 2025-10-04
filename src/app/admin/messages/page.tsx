'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TokenManager } from '@/lib/http';

interface Message {
  _id: string;
  content: string;
  sender: {
    name: string;
    role: string;
  };
  timestamp: string;
}

interface Conversation {
  _id: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
  };
  order: {
    orderNumber: string;
    serviceType: string;
  };
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: string;
  messages: Message[];
}

export default function MessagesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !user) {
      window.location.href = '/login';
      return;
    }

    const role = String(user?.role || '').toLowerCase();
    const hasAdminAccess = role === 'admin' || role === 'super_admin';
    
    if (!hasAdminAccess) {
      window.location.href = '/login';
      return;
    }

    fetchConversations();
  }, [isAuthenticated, user, authLoading]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = TokenManager.getAccessToken();
      
      if (!token) {
        setError('No authentication token found. Please login again.');
        return;
      }

      console.log('Fetching conversations with token:', token.substring(0, 20) + '...');
      
      const response = await fetch('/api/admin/messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        setError(`API Error: ${response.status} - ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      if (data.success) {
        setConversations(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedConversation(data.data[0]);
        }
      } else {
        setError(`Failed to fetch conversations: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(`Error connecting to server: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      const token = TokenManager.getAccessToken();
      
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: selectedConversation.orderId,
          content: newMessage.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Add new message to current conversation
        setSelectedConversation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, data.data],
            lastMessage: data.data.content,
            timestamp: new Date(data.data.timestamp).toLocaleString()
          };
        });
        
        // Update conversations list
        setConversations(prev => prev.map(conv => 
          conv._id === selectedConversation._id 
            ? {
                ...conv,
                messages: [...conv.messages, data.data],
                lastMessage: data.data.content,
                timestamp: new Date(data.data.timestamp).toLocaleString()
              }
            : conv
        ));
        
        setNewMessage('');
      } else {
        console.error('Failed to send message:', data.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          Loading messages...
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
            onClick={fetchConversations}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] flex flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-14">
            {/* Logo Section */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2">
                <img src="/logo.png" alt="SkillX" className="h-7 w-auto" />
                <div className="hidden sm:block">
                  <span className="text-sm font-bold text-gray-900">SkillX</span>
                  <span className="ml-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">ADMIN</span>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center space-x-0.5">
              {[
                { name: 'Dashboard', href: '/admin', icon: '📊' },
                { name: 'Orders', href: '/admin/orders', icon: '📋' },
                { name: 'Messages', href: '/admin/messages', icon: '💬' },
                { name: 'Payments', href: '/admin/payments', icon: '💳' },
                { name: 'Revisions', href: '/admin/revisions', icon: '🔄' },
                { name: 'Reports', href: '/admin/reports', icon: '📈' },
                { name: 'Settings', href: '/admin/settings', icon: '⚙️' }
              ].map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    item.name === 'Messages'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xs">{item.icon}</span>
                  {item.name}
                </a>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Quick Actions */}
              <div className="hidden lg:flex items-center gap-1">
                <button className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 4h7l-7 7V4z" />
                  </svg>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-gray-900 leading-tight">{user?.fullName || user?.firstName || 'Admin'}</div>
                  <div className="text-xs text-gray-500 capitalize leading-tight">{user?.role || 'Administrator'}</div>
                </div>
                <div className="relative">
                  <button className="flex items-center gap-1 p-1 rounded-md hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                        : user?.fullName 
                          ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                          : 'A'
                      }
                    </div>
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  type="button"
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Open main menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation (hidden by default) */}
        <div className="md:hidden border-t border-gray-200 bg-gray-50">
          <div className="px-6 py-2 space-y-0.5">
            {[
              { name: 'Dashboard', href: '/admin', icon: '📊' },
              { name: 'Orders', href: '/admin/orders', icon: '📋' },
              { name: 'Messages', href: '/admin/messages', icon: '💬' },
              { name: 'Payments', href: '/admin/payments', icon: '💳' },
              { name: 'Revisions', href: '/admin/revisions', icon: '🔄' },
              { name: 'Reports', href: '/admin/reports', icon: '📈' },
              { name: 'Settings', href: '/admin/settings', icon: '⚙️' }
            ].map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium ${
                  item.name === 'Messages'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.name}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* Messages Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <div className="mt-2">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <div className="text-4xl mb-4">💬</div>
                <p>No conversations found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conversation) => (
                  <div 
                    key={conversation._id} 
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${selectedConversation?._id === conversation._id ? 'bg-blue-50 border-r-2 border-blue-500' : ''}`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {conversation.customer.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 truncate">{conversation.customer.name}</div>
                            {conversation.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">{conversation.unreadCount}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500">{conversation.order.orderNumber}</div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">{conversation.lastMessage}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">{conversation.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversation ? (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedConversation.customer.name}</h3>
                  <p className="text-sm text-gray-500">{selectedConversation.order.orderNumber} • {selectedConversation.order.serviceType}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${selectedConversation.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {selectedConversation.status === 'active' ? 'Active' : selectedConversation.status}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                  selectedConversation.messages.map((message) => (
                    <div key={message._id} className={`flex items-start gap-3 ${message.sender.role === 'admin' ? 'justify-end' : ''}`}>
                      {message.sender.role !== 'admin' && (
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs flex-shrink-0">👤</div>
                      )}
                      <div className="max-w-xl">
                        <div className={`rounded-2xl px-4 py-3 ${message.sender.role === 'admin' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <p className={`text-[11px] text-gray-500 mt-1 ${message.sender.role === 'admin' ? 'text-right' : ''}`}>
                          {new Date(message.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {message.sender.role === 'admin' && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs flex-shrink-0">A</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No messages in this conversation yet
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-100 p-4">
                <div className="flex items-center gap-3 rounded-xl ring-1 ring-gray-200 px-4 py-3 bg-white">
                  <button className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center">📎</button>
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                    className="flex-1 outline-none bg-transparent text-sm text-black placeholder-gray-500"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="w-10 h-10 rounded-lg bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      '📤'
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the left to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}