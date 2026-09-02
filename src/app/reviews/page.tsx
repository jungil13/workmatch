'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Star, Building2, CheckCircle2, MessageSquare } from 'lucide-react';

export default function PublicReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('company_reviews')
      .select('*, company:companies(*)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1 rounded-full text-xs font-bold text-mint-800">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Transparent Workplace Culture
            </div>
            <h1 className="text-3xl font-black text-dark tracking-tight">
              Company Reviews & Workplace Insights
            </h1>
            <p className="text-sm text-muted">
              Authentic feedback from verified tech professionals across the Philippines.
            </p>
          </div>

          <Link href="/seeker/reviews">
            <Button variant="primary" size="md">Write a Review</Button>
          </Link>
        </div>

        {/* Reviews Listing */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-dark">No company reviews yet</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Be the first to contribute an anonymous workplace review and help candidate transparency.
            </p>
            <Link href="/seeker/reviews">
              <Button variant="primary" size="sm">Submit First Review</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-border flex items-center justify-center overflow-hidden shrink-0">
                      {rev.company?.logo_url ? (
                        <img src={rev.company.logo_url} alt={rev.company.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-dark">{rev.company?.name || 'Company'}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-dark">{rev.rating || 5}.0</span>
                      </div>
                    </div>
                  </div>

                  {rev.verified_employee && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-mint-800 bg-mint-50 px-3 py-1 rounded-full border border-mint-200 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-mint-600" /> Verified Employee
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-dark">{rev.title}</h4>
                  <p className="text-xs text-slate-700 leading-relaxed mt-1">{rev.review}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px] text-muted">
                  <div>Work Culture: <strong className="text-dark font-bold">{rev.work_culture_rating || 5}/5</strong></div>
                  <div>Management: <strong className="text-dark font-bold">{rev.management_rating || 5}/5</strong></div>
                  <div>Salary & Perks: <strong className="text-dark font-bold">{rev.salary_rating || 4}/5</strong></div>
                  <div>Environment: <strong className="text-dark font-bold">{rev.work_environment_rating || 5}/5</strong></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  {rev.pros && (
                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                      <strong className="text-emerald-900 block mb-0.5">Pros:</strong>
                      <span className="text-slate-700">{rev.pros}</span>
                    </div>
                  )}
                  {rev.cons && (
                    <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-100">
                      <strong className="text-rose-900 block mb-0.5">Cons:</strong>
                      <span className="text-slate-700">{rev.cons}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
