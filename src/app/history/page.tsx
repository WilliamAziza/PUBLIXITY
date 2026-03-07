'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Recipient {
  phone: string;
  name: string;
  status: string;
  sentAt?: string;
  error?: string;
}

interface MessageData {
  _id: string;
  message: string;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  status: string;
  recipients: Recipient[];
  createdAt: string;
}

export default function History() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchMessages();
    }
  }, [status, router]);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedMessage(expandedMessage === id ? null : id);
  };

  const filteredMessages = messages.filter(msg => 
    msg.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg._id.includes(searchTerm)
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Message History
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View your past bulk messaging campaigns
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((msg) => (
              <div
                key={msg._id}
                className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <div 
                  className="p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => toggleExpand(msg._id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          msg.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : msg.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {msg.status === 'completed' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : msg.status === 'failed' ? (
                            <XCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(msg.createdAt).toLocaleDateString()} at{' '}
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-white font-medium truncate">
                        {msg.message}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 ml-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">{msg.successCount}</span>
                        </div>
                        {msg.failedCount > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span className="font-medium">{msg.failedCount}</span>
                          </div>
                        )}
                        <span className="text-gray-500">/ {msg.totalRecipients}</span>
                      </div>
                      {expandedMessage === msg._id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedMessage === msg._id && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Recipients
                      </h4>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-700">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Phone</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Error</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-600">
                            {msg.recipients.map((recipient, index) => (
                              <tr key={index} className="hover:bg-zinc-50 dark:hover:bg-zinc-600">
                                <td className="px-3 py-2">
                                  {recipient.status === 'sent' ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Sent
                                    </span>
                                  ) : recipient.status === 'failed' ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Failed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white font-mono">
                                  {recipient.phone}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                  {recipient.name || '-'}
                                </td>
                                <td className="px-3 py-2 text-sm text-red-600 dark:text-red-400">
                                  {recipient.error || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? 'No messages match your search' : 'No messages sent yet'}
              </p>
              {!searchTerm && (
                <Link
                  href="/send-sms"
                  className="inline-flex items-center text-green-600 hover:text-green-700"
                >
                  Send your first bulk message
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

