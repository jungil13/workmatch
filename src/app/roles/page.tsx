'use client';

import React from 'react';
import Link from 'next/link';
import { Briefcase, Users } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0d3d2e] via-[#0a4a38] to-[#07503f] selection:bg-emerald-200">
      <Navbar />

      {/* Main content centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-8 w-full max-w-xl">

          {/* Logo — matches Navbar */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white"
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
            <h1 className="text-white font-black text-3xl tracking-tight mt-1">WorkMatch</h1>
            <p className="text-emerald-200/80 text-sm font-medium">Choose continue</p>
          </div>

          {/* Two role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">

            {/* Find Job */}
            <Link
              href="/auth/seeker/sign-up"
              className="group flex items-center gap-4 bg-white/10 hover:bg-white/[0.16] backdrop-blur-sm border border-white/15 hover:border-white/30 rounded-2xl px-5 py-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Find Job</p>
                <p className="text-emerald-200/70 text-xs mt-0.5">Find your next opportunity</p>
              </div>
            </Link>

            {/* Post Job */}
            <Link
              href="/auth/employer/sign-up"
              className="group flex items-center gap-4 bg-white/10 hover:bg-white/[0.16] backdrop-blur-sm border border-white/15 hover:border-white/30 rounded-2xl px-5 py-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Post Job</p>
                <p className="text-emerald-200/70 text-xs mt-0.5">Post job &amp; find talent!</p>
              </div>
            </Link>
          </div>

          {/* Sign in link */}
          <p className="text-emerald-200/60 text-xs font-medium">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="text-emerald-200 hover:text-white font-bold underline underline-offset-2 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
