"use client";

import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { 
  ArrowRight, 
  BarChart3, 
  Mail, 
  Zap,
  Sparkles 
} from 'lucide-react';

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // Auto-redirect if signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/pipeline');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                RevGeni CRM
              </span>
            </div>
            <div className="flex gap-3">
              {isSignedIn ? (
                <Link
                  href="/pipeline"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center gap-2"
                >
                  Go to Dashboard
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 transition font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          {/* Welcome Badge */}
          {isSignedIn && user && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm text-indigo-700">
              <Sparkles size={16} />
              Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress.split('@')[0]}!
            </div>
          )}

          {/* Main Heading */}
          <h1 className="text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI-Powered CRM
            </span>
            <br />
            <span className="text-gray-900">
              Built for Growth
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Automate your sales pipeline, find qualified leads, and close deals faster with intelligent email sequences.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/pipeline"
              className="group px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold flex items-center gap-2 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300"
            >
              Open Pipeline
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            {!isSignedIn && (
              <Link
                href="/sign-up"
                className="px-8 py-4 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition font-semibold border-2 border-gray-200 hover:border-gray-300"
              >
                Start Free Trial
              </Link>
            )}
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="text-indigo-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Visual Pipeline
              </h3>
              <p className="text-gray-600 text-sm">
                Track deals across stages with beautiful Kanban boards and real-time analytics.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-purple-200 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Mail className="text-purple-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Smart Sequences
              </h3>
              <p className="text-gray-600 text-sm">
                Automated email campaigns that adapt based on recipient engagement.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-pink-200 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                <Zap className="text-pink-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI Lead Finder
              </h3>
              <p className="text-gray-600 text-sm">
                Discover qualified prospects automatically using AI-powered search.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white border-y border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">10x</div>
              <div className="text-gray-600">Faster Lead Qualification</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">40%</div>
              <div className="text-gray-600">Higher Response Rates</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-pink-600 mb-2">24/7</div>
              <div className="text-gray-600">Automated Follow-ups</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}