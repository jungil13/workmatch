'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Star, CheckCircle2, Trash2, MessageSquare } from 'lucide-react';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    const { data } = await supabase
      .from('company_reviews')
      .select('*, company:companies(*)')
      .order('created_at', { ascending: false });
    setReviews(data ?? []);
    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    await supabase.from('company_reviews').delete().eq('id', id);
    await supabase.from('audit_logs').insert({
      action: 'Admin deleted company review',
      entity_type: 'company_review',
      entity_id: id,
      created_at: new Date().toISOString(),
    });
    fetchReviews();
  };

  return (
    <DashboardLayout
      portal="admin"
      title="Company Reviews Moderation"
      subtitle="Review and moderate candidate company reviews across the platform."
    >
      <div className="space-y-4 max-w-5xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No company reviews yet</h3>
            <p className="text-xs text-muted">Submitted candidate company reviews will appear here for moderation.</p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-dark">{rev.company?.name || 'Company'}</h4>
                    <div className="flex items-center text-amber-500">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                      ))}
                    </div>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 mt-1">{rev.title}</h5>
                </div>

                {rev.verified_employee && (
                  <span className="text-[11px] font-bold text-mint-800 bg-mint-50 px-2.5 py-0.5 rounded-full border border-mint-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-mint-600" /> Verified Employee
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{rev.review}</p>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(rev.id)}
                  className="text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Review
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
