'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, CheckCircle2, AlertCircle, Search, X, ChevronDown, Check } from 'lucide-react';

const CITY_COORDS: Record<string, { lat: number; lng: number; province: string }> = {
  'Cebu City': { lat: 10.3157, lng: 123.8854, province: 'Cebu' },
  'Taguig / BGC': { lat: 14.5492, lng: 121.0509, province: 'Metro Manila' },
  'Makati City': { lat: 14.5547, lng: 121.0244, province: 'Metro Manila' },
  'Manila': { lat: 14.5995, lng: 120.9842, province: 'Metro Manila' },
  'Davao City': { lat: 7.1907, lng: 125.4553, province: 'Davao del Sur' },
  'Pasig City': { lat: 14.5764, lng: 121.0851, province: 'Metro Manila' },
  'Quezon City': { lat: 14.676, lng: 121.0437, province: 'Metro Manila' },
  'Mandaue City': { lat: 10.3236, lng: 123.9223, province: 'Cebu' },
  'Cagayan de Oro': { lat: 8.4822, lng: 124.6472, province: 'Misamis Oriental' },
  'Iloilo City': { lat: 10.7202, lng: 122.5621, province: 'Iloilo' },
};

// Category display order + color mapping
const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'All': { label: 'All Skills', color: 'text-slate-700', bg: 'bg-slate-100' },
  'Programming Language': { label: 'Programming', color: 'text-violet-700', bg: 'bg-violet-100' },
  'Framework': { label: 'Framework', color: 'text-blue-700', bg: 'bg-blue-100' },
  'Technical': { label: 'Technical', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  'Database': { label: 'Database', color: 'text-orange-700', bg: 'bg-orange-100' },
  'Cloud & DevOps': { label: 'Cloud & DevOps', color: 'text-sky-700', bg: 'bg-sky-100' },
  'Tool': { label: 'Tools', color: 'text-teal-700', bg: 'bg-teal-100' },
  'Design': { label: 'Design', color: 'text-pink-700', bg: 'bg-pink-100' },
  'Graphic Design': { label: 'Graphic Design', color: 'text-fuchsia-700', bg: 'bg-fuchsia-100' },
  'Customer Service': { label: 'Customer Service', color: 'text-amber-700', bg: 'bg-amber-100' },
  'Food Service': { label: 'Food Service', color: 'text-red-700', bg: 'bg-red-100' },
  'Construction': { label: 'Construction', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  'Office & Administration': { label: 'Office & Admin', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  'Microsoft Office': { label: 'Microsoft Office', color: 'text-blue-700', bg: 'bg-blue-50' },
  'Technician': { label: 'Technician', color: 'text-lime-700', bg: 'bg-lime-100' },
  'IT Support': { label: 'IT Support', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'Soft Skill': { label: 'Soft Skills', color: 'text-rose-700', bg: 'bg-rose-100' },
  'Other': { label: 'Other', color: 'text-slate-700', bg: 'bg-slate-100' },
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

  // Skill picker state
  const [skillSearch, setSkillSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
        const { data: comp } = await supabase.from('companies').select('id').limit(1).maybeSingle();
        if (comp) {
          setCompanyId(comp.id);
        } else {
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

    supabase.from('skills').select('*').order('category').order('name').then(({ data }) => {
      setAllSkills(data ?? []);
    });
  }, []);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const coords = CITY_COORDS[newCity];
    if (coords) setProvince(coords.province);
  };

  // Derive unique categories from loaded skills
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(allSkills.map(s => s.category)));
    return ['All', ...cats.sort()];
  }, [allSkills]);

  // Filter skills based on search + active category
  const filteredSkills = useMemo(() => {
    return allSkills.filter(skill => {
      const matchesSearch = skillSearch.trim() === '' ||
        skill.name.toLowerCase().includes(skillSearch.toLowerCase());
      const matchesCategory = activeCategory === 'All' || skill.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allSkills, skillSearch, activeCategory]);

  // Group filtered skills by category for dropdown display
  const groupedSkills = useMemo(() => {
    if (activeCategory !== 'All') {
      return { [activeCategory]: filteredSkills };
    }
    return filteredSkills.reduce((acc: Record<string, any[]>, skill) => {
      if (!acc[skill.category]) acc[skill.category] = [];
      acc[skill.category].push(skill);
      return acc;
    }, {});
  }, [filteredSkills, activeCategory]);

  const handleToggleSkill = (skillId: string) => {
    if (selectedSkills.find(s => s.skill_id === skillId)) {
      setSelectedSkills(prev => prev.filter(s => s.skill_id !== skillId));
    } else {
      setSelectedSkills(prev => [...prev, { skill_id: skillId, is_required: true, minimum_proficiency: 3 }]);
    }
  };

  const getSkillById = (skillId: string) => allSkills.find(s => s.id === skillId);

  const handleSubmit = async (status: 'published' | 'draft') => {
    setErrorMessage('');
    if (!title) { setErrorMessage('Please provide a Job Title.'); return; }
    if (!description) { setErrorMessage('Please provide a Job Description.'); return; }
    if (!companyId || !employerId) { setErrorMessage('Company or Employer account not found. Please re-login.'); return; }

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

  const selectCls = 'w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-500/20';

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

          {/* 1. Role Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-dark border-b border-border pb-2">1. Role Information</h3>
            <Input label="Job Title *" placeholder="e.g. Senior Frontend Engineer" value={title} onChange={e => setTitle(e.target.value)} required />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Employment Type *</label>
                <select value={employmentType} onChange={e => setEmploymentType(e.target.value)} className={selectCls}>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Work Arrangement *</label>
                <select value={workArrangement} onChange={e => setWorkArrangement(e.target.value)} className={selectCls}>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Experience Level *</label>
                <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} className={selectCls}>
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
                <select value={city} onChange={e => handleCityChange(e.target.value)} className={selectCls}>
                  {Object.keys(CITY_COORDS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input label="Province *" value={province} onChange={e => setProvince(e.target.value)} required />
            </div>
          </div>

          {/* 2. Compensation & Timeline */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-dark border-b border-border pb-2">2. Compensation & Timeline</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Min Monthly Salary (PHP) *" type="number" placeholder="40000" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} required />
              <Input label="Max Monthly Salary (PHP) *" type="number" placeholder="65000" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} required />
              <Input label="Application Deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>

          {/* 3. Role Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-dark border-b border-border pb-2">3. Role Details</h3>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Job Description *</label>
              <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Overview of the role, team, and day-to-day impact..." className="w-full rounded-2xl border border-border p-3 text-sm text-dark focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-500/20" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Key Responsibilities</label>
                <textarea rows={3} value={responsibilities} onChange={e => setResponsibilities(e.target.value)} placeholder={"• Develop responsive UI features\n• Collaborate with backend engineers"} className="w-full rounded-2xl border border-border p-3 text-sm text-dark focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-500/20" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Candidate Qualifications</label>
                <textarea rows={3} value={qualifications} onChange={e => setQualifications(e.target.value)} placeholder={"• 2+ years of experience in React/Next.js\n• Solid TypeScript foundation"} className="w-full rounded-2xl border border-border p-3 text-sm text-dark focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-500/20" />
              </div>
            </div>
          </div>

          {/* 4. Required Skills — Searchable Category Picker */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-dark border-b border-border pb-2">4. Required Skills for AI Candidate Matching</h3>
              <p className="text-xs text-muted mt-2">Search and select skills by industry category. WorkMatch calculates candidate compatibility scores based on these competencies.</p>
            </div>

            {/* Picker trigger + dropdown */}
            <div className="relative" ref={pickerRef}>
              {/* Category Tab Bar */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                {availableCategories.map(cat => {
                  const config = CATEGORY_CONFIG[cat] ?? { label: cat, color: 'text-slate-700', bg: 'bg-slate-100' };
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setActiveCategory(cat); setPickerOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
                      className={`flex-none px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                        isActive
                          ? `${config.bg} ${config.color} ring-2 ring-offset-1 ring-current/30`
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>

              {/* Search input that opens dropdown */}
              <div
                className="relative"
                onClick={() => { setPickerOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
              >
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={searchRef}
                  type="text"
                  value={skillSearch}
                  onChange={e => { setSkillSearch(e.target.value); setPickerOpen(true); }}
                  onFocus={() => setPickerOpen(true)}
                  placeholder={`Search ${activeCategory === 'All' ? 'all skills' : CATEGORY_CONFIG[activeCategory]?.label ?? activeCategory}...`}
                  className="flex h-11 w-full rounded-xl border border-border bg-white pl-10 pr-10 py-2 text-sm text-dark placeholder:text-muted transition-colors focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-500/20"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted">
                  <ChevronDown className={`w-4 h-4 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Dropdown list */}
              {pickerOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-2xl shadow-lg max-h-72 overflow-y-auto">
                  {Object.keys(groupedSkills).length === 0 ? (
                    <div className="p-4 text-xs text-muted text-center">No skills found for &quot;{skillSearch}&quot;</div>
                  ) : (
                    Object.entries(groupedSkills).map(([category, skills]) => {
                      const config = CATEGORY_CONFIG[category] ?? { label: category, color: 'text-slate-700', bg: 'bg-slate-50' };
                      return (
                        <div key={category}>
                          <div className={`sticky top-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${config.color} ${config.bg} border-b border-slate-100`}>
                            {config.label}
                          </div>
                          {(skills as any[]).map((skill: any) => {
                            const isSelected = selectedSkills.some(s => s.skill_id === skill.id);
                            return (
                              <button
                                key={skill.id}
                                type="button"
                                onClick={() => handleToggleSkill(skill.id)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                                  isSelected
                                    ? 'bg-mint-50 text-mint-800 font-semibold'
                                    : 'text-dark hover:bg-slate-50'
                                }`}
                              >
                                <span>{skill.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-mint-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected skills chips */}
            {selectedSkills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">{selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map(sel => {
                    const skill = getSkillById(sel.skill_id);
                    if (!skill) return null;
                    const config = CATEGORY_CONFIG[skill.category] ?? { color: 'text-slate-700', bg: 'bg-slate-100' };
                    return (
                      <span
                        key={sel.skill_id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${config.bg} ${config.color}`}
                      >
                        {skill.name}
                        <button
                          type="button"
                          onClick={() => handleToggleSkill(sel.skill_id)}
                          className="hover:opacity-70 transition-opacity"
                          aria-label={`Remove ${skill.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
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
