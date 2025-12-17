import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black shadow-sm border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-green-600">
              Publixity
            </Link>
          </div>
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              Home
            </Link>
            <Link href="/send-sms" className="text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              Send SMS
            </Link>
            <Link href="/auth/login" className="text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              Login
            </Link>
            <Link href="/auth/signup" className="text-zinc-700 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              Signup
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
