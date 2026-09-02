'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { JobCard } from '@/components/jobs/JobCard';
import { supabase } from '@/lib/supabase/client';
import {
  Building2,
  MapPin,
  ShieldCheck,
  Star,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [activeTab, setActiveTab] = useState<'jobs' | 'reviews' | 'about'>('jobs');
  const [company, setCompany] = useState<any | null>(null);
  const [companyJobs, setCompanyJobs] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('companies').select('*').eq('id', resolvedParams.id).maybeSingle(),
      supabase.from('jobs').select('*, company:companies(*)').eq('company_id', resolvedParams.id).eq('status', 'published'),
      supabase.from('company_reviews').select('*').eq('company_id', resolvedParams.id).order('created_at', { ascending: false }),
    ]).then(([compRes, jobsRes, revsRes]) => {
      setCompany(compRes.data);
      setCompanyJobs(jobsRes.data ?? []);
      setReviews(revsRes.data ?? []);
      setLoading(false);
    });
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-dark">Company Not Found</h2>
          <Link href="/companies" className="mt-4 inline-block">
            <Button variant="primary" size="sm">
              Back to Companies
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link href="/companies" className="hover:text-dark flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> All Companies
          </Link>
          <span>/</span>
          <span className="text-dark font-semibold">{company.name}</span>
        </div>

        {/* Company Header Banner */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-dark tracking-tight">{company.name}</h1>
                  {company.verified && (
                    <span className="bg-mint-50 text-mint-700 border border-mint-200 p-1 rounded-full" title="Verified SEC">
                      <ShieldCheck className="w-4 h-4 text-mint-600" />
                    </span>
                  )}
                </div>
                <p className="text-sm text-mint-700 font-semibold">{company.industry}</p>
                <p className="text-xs text-muted flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-mint-500" /> {company.address ? `${company.address}, ` : ''}{company.city}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-4 sm:pt-0">
              <span className="text-xs text-muted font-medium">{companyJobs.length} active openings</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-4 border-t border-border">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'jobs' ? 'bg-mint-500 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Open Jobs ({companyJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'reviews' ? 'bg-mint-500 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Employee Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'about' ? 'bg-mint-500 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              About Company
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-dark">Active Job Openings at {company.name}</h3>
            {companyJobs.length === 0 ? (
              <p className="text-xs text-muted">No open positions currently available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companyJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-dark">Employee Ratings & Reviews</h3>
              <Link href="/seeker/reviews">
                <Button variant="outline" size="sm">Write a Review</Button>
              </Link>
            </div>

            {reviews.length === 0 ? (
              <p className="text-xs text-muted">No reviews submitted yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-white rounded-2xl border border-border p-6 shadow-soft space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-amber-500" />
                            ))}
                          </div>
                          <h4 className="text-sm font-bold text-dark">{rev.title}</h4>
                        </div>
                      </div>
                      {rev.verified_employee && (
                        <span className="text-[11px] font-bold text-mint-800 bg-mint-50 px-2.5 py-1 rounded-full border border-mint-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-mint-600" /> Verified Employee
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{rev.review}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                      {rev.pros && (
                        <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                          <strong className="text-emerald-900 block mb-0.5">Pros:</strong>
                          <span className="text-slate-700">{rev.pros}</span>
                        </div>
                      )}
                      {rev.cons && (
                        <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                          <strong className="text-rose-900 block mb-0.5">Cons:</strong>
                          <span className="text-slate-700">{rev.cons}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
            <div className="space-y-3">
              <h3 className="text-base font-bold text-dark">About {company.name}</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{company.description || 'No description provided yet.'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border text-xs">
              <div className="space-y-1">
                <span className="text-muted">Website</span>
                <p className="font-semibold text-dark">{company.website || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted">Contact Email</span>
                <p className="font-semibold text-dark">{company.email || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted">Main Headquarters</span>
                <p className="font-semibold text-dark">{company.city || 'N/A'}, {company.province || ''}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
