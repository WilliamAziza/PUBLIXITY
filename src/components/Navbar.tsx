'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { MessageSquare, LayoutDashboard, Users, History, Settings, LogOut } from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black shadow-sm border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-green-600">
              Publixity
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {status === 'authenticated' ? (
              <>
                <Link href="/dashboard" className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link href="/contacts" className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  <Users className="w-4 h-4" />
                  Contacts
                </Link>
                <Link href="/send-sms" className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  Send SMS
                </Link>
                <Link href="/history" className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  <History className="w-4 h-4" />
                  History
                </Link>
                <Link href="/settings" className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/" className="text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Home
                </Link>
                <Link href="/send-sms" className="text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Send SMS
                </Link>
                {status === 'unauthenticated' && (
                  <>
                    <Link href="/auth/login" className="text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                      Login
                    </Link>
                    <Link href="/auth/signup" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
      </div>
    </nav>
  );
}
 
