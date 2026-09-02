import React from 'react';
import Link from 'next/link';
import { AppLogo } from '@/components/ui/AppLogo';
import { Sparkles, MapPin, ShieldCheck, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-1 font-bold">
                <AppLogo className="w-6 h-6" color="#34d399" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                Work<span className="text-mint-400">Match</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              AI-assisted skill and proximity job matching platform. Connecting top talent with premier employers in Cebu, Metro Manila, Davao, and across the Philippines.
            </p>
            <div className="flex items-center gap-3 pt-2 text-slate-400">
              <span className="inline-flex items-center gap-1 text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <MapPin className="w-3.5 h-3.5 text-mint-400" /> Cebu IT Park & Nationwide
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-mint-400" /> Diploma Verified
              </span>
            </div>
          </div>

          {/* For Job Seekers */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Job Seekers</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/jobs" className="hover:text-mint-400 transition-colors">Find Matching Jobs</Link></li>
              <li><Link href="/seeker/scanner" className="hover:text-mint-400 transition-colors">AI Job Recommendations</Link></li>
              <li><Link href="/seeker/diploma" className="hover:text-mint-400 transition-colors">Diploma Verification</Link></li>
              <li><Link href="/seeker/dashboard" className="hover:text-mint-400 transition-colors">Seeker Dashboard</Link></li>
              <li><Link href="/reviews" className="hover:text-mint-400 transition-colors">Company Reviews</Link></li>
            </ul>
          </div>

          {/* For Employers */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Employers</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/employer/jobs/create" className="hover:text-mint-400 transition-colors">Post a Job</Link></li>
              <li><Link href="/employer/candidates" className="hover:text-mint-400 transition-colors">AI Candidate Finder</Link></li>
              <li><Link href="/employer/applicants" className="hover:text-mint-400 transition-colors">Recruitment Pipeline</Link></li>
              <li><Link href="/employer/analytics" className="hover:text-mint-400 transition-colors">HR Analytics</Link></li>
              <li><Link href="/employer/dashboard" className="hover:text-mint-400 transition-colors">Employer Portal</Link></li>
            </ul>
          </div>

          {/* Legal & Platform */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/about" className="hover:text-mint-400 transition-colors">How It Works</Link></li>
              <li><Link href="/roles" className="hover:text-mint-400 transition-colors">Role Selection</Link></li>
              <li><Link href="/admin" className="hover:text-mint-400 transition-colors">Admin Command</Link></li>
              <li><Link href="/privacy" className="hover:text-mint-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-mint-400 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} WorkMatch Inc. Built with Next.js, TypeScript & Supabase.</p>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Cebu City • Makati • BGC • Davao</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
