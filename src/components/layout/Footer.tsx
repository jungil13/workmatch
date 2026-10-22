import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#0A1124] text-slate-300 pt-16 pb-10 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top 4-Column Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-12 border-b border-slate-800/80">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4 pr-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-xs">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="14" x="2" y="7" rx="3" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                Work<span className="text-emerald-400">Match</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              AI-powered job matching platform connecting talent with opportunity.
            </p>
          </div>

          {/* For Job Seekers */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">For Job Seekers</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/jobs" className="hover:text-emerald-400 transition-colors">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link href="/seeker/scanner" className="hover:text-emerald-400 transition-colors">
                  AI Recommendations
                </Link>
              </li>
              <li>
                <Link href="/seeker/diploma" className="hover:text-emerald-400 transition-colors">
                  Verify Diploma
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-emerald-400 transition-colors">
                  Company Reviews
                </Link>
              </li>
            </ul>
          </div>

          {/* For Employers */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">For Employers</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/employer/dashboard" className="hover:text-emerald-400 transition-colors">
                  HR Dashboard
                </Link>
              </li>
              <li>
                <Link href="/employer/jobs/create" className="hover:text-emerald-400 transition-colors">
                  Post a Job
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wide">Company</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright + Social Icons */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 WorkMatch. All rights reserved.</p>

          <div className="flex items-center gap-4 text-slate-400">
          </div>
        </div>
      </div>
    </footer>
  );
}
