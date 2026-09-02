'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const CITY_COORDS: Record<string, { lat: number; lng: number; province: string }> = {
  'Cebu City': { lat: 10.3157, lng: 123.8854, province: 'Cebu' },
  'Taguig / BGC': { lat: 14.5492, lng: 121.0509, province: 'Metro Manila' },
  'Makati City': { lat: 14.5547, lng: 121.0244, province: 'Metro Manila' },
  'Manila': { lat: 14.5995, lng: 120.9842, province: 'Metro Manila' },
  'Davao City': { lat: 7.1907, lng: 125.4553, province: 'Davao del Sur' },
};

export default function CreateJobPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<{ skill_id: string; is_required: boolean; minimum_proficiency: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [salaryMin, setSalaryMin] = useState('40000');
  const [salaryMax, setSalaryMax] = useState('65000');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [workArrangement, setWorkArrangement] = useState('Hybrid');
  const [experienceLevel, setExperienceLevel] = useState('Mid Level');
  const [city, setCity] = useState('Cebu City');
  const [province, setProvince] = useState('Cebu');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setEmployerId(user.id);
      
      const { data: ep } = await supabase
        .from('employer_profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ep?.company_id) {
        setCompanyId(ep.company_id);
      } else {
        // Fallback: Check if a company exists or create default
        const { data: comp } = await supabase.from('companies').select('id').limit(1).maybeSingle();
        if (comp) {
          setCompanyId(comp.id);
        } else {
          // Create initial company
          const { data: newComp } = await supabase.from('companies').insert({
            name: 'My Company',
            slug: 'my-company-' + Date.now().toString().slice(-4),
            city: 'Cebu City',
            province: 'Cebu',
            industry: 'Software & Technology',
          }).select().maybeSingle();
          if (newComp) {
            setCompanyId(newComp.id);
            await supabase.from('employer_profiles').upsert({
              user_id: user.id,
              company_id: newComp.id,
              position: 'Hiring Manager',
            });
          }
        }
      }
    });

    supabase.from('skills').select('*').order('name').then(({ data }) => {
      setAllSkills(data ?? []);
    });
  }, []);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const coords = CITY_COORDS[newCity];
    if (coords) {
      setProvince(coords.province);
    }
  };

  const handleToggleSkill = (skillId: string) => {
    if (selectedSkills.find(s => s.skill_id === skillId)) {
      setSelectedSkills(prev => prev.filter(s => s.skill_id !== skillId));
    } else {
      setSelectedSkills(prev => [...prev, { skill_id: skillId, is_required: true, minimum_proficiency: 3 }]);
    }
  };

  const handleSubmit = async (status: 'published' | 'draft') => {
    setErrorMessage('');
    if (!title) {
      setErrorMessage('Please provide a Job Title.');
      return;
    }
    if (!description) {
      setErrorMessage('Please provide a Job Description.');
      return;
    }
    if (!companyId || !employerId) {
      setErrorMessage('Company or Employer account not found. Please re-login.');
      return;
    }

    setIsLoading(true);

    const coords = CITY_COORDS[city] || { lat: 10.3157, lng: 123.8854, province: 'Cebu' };

    const jobSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-6);

    const { data: job, error } = await supabase.from('jobs').insert({
      company_id: companyId,
      employer_id: employerId,
      title,
      slug: jobSlug,
      description,
      responsibilities: responsibilities || description,
      qualifications: qualifications || description,
      salary_min: Number(salaryMin) || 0,
      salary_max: Number(salaryMax) || 0,
      salary_currency: 'PHP',
      employment_type: employmentType,
      work_arrangement: workArrangement,
      experience_level: experienceLevel,
      city: city || 'Cebu City',
      province: province || coords.province,
      latitude: coords.lat,
      longitude: coords.lng,
      status,
      application_deadline: deadline ? deadline : null,
      views: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().maybeSingle();

    if (error) {
      console.error('Job creation error:', error);
      setErrorMessage(error.message || 'Failed to create job posting.');
      setIsLoading(false);
      return;
    }

    if (job && selectedSkills.length > 0) {
      // Insert into job_skills table
      await supabase.from('job_skills').insert(
        selectedSkills.map(s => ({
          job_id: job.id,
          skill_id: s.skill_id,
          is_required: s.is_required,
          minimum_proficiency: s.minimum_proficiency,
        }))
      );
    }

    setIsLoading(false);
    setSuccess(true);
    setTimeout(() => {
      window.location.href = '/employer/jobs';
    }, 1200);
  };

  return (
    <DashboardLayout
      portal="employer"
      title="Create Job Posting"
      subtitle="Define role requirements, skills, and compensation to attract the best-matched candidates."
      actions={
        <Link href="/employer/jobs">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /> Cancel</Button>
        </Link>
      }
    >
      <div className="max-w-4xl bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-2xl flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {errorMessage}
          </div>
        )}

        {success && (
          <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-4 rounded-2xl flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-mint-600" /> Job posting created successfully! Redirecting to jobs...
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); handleSubmit('published'); }} className="space-y-6">
          {/* Basic Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-dark border-b border-border pb-2">1. Role Information</h3>
            <Input label="Job Title *" placeholder="e.g. Senior Frontend Engineer" value={title} onChange={e => setTitle(e.target.value)} required />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Employment Type *</label>
                <select value={employmentType} onChange={e => setEmploymentType(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none">
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Work Arrangement *</label>
                <select value={workArrangement} onChange={e => setWorkArrangement(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none">
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Experience Level *</label>
                <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none">
                  <option value="Entry Level">Entry Level</option>
                  <option value="Mid Level">Mid Level</option>
                  <option value="Senior Level">Senior Level</option>
                  <option value="Lead / Manager">Lead / Manager</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">City / Location *</label>
                <select value={city} onChange={e => handleCityChange(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none">
                  <option value="Cebu City">Cebu City</option>
                  <option value="Taguig / BGC">Taguig / BGC</option>
                  <option value="Makati City">Makati City</option>
                  <option value="Manila">Manila</option>
                  <option value="Davao City">Davao City</option>
                </select>
              </div>

              <Input label="Province *" value={province} onChange={e => setProvince(e.target.value)} required />
            </div>
          </div>

          {/* Compensation & Timeline */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-dark border-b border-border pb-2">2. Compensation & Timeline</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Min Monthly Salary (PHP) *" type="number" placeholder="40000" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} required />
              <Input label="Max Monthly Salary (PHP) *" type="number" placeholder="65000" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} required />
              <Input label="Application Deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-dark border-b border-border pb-2">3. Role Details</h3>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Job Description *</label>
              <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Overview of the role, team, and day-to-day impact..." className="w-full rounded-2xl border border-border p-3 text-sm text-dark focus:border-mint-500 focus:outline-none" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Key Responsibilities</label>
                <textarea rows={3} value={responsibilities} onChange={e => setResponsibilities(e.target.value)} placeholder="• Develop responsive UI features&#10;• Collaborate with backend engineers" className="w-full rounded-2xl border border-border p-3 text-sm text-dark focus:border-mint-500 focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Candidate Qualifications</label>
                <textarea rows={3} value={qualifications} onChange={e => setQualifications(e.target.value)} placeholder="• 2+ years of experience in React/Next.js&#10;• Solid TypeScript foundation" className="w-full rounded-2xl border border-border p-3 text-sm text-dark focus:border-mint-500 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Required Skills Picker */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-dark border-b border-border pb-2">4. Required Skills for AI Candidate Matching</h3>
            <p className="text-xs text-muted">Select the skills required for this job. WorkMatch will calculate candidate compatibility scores based on these competencies.</p>
            <div className="flex flex-wrap gap-2">
              {allSkills.map(skill => {
                const isSelected = selectedSkills.some(s => s.skill_id === skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleToggleSkill(skill.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-mint-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {skill.name} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <Button type="button" variant="outline" onClick={() => handleSubmit('draft')} isLoading={isLoading}>
              Save as Draft
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading} className="shadow-md">
              Publish Job Opening
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
