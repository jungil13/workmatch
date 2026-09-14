'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { JobCard } from '@/components/jobs/JobCard';
import { supabase } from '@/lib/supabase/client';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Briefcase,
} from 'lucide-react';

export default function LandingPage() {
  const [featuredJobs, setFeaturedJobs] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('jobs')
      .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setFeaturedJobs(data ?? []);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section
        className="relative overflow-hidden pt-12 pb-20 md:py-24 border-b border-border"
        style={{
          backgroundImage: 'url(/hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Mobile-only blur overlay — softens background on small/Android screens */}
        <div className="absolute inset-0 block md:hidden backdrop-blur-sm bg-white/30 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Headline */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-3.5 py-1.5 rounded-full shadow-soft">
                <Sparkles className="w-4 h-4 text-mint-400" />
                <span className="text-xs font-bold text-black tracking-wide">
                  AI-Powered Skill &amp; Location Matching
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-black tracking-tight leading-[1.1]">
                Find the Right Job. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-mint-400 to-emerald-400">
                  Near You.
                </span>
              </h1>

              <p className="text-lg text-black max-w-xl leading-relaxed">
                WorkMatch connects your skills, experience, and location with opportunities that fit you. Transparent match scores and verified credentials for genuine career growth.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href="/seeker/find-jobs">
                  <Button variant="primary" size="lg" className="shadow-md">
                    Find Your Match <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/employer/dashboard">
                  <Button variant="outline" size="lg" className="border-slate-700/30 text-black hover:bg-white/10">
                    <Briefcase className="w-4 h-4 text-black" /> Hire Talent
                  </Button>
                </Link>
              </div>

              {/* Key trust bullets */}
              <div className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-mint-400" /> Transparent 6-Factor AI Scoring
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-mint-400" /> Verified Diploma Extraction
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-mint-400" /> Proximity &amp; Distance Engine
                </span>
              </div>
            </div>

            {/* Right Hero Visual */}

          </div>
        </div>
      </section>

      {/* 2. HOW WORKMATCH WORKS */}
      <section className="py-20 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-mint-700 bg-mint-50 px-3 py-1 rounded-full border border-mint-200 uppercase tracking-wider">
              Smart Pipeline
            </span>
            <h2 className="text-3xl font-extrabold text-dark tracking-tight">How WorkMatch Works</h2>
            <p className="text-sm text-slate-600">
              An intelligent, transparent 3-step recruitment loop designed for speed, accuracy, and mutual fit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4 relative group hover:border-mint-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-mint-100 text-mint-700 font-bold text-lg flex items-center justify-center">
                1
              </div>
              <h3 className="text-lg font-bold text-dark">Build &amp; Verify Profile</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add your skills and upload credentials. Our platform detects your technical proficiencies and verifies documents.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4 relative group hover:border-mint-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-mint-100 text-mint-700 font-bold text-lg flex items-center justify-center">
                2
              </div>
              <h3 className="text-lg font-bold text-dark">Real-Time Proximity Match</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our 6-factor matching engine evaluates skills, proximity in kilometers, salary expectations, and work arrangement.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4 relative group hover:border-mint-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-mint-100 text-mint-700 font-bold text-lg flex items-center justify-center">
                3
              </div>
              <h3 className="text-lg font-bold text-dark">Track &amp; Get Hired</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apply in 1 click. Follow your recruitment pipeline (Screening, Interview, Offer, Hired) with real-time status updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED OPPORTUNITIES */}
      {featuredJobs.length > 0 && (
        <section className="py-20 bg-white border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-mint-700 bg-mint-50 px-3 py-1 rounded-full border border-mint-200 uppercase tracking-wider">
                  Live Openings
                </span>
                <h2 className="text-3xl font-extrabold text-dark tracking-tight mt-2">
                  Featured Opportunities
                </h2>
              </div>
              <Link href="/jobs">
                <Button variant="outline" size="sm">
                  View All Openings <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. CALL TO ACTION */}
      <section className="py-20 bg-gradient-to-br from-mint-500 to-mint-700 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Ready to Find Opportunities Matched to Your True Potential?
          </h2>
          <p className="text-base text-mint-100 max-w-xl mx-auto">
            Join candidates and top Philippine tech employers discovering high-compatibility job matches.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/roles">
              <Button variant="secondary" size="lg" className="bg-white text-dark hover:bg-slate-100 shadow-lg">
                Create Your Account <ArrowRight className="w-4 h-4 text-dark" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button variant="outline" size="lg" className="bg-mint-600/50 border-white/40 text-white hover:bg-mint-600">
                Browse All Openings
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
