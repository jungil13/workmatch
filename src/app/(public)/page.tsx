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
  Search,
  X,
  Users,
  Bot,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  const [featuredJobs, setFeaturedJobs] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [featuredKeyword, setFeaturedKeyword] = useState('');
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [candidateSkillNames, setCandidateSkillNames] = useState<string[]>([]);

  // Load featured jobs
  useEffect(() => {
    setLoadingFeatured(true);
    supabase
      .from('jobs')
      .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setFeaturedJobs(data ?? []);
        setFilteredJobs(data ?? []);
        setLoadingFeatured(false);
      });

    // Load logged-in user skills for matching display
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: skills } = await supabase
        .from('job_seeker_skills')
        .select('skill:skills(name)')
        .eq('user_id', user.id);
      if (skills) {
        setCandidateSkillNames(
          skills.map((s: any) => (s.skill?.name || '').toLowerCase()).filter(Boolean)
        );
      }
    });
  }, []);

  // Live filter featured jobs by keyword (client-side, since they are already loaded)
  useEffect(() => {
    const kw = featuredKeyword.toLowerCase().trim();
    if (!kw) {
      setFilteredJobs(featuredJobs);
    } else {
      setFilteredJobs(
        featuredJobs.filter(
          (job) =>
            job.title?.toLowerCase().includes(kw) ||
            job.company?.name?.toLowerCase().includes(kw) ||
            job.city?.toLowerCase().includes(kw) ||
            (job.required_skills || []).some((sk: any) =>
              (sk.name || sk.skill?.name || '').toLowerCase().includes(kw)
            )
        )
      );
    }
  }, [featuredKeyword, featuredJobs]);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      {/* ─── 1. HERO SECTION ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-12 pb-20 md:py-24 border-b border-border"
        style={{
          backgroundImage: 'url(/hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Mobile-only blur overlay */}
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
          </div>
        </div>
      </section>

      {/* ─── 2. HOW WORKMATCH WORKS ──────────────────────────────────────────── */}
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
            {[
              {
                step: '1',
                title: 'Build & Verify Profile',
                desc: 'Add your skills and upload credentials. Our platform detects your technical proficiencies and verifies documents.',
                icon: ShieldCheck,
              },
              {
                step: '2',
                title: 'Real-Time Proximity Match',
                desc: 'Our 6-factor matching engine evaluates skills, proximity in kilometers, salary expectations, and work arrangement.',
                icon: Zap,
              },
              {
                step: '3',
                title: 'Track & Get Hired',
                desc: 'Apply in 1 click. Follow your recruitment pipeline (Screening, Interview, Offer, Hired) with real-time status updates.',
                icon: CheckCircle2,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4 relative group hover:border-mint-200 hover:bg-white hover:shadow-soft transition-all">
                <div className="w-12 h-12 rounded-xl bg-mint-100 text-mint-700 font-black text-lg flex items-center justify-center">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-dark">{title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURED OPPORTUNITIES (Full rich card style matching seeker dashboard) ── */}
      <section className="py-16 sm:py-20 bg-slate-50/70 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1 rounded-full text-xs font-bold text-mint-800">
                <Sparkles className="w-3.5 h-3.5 text-mint-600" /> Live Openings
              </div>
              <h2 className="text-3xl font-extrabold text-dark tracking-tight">
                Featured Opportunities
              </h2>
              <p className="text-sm text-muted">
                Real openings with AI match analysis, skills breakdown, and applicant activity — just like the seeker portal.
              </p>
            </div>
            <Link href="/jobs" className="shrink-0">
              <Button variant="outline" size="sm">
                View All Openings <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Mini Live Search for Featured */}
          <div className="bg-white rounded-2xl border border-border p-3 sm:p-4 shadow-soft flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-mint-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter featured jobs by title, skill, or company..."
                value={featuredKeyword}
                onChange={(e) => setFeaturedKeyword(e.target.value)}
                className="w-full h-10 pl-10 pr-9 rounded-xl border border-border bg-white text-xs text-dark placeholder:text-slate-400 focus:border-mint-500 focus:outline-none"
              />
              {featuredKeyword && (
                <button
                  type="button"
                  onClick={() => setFeaturedKeyword('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-mint-800 bg-mint-50 px-3 py-2 rounded-xl border border-mint-200 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} shown
            </div>
          </div>

          {/* Feature callout pills (social proof) */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 bg-white border border-border px-3 py-1.5 rounded-full shadow-xs font-semibold">
              <Bot className="w-3.5 h-3.5 text-emerald-600" /> AI Match Analysis on every card
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-border px-3 py-1.5 rounded-full shadow-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-mint-600" /> Stalk competitor applicant profiles
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-border px-3 py-1.5 rounded-full shadow-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Skills match tags
            </span>
          </div>

          {/* Featured Job Cards */}
          {loadingFeatured ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3 shadow-soft">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-dark">No matching featured jobs</h3>
              <p className="text-xs text-muted">Try a different keyword or clear the filter.</p>
              <Button variant="outline" size="sm" onClick={() => setFeaturedKeyword('')}>
                Clear Filter
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  candidateSkillNames={candidateSkillNames}
                />
              ))}
              {/* See more CTA */}
              <div className="text-center pt-4">
                <Link href="/jobs">
                  <Button variant="primary" size="md" className="shadow-sm font-bold">
                    See All Open Positions <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── 4. CALL TO ACTION ───────────────────────────────────────────────── */}
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
