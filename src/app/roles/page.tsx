'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { User, Briefcase, Shield, Sparkles, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col justify-center">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1 rounded-full text-xs font-bold text-mint-800">
            <Sparkles className="w-3.5 h-3.5 text-mint-600" /> WorkMatch Welcome Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-dark tracking-tight">
            How would you like to use WorkMatch?
          </h1>
          <p className="text-sm text-muted max-w-md mx-auto">
            Choose your journey to get access to tailored AI matching tools and portals.
          </p>
        </div>

        {/* Split Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Card 1: Job Seeker */}
          <div className="bg-white rounded-3xl border-2 border-border hover:border-mint-500 p-8 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-mint-50 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />

            <div className="space-y-5 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-mint-500 text-white flex items-center justify-center shadow-md shadow-mint-500/20 group-hover:scale-105 transition-transform">
                <User className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs font-bold text-mint-700 uppercase tracking-wider">Candidate</span>
                <h2 className="text-2xl font-black text-dark mt-1">I'm Looking for a Job</h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Find opportunities that match your skills, experience, salary expectations, and location.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-mint-500 shrink-0" />
                  <span>AI Job Recommendations & Diploma Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-mint-500 shrink-0" />
                  <span>Location proximity radius filtering</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-mint-500 shrink-0" />
                  <span>Visual application status tracker</span>
                </div>
              </div>
            </div>

            <div className="pt-8 space-y-3 relative z-10">
              <Link href="/auth/seeker/sign-up" className="block">
                <Button variant="primary" size="lg" className="w-full justify-center shadow-md">
                  Find a Job <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <div className="text-center">
                <Link
                  href="/auth/seeker/sign-in"
                  className="text-xs text-muted hover:text-dark font-medium"
                >
                  Already have an account? <span className="text-mint-700 font-bold underline">Sign In</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Employer */}
          <div className="bg-white rounded-3xl border-2 border-border hover:border-slate-800 p-8 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />

            <div className="space-y-5 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-dark text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Briefcase className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recruiter & Company</span>
                <h2 className="text-2xl font-black text-dark mt-1">I'm Hiring</h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Find qualified candidates based on skills, education, experience, and location.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-dark shrink-0" />
                  <span>AI Candidate Match Ranking (0–100%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-dark shrink-0" />
                  <span>Kanban pipeline & Interview scheduling</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-dark shrink-0" />
                  <span>HR conversion and pipeline analytics</span>
                </div>
              </div>
            </div>

            <div className="pt-8 space-y-3 relative z-10">
              <Link href="/auth/employer/sign-up" className="block">
                <Button variant="secondary" size="lg" className="w-full justify-center shadow-md">
                  Find Talent <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <div className="text-center">
                <Link
                  href="/auth/employer/sign-in"
                  className="text-xs text-muted hover:text-dark font-medium"
                >
                  Employer login? <span className="text-dark font-bold underline">Sign In</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Quick Entry */}
        <div className="mt-12 text-center">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-dark bg-white px-4 py-2 rounded-xl border border-border shadow-soft transition-colors"
          >
            <Shield className="w-4 h-4 text-mint-600" /> Platform Admin Command Center
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
