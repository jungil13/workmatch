'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Star, CheckCircle2, Send, Building2 } from 'lucide-react';

export default function SeekerReviewsPage() {
  const [userId, setUserId] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [cultureRating, setCultureRating] = useState(5);
  const [mgmtRating, setMgmtRating] = useState(5);
  const [salaryRating, setSalaryRating] = useState(4);
  const [envRating, setEnvRating] = useState(5);
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
    });
    supabase.from('companies').select('id, name, city').order('name').then(({ data }) => {
      setCompanies(data ?? []);
      if (data && data.length > 0) setCompanyId(data[0].id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !userId) return;
    setSubmitting(true);
    await supabase.from('company_reviews').insert({
      company_id: companyId,
      reviewer_id: userId,
      rating,
      title,
      review: reviewText,
      work_culture_rating: cultureRating,
      management_rating: mgmtRating,
      salary_rating: salaryRating,
      work_environment_rating: envRating,
      pros,
      cons,
      verified_employee: isVerified,
      helpful_count: 0,
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <DashboardLayout
      portal="seeker"
      title="Write a Company Review"
      subtitle="Share your anonymous or verified workplace experience to help other job seekers."
    >
      <div className="max-w-3xl bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
        {submitted ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-mint-100 text-mint-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-dark">Review Published!</h3>
            <p className="text-xs text-muted max-w-md mx-auto">Thank you for helping other candidates make informed decisions.</p>
            <Button variant="primary" size="sm" onClick={() => { setSubmitted(false); setTitle(''); setReviewText(''); setPros(''); setCons(''); }}>
              Write Another Review
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {companies.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-muted">No companies in the system yet. Companies will appear here once employers register.</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Company *</label>
                  <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-dark focus:border-mint-500 focus:outline-none">
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Overall Rating *</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button type="button" key={star} onClick={() => setRating(star)}>
                        <Star className={`w-8 h-8 transition-colors ${star <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                      </button>
                    ))}
                    <span className="text-sm font-bold text-dark ml-2">{rating}.0 / 5.0</span>
                  </div>
                </div>

                <Input label="Review Headline *" placeholder="e.g. Great engineering culture and supportive leadership" value={title} onChange={e => setTitle(e.target.value)} required />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Full Review *</label>
                  <textarea rows={4} value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Describe your experience with the team, work-life balance, and growth opportunities..." className="w-full rounded-xl border border-border p-3 text-xs text-dark focus:border-mint-500 focus:outline-none" required />
                </div>

                {/* Sub-ratings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                  {[
                    { label: 'Work Culture', value: cultureRating, setter: setCultureRating },
                    { label: 'Management', value: mgmtRating, setter: setMgmtRating },
                    { label: 'Salary & Benefits', value: salaryRating, setter: setSalaryRating },
                    { label: 'Work Environment', value: envRating, setter: setEnvRating },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">{label}: {value}/5</label>
                      <input type="range" min="1" max="5" value={value} onChange={e => setter(Number(e.target.value))} className="w-full accent-mint-500" />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-emerald-800">Pros</label>
                    <textarea rows={3} value={pros} onChange={e => setPros(e.target.value)} placeholder="What did you like best?" className="w-full rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs text-dark focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-rose-800">Cons</label>
                    <textarea rows={3} value={cons} onChange={e => setCons(e.target.value)} placeholder="What could be improved?" className="w-full rounded-xl border border-rose-200 bg-rose-50/40 p-3 text-xs text-dark focus:outline-none" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="verifiedCheck" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} className="w-4 h-4 accent-mint-500 rounded" />
                  <label htmlFor="verifiedCheck" className="text-xs font-semibold text-slate-700">Tag as Verified Employee</label>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <Button type="submit" variant="primary" size="lg" isLoading={submitting} className="shadow-md font-bold">
                    <Send className="w-4 h-4" /> Publish Review
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
