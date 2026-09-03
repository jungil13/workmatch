'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { JobCard } from '@/components/jobs/JobCard';
import { supabase } from '@/lib/supabase/client';
import {
  Sparkles,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Zap,
  Briefcase,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [featuredJobs, setFeaturedJobs] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

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

  const handleSearch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/seeker/sign-in');
      return;
    }
    const query = new URLSearchParams();
    if (keyword) query.set('keyword', keyword);
    if (location) query.set('city', location);
    router.push(`/jobs?${query.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-24 pb-32 flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#1b3b4d] via-[#16514e] to-[#126b4f] min-h-[90vh]">
        {/* Floating Lights Effects */}
        <div className="absolute top-0 left-1/4 w-[30rem] h-[30rem] bg-emerald-400/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-teal-400/20 rounded-full mix-blend-screen filter blur-3xl opacity-50 pointer-events-none animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-mint-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-40 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10 flex flex-col items-center w-full">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-900/40 border border-emerald-500/30 backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-100 tracking-wide">
              AI-Powered Job Matching
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.2]">
            Find <span className="text-[#60e0a8] px-3 py-1 rounded-lg">Nearby Jobs</span> That<br/>
            Fit Your <span className="text-[#60e0a8] px-3 py-1 rounded-lg">Exact Skills</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-lg text-emerald-50/70 max-w-3xl mx-auto leading-relaxed">
            WorkMatch analyzes your skills, certifications, and location to instantly connect you with the highest-matching opportunities within your preferred radius.
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-4xl bg-white rounded-[2rem] md:rounded-full p-2 flex flex-col md:flex-row items-center gap-2 shadow-2xl relative z-20">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 w-full border-b md:border-b-0 md:border-r border-slate-100">
              <Sparkles className="w-5 h-5 text-slate-400 shrink-0" />
              <input 
                type="text" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Job title, skills, or certifications" 
                className="w-full bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 text-sm md:text-base font-medium"
              />
            </div>
            
            <div className="hidden md:block w-px h-8 bg-slate-200" />

            <div className="flex-1 flex items-center gap-3 px-4 py-3 w-full">
              <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, province, or radius..." 
                className="w-full bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 text-sm md:text-base font-medium"
              />
            </div>

            <Button 
              onClick={handleSearch}
              className="w-full md:w-auto bg-[#1ea87a] hover:bg-[#188f66] text-white rounded-full px-8 py-4 md:py-6 h-auto font-semibold flex items-center justify-center gap-2 transition-colors mt-2 md:mt-0 shrink-0"
            >
              Find Match <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Popular Tags */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="text-sm text-emerald-100/60 mr-2 font-medium">Popular:</span>
            {['Web Developer', 'Data Analyst', 'Registered Nurse', 'Graphic Designer'].map(tag => (
              <span 
                key={tag} 
                onClick={() => setKeyword(tag)}
                className="text-xs font-semibold bg-emerald-950/40 border border-emerald-500/20 text-emerald-100 px-5 py-2 rounded-full hover:bg-emerald-900/60 cursor-pointer transition-colors backdrop-blur-sm shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 p-6 bg-emerald-950/30 border border-emerald-500/20 backdrop-blur-md rounded-2xl max-w-2xl mx-auto w-full shadow-xl">
            <div className="flex flex-col items-center justify-center sm:border-r border-emerald-500/20 px-4 py-2">
              <span className="text-2xl font-bold text-white">2,450+</span>
              <span className="text-[10px] text-emerald-200/50 mt-1 uppercase tracking-widest font-semibold">Active Jobs</span>
            </div>
            <div className="flex flex-col items-center justify-center sm:border-r border-emerald-500/20 px-4 py-2">
              <span className="text-2xl font-bold text-white">380+</span>
              <span className="text-[10px] text-emerald-200/50 mt-1 uppercase tracking-widest font-semibold">Companies</span>
            </div>
            <div className="flex flex-col items-center justify-center px-4 py-2">
              <span className="text-2xl font-bold text-white">15K+</span>
              <span className="text-[10px] text-emerald-200/50 mt-1 uppercase tracking-widest font-semibold">Matches Made</span>
            </div>
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
              <h3 className="text-lg font-bold text-dark">Build & Verify Profile</h3>
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
              <h3 className="text-lg font-bold text-dark">Track & Get Hired</h3>
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
