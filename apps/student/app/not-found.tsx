import { Button } from '@workspace/ui';
import { Home } from 'lucide-react';
import Link from 'next/link';

export default async function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-8xl font-bold text-gray-400 dark:text-gray-600 mb-4">404</h1>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Page not found</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <Button asChild>
            <Link href="/" className="flex items-center gap-2 mx-auto w-fit">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
