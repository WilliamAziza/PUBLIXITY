'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  MessageSquare, 
  Users, 
  Send, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  LogOut,
  Loader2
} from 'lucide-react';

interface Stats {
  totalMessages: number;
  totalContacts: number;
  successRate: number;
  recentMessages: Array<{
    _id: string;
    message: string;
    totalRecipients: number;
    successCount: number;
    failedCount: number;
    status: string;
    createdAt: string;
  }>;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchStats();
    }
  }, [status, router]);

  const fetchStats = async () => {
    try {
      const [messagesRes, contactsRes] = await Promise.all([
        fetch('/api/messages'),
        fetch('/api/contacts'),
      ]);

      const messagesData = await messagesRes.json();
      const contactsData = await contactsRes.json();

      const messages = messagesData.messages || [];
      const contacts = contactsData.contacts || [];

      const totalSent = messages.reduce((sum: number, msg: any) => sum + msg.successCount, 0);
      const totalFailed = messages.reduce((sum: number, msg: any) => sum + msg.failedCount, 0);
      const totalRecipients = messages.reduce((sum: number, msg: any) => sum + msg.totalRecipients, 0);

      setStats({
        totalMessages: messages.length,
        totalContacts: contacts.length,
        successRate: totalRecipients > 0 ? Math.round((totalSent / totalRecipients) * 100) : 0,
        recentMessages: messages.slice(0, 5),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {session.user?.name || 'User'}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Here is an overview of your messaging activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.totalMessages || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.totalContacts || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.successRate || 0}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.totalMessages || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <MessageSquare className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/send-sms"
            className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Send className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Send Bulk SMS</h3>
                <p className="text-green-100 mt-1">Reach your audience instantly</p>
              </div>
            </div>
          </Link>

          <Link
            href="/contacts"
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Manage Contacts</h3>
                <p className="text-blue-100 mt-1">Upload and organize your contacts</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Messages */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Messages
            </h2>
          </div>
          <div className="p-6">
            {stats?.recentMessages && stats.recentMessages.length > 0 ? (
              <div className="space-y-4">
                {stats.recentMessages.map((msg) => (
                  <div
                    key={msg._id}
                    className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {msg.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(msg.createdAt).toLocaleDateString()} at{' '}
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{msg.successCount}</span>
                      </div>
                      {msg.failedCount > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">{msg.failedCount}</span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500">
                        / {msg.totalRecipients}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No messages sent yet</p>
                <Link
                  href="/send-sms"
                  className="mt-4 inline-flex items-center text-green-600 hover:text-green-700"
                >
                  Send your first message
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

