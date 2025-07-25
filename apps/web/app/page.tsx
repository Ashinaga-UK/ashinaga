import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <Logo className="text-4xl" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Ashinaga
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            An international foundation providing educational and emotional support to orphaned
            students from sub-Saharan Africa
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Our Mission
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Ashinaga helps students from 49 countries in sub-Saharan Africa who have lost one or
              both parents access higher education and develop leadership skills to contribute to
              their communities.
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              This platform helps us manage our student programs, track progress, and ensure every
              student receives the support they need to succeed.
            </p>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Learn More
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Visit our main website to learn more about our programs and how you can help support
              orphaned students in Africa.
            </p>
            <Link
              href="https://www.ashinaga-uk.org/"
              target="_blank"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Visit Ashinaga UK Website
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </Link>
          </section>
        </main>

        <footer className="text-center mt-16 text-gray-600 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} Ashinaga. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
