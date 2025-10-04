'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TokenManager } from '@/lib/http';

interface OrderData {
  order: {
    _id: string;
    orderNumber: string;
    client: {
      fullName: string;
      email: string;
    };
    serviceType: string;
    status: string;
    createdAt: string;
    requirements: any;
  };
  originalFiles: any[];
  mockOriginalContent: {
    type: string;
    content: string;
    lastModified: string;
  };
}

export default function OriginalDocumentPage() {
  const { orderId } = useParams();
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOriginalDocument = async () => {
      try {
        const token = TokenManager.getAccessToken();
        if (!token) {
          throw new Error('Authentication required');
        }

        const response = await fetch(`/api/orders/${orderId}/original`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch original document');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch document');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOriginalDocument();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading original document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Document</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No document found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Original Document</h1>
            <p className="text-sm text-gray-600">
              Order {data.order.orderNumber} • {data.order.client.fullName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Print
            </button>
            <button 
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </header>

      {/* Document Info */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Service Type:</span>
            <p className="text-gray-900 capitalize">{data.order.serviceType.replace('_', ' ')}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <p className="text-gray-900 capitalize">{data.order.status.replace('_', ' ')}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <p className="text-gray-900">{new Date(data.order.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Client:</span>
            <p className="text-gray-900">{data.order.client.fullName}</p>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="prose prose-lg max-w-none">
            <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-900">
              {data.mockOriginalContent.content}
            </div>
          </div>
        </div>
        
        {/* File Info */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Document Information</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Type: {data.mockOriginalContent.type}</p>
            <p>Last Modified: {new Date(data.mockOriginalContent.lastModified).toLocaleString()}</p>
            <p>Order ID: {data.order._id}</p>
            {data.originalFiles.length > 0 && (
              <p>Original Files: {data.originalFiles.length} file(s) attached</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}