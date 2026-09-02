'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Progress } from '@/components/ui/Progress';
import { supabase } from '@/lib/supabase/client';
import {
  Sparkles,
  MapPin,
  Users,
  Briefcase,
  FileCheck2,
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    seekers: 0,
    employers: 0,
    jobs: 0,
    verifiedDocs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'job_seeker'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employer'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
    ]).then(([users, seekers, employers, jobs, docs]) => {
      setStats({
        totalUsers: users.count ?? 0,
        seekers: seekers.count ?? 0,
        employers: employers.count ?? 0,
        jobs: jobs.count ?? 0,
        verifiedDocs: docs.count ?? 0,
      });
      setLoading(false);
    });
  }, []);

  const topSkills = [
    { name: 'React', percent: 85 },
    { name: 'TypeScript', percent: 80 },
    { name: 'Next.js', percent: 75 },
    { name: 'PostgreSQL', percent: 68 },
    { name: 'Tailwind CSS', percent: 65 },
  ];

  return (
    <DashboardLayout
      portal="admin"
      title="Platform Analytics & Intelligence"
      subtitle="Aggregated system metrics, skill demand distributions, and verified credentials."
    >
      <div className="space-y-8 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-1">
                <span className="text-xs text-muted font-medium">Registered Seekers</span>
                <p className="text-3xl font-black text-dark">{stats.seekers}</p>
                <span className="text-[11px] text-emerald-700 font-bold">Live database</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-1">
                <span className="text-xs text-muted font-medium">Registered Employers</span>
                <p className="text-3xl font-black text-mint-600">{stats.employers}</p>
                <span className="text-[11px] text-emerald-700 font-bold">Live database</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-1">
                <span className="text-xs text-muted font-medium">Total Job Openings</span>
                <p className="text-3xl font-black text-dark">{stats.jobs}</p>
                <span className="text-[11px] text-slate-500">All statuses</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-1">
                <span className="text-xs text-muted font-medium">Verified Credentials</span>
                <p className="text-3xl font-black text-emerald-600">{stats.verifiedDocs}</p>
                <span className="text-[11px] text-emerald-700 font-bold">Registrar verified</span>
              </div>
            </div>

            {/* 2-Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-5">
                <h3 className="text-base font-bold text-dark flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-mint-600" /> Platform Skill Ontology
                </h3>
                <div className="space-y-3">
                  {topSkills.map((sk) => (
                    <div key={sk.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-dark">{sk.name}</span>
                        <span className="text-mint-700 font-bold">{sk.percent}% relevance</span>
                      </div>
                      <Progress value={sk.percent} size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-5">
                <h3 className="text-base font-bold text-dark flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-mint-600" /> Key Regional Recruitment Hubs
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-dark">Cebu City (Cebu IT Park & CBP)</span>
                    <span className="text-mint-700 font-bold">Central Visayas</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-dark">Taguig / BGC & Makati City</span>
                    <span className="text-mint-700 font-bold">Metro Manila</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-dark">Davao City</span>
                    <span className="text-mint-700 font-bold">Mindanao</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
