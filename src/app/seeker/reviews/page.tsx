'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import {
  Star,
  CheckCircle2,
  AlertCircle,
  Send,
  Building2,
  ArrowRight,
  ShieldCheck,
  ThumbsUp,
} from 'lucide-react';

function SeekerReviewsForm() {
  const searchParams = useSearchParams();
  const preSelectedCompanyId = searchParams.get('companyId') || '';

  const [userId, setUserId] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState(preSelectedCompanyId);
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
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
    });

    supabase
      .from('companies')
      .select('id, name, city, province')
      .order('name')
      .then(({ data }) => {
        const list = data ?? [];
        setCompanies(list);
        if (preSelectedCompanyId) {
          setCompanyId(preSelectedCompanyId);
        } else if (list.length > 0) {
          setCompanyId(list[0].id);
        }
      });
  }, [preSelectedCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !userId) {
      setErrorMessage('Please select a company and ensure you are logged in.');
      return;
    }

    if (!title.trim() || !reviewText.trim()) {
      setErrorMessage('Please fill in both the headline and full review description.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.from('company_reviews').upsert(
        {
          company_id: companyId,
          reviewer_id: userId,
          rating,
          title: title.trim(),
          review: reviewText.trim(),
          work_culture_rating: cultureRating,
          management_rating: mgmtRating,
          salary_rating: salaryRating,
          work_environment_rating: envRating,
          pros: pros.trim() || null,
          cons: cons.trim() || null,
          verified_employee: isVerified,
          is_moderated: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,reviewer_id' }
      );

      if (error) {
        throw error;
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Submit review error:', err);
      setErrorMessage(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
      {submitted ? (
        <div className="text-center py-10 space-y-4">
          <div className="w-16 h-16 rounded-full bg-mint-100 text-mint-700 flex items-center justify-center mx-auto shadow-sm animate-in zoom-in">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-dark">Review Published Successfully!</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Thank you for contributing your workplace feedback to help tech talent across the Philippines.
            </p>
          </div>
          <div className="pt-3 flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/reviews">
              <Button variant="primary" size="sm">
                View Public Reviews Feed
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSubmitted(false);
                setTitle('');
                setReviewText('');
                setPros('');
                setCons('');
              }}
            >
              Write Another Review
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {companies.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-muted">
                No companies found in database. Reviews can be submitted once companies are created.
              </p>
            </div>
          ) : (
            <>
              {/* Select Company */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-dark uppercase tracking-wider">
                  Company *
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-xs text-dark focus:border-mint-500 focus:outline-none"
                  required
                >
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city}, {c.province})
                    </option>
                  ))}
                </select>
              </div>

              {/* Overall Rating */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-dark uppercase tracking-wider">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300 hover:text-amber-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-black text-dark ml-2">
                    {rating}.0 / 5.0
                  </span>
                </div>
              </div>

              {/* Headline */}
              <Input
                label="Review Headline *"
                placeholder="e.g. Great engineering culture, flexible hybrid schedule, and supportive leaders"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              {/* Full Review */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-dark uppercase tracking-wider">
                  Detailed Review *
                </label>
                <textarea
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Describe your everyday experience, management support, career trajectory, and team collaboration..."
                  className="w-full rounded-2xl border border-border p-3.5 text-xs text-dark focus:border-mint-500 focus:outline-none leading-relaxed"
                  required
                />
              </div>

              {/* Sub-ratings Breakdown */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h4 className="text-xs font-bold text-dark uppercase tracking-wider">
                  Detailed Category Ratings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Work Culture', value: cultureRating, setter: setCultureRating },
                    { label: 'Management & Leadership', value: mgmtRating, setter: setMgmtRating },
                    { label: 'Compensation & Benefits', value: salaryRating, setter: setSalaryRating },
                    { label: 'Work Environment & Tools', value: envRating, setter: setEnvRating },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{label}</span>
                        <span className="font-bold text-dark">{value}/5</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={value}
                        onChange={(e) => setter(Number(e.target.value))}
                        className="w-full accent-mint-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Pros
                  </label>
                  <textarea
                    rows={3}
                    value={pros}
                    onChange={(e) => setPros(e.target.value)}
                    placeholder="What are the best parts of working here?"
                    className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3 text-xs text-dark focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider">
                    Cons
                  </label>
                  <textarea
                    rows={3}
                    value={cons}
                    onChange={(e) => setCons(e.target.value)}
                    placeholder="What could be improved or optimized?"
                    className="w-full rounded-2xl border border-rose-200 bg-rose-50/30 p-3 text-xs text-dark focus:outline-none"
                  />
                </div>
              </div>

              {/* Verified badge checkbox */}
              <div className="flex items-center gap-2 p-3 bg-mint-50/50 rounded-2xl border border-mint-100">
                <input
                  type="checkbox"
                  id="verifiedEmp"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="w-4 h-4 accent-mint-500 rounded cursor-pointer"
                />
                <label htmlFor="verifiedEmp" className="text-xs font-bold text-dark cursor-pointer">
                  Tag as Verified Employee
                </label>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={submitting}
                  className="font-bold shadow-md"
                >
                  <Send className="w-4 h-4" /> Publish Review
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}

export default function SeekerReviewsPage() {
  return (
    <DashboardLayout
      portal="seeker"
      title="Write a Company Review"
      subtitle="Share your authentic workplace experience to empower tech candidates across the country."
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <SeekerReviewsForm />
      </Suspense>
    </DashboardLayout>
  );
}
