'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Save, CheckCircle2, Plus, Trash2, ArrowLeft } from 'lucide-react';

export default function SeekerProfileEditPage() {
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [jobType, setJobType] = useState('');
  const [availability, setAvailability] = useState('Immediately Available');

  // Skills
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [seekerSkills, setSeekerSkills] = useState<any[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [proficiency, setProficiency] = useState(3);

  // Education
  const [educations, setEducations] = useState<any[]>([]);
  const [newEdu, setNewEdu] = useState({ degree: '', field_of_study: '', school_name: '', start_year: '', end_year: '' });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      fetchAll(user.id);
    });
  }, []);

  async function fetchAll(uid: string) {
    const [profileRes, seekerRes, skillsRes, seekerSkillsRes, eduRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('job_seeker_profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('skills').select('*').order('name'),
      supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', uid),
      supabase.from('educations').select('*').eq('user_id', uid),
    ]);

    const p = profileRes.data;
    const sp = seekerRes.data;
    setFirstName(p?.first_name ?? '');
    setLastName(p?.last_name ?? '');
    setPhone(p?.phone ?? '');
    setTitle(sp?.professional_title ?? '');
    setBio(sp?.bio ?? '');
    setCity(sp?.city ?? '');
    setProvince(sp?.province ?? '');
    setSalaryMin(sp?.preferred_salary_min?.toString() ?? '');
    setJobType(sp?.preferred_job_type ?? '');
    setAvailability(sp?.availability ?? 'Immediately Available');
    setAllSkills(skillsRes.data ?? []);
    setSeekerSkills(seekerSkillsRes.data ?? []);
    setEducations(eduRes.data ?? []);
    setLoading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await Promise.all([
      supabase.from('profiles').update({ first_name: firstName, last_name: lastName, phone, updated_at: new Date().toISOString() }).eq('id', userId),
      supabase.from('job_seeker_profiles').upsert({
        user_id: userId,
        professional_title: title,
        bio,
        city,
        province,
        preferred_salary_min: salaryMin ? Number(salaryMin) : null,
        preferred_job_type: jobType,
        availability,
        updated_at: new Date().toISOString(),
      }),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddSkill = async () => {
    if (!selectedSkillId) return;
    const { error } = await supabase.from('job_seeker_skills').upsert({
      user_id: userId, skill_id: selectedSkillId, proficiency, verified: false,
    });
    if (!error) {
      const { data } = await supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', userId);
      setSeekerSkills(data ?? []);
      setSelectedSkillId('');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    await supabase.from('job_seeker_skills').delete().eq('id', id);
    setSeekerSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleAddEducation = async () => {
    if (!newEdu.school_name || !newEdu.degree) return;
    const { data, error } = await supabase.from('educations').insert({ ...newEdu, user_id: userId }).select().maybeSingle();
    if (!error && data) {
      setEducations(prev => [data, ...prev]);
      setNewEdu({ degree: '', field_of_study: '', school_name: '', start_year: '', end_year: '' });
    }
  };

  const handleDeleteEducation = async (id: string) => {
    await supabase.from('educations').delete().eq('id', id);
    setEducations(prev => prev.filter(e => e.id !== id));
  };

  if (loading) {
    return (
      <DashboardLayout portal="seeker" title="Edit Profile">
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      portal="seeker"
      title="Edit Profile"
      subtitle="Keep your information up-to-date to maximize employer match accuracy."
      actions={
        <Link href="/seeker/profile">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /> View Profile</Button>
        </Link>
      }
    >
      <div className="max-w-3xl space-y-6">
        {saved && (
          <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-mint-600" /> Profile saved successfully!
          </div>
        )}

        {/* Basic Info */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-5">
          <h3 className="text-sm font-bold text-dark uppercase tracking-wider">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            <Input label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required />
          </div>
          <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
          <Input label="Professional Title" placeholder="e.g. Frontend Developer" value={title} onChange={e => setTitle(e.target.value)} />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Professional Bio</label>
            <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell employers about yourself..." className="w-full rounded-xl border border-border p-3 text-xs text-dark focus:border-mint-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">City</label>
              <select value={city} onChange={e => setCity(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-dark focus:border-mint-500 focus:outline-none">
                <option value="">Select City</option>
                <option value="Cebu City">Cebu City</option>
                <option value="Mandaue City">Mandaue City</option>
                <option value="Lapu-Lapu City">Lapu-Lapu City</option>
                <option value="Taguig">Taguig / BGC</option>
                <option value="Makati">Makati City</option>
                <option value="Manila">Manila</option>
                <option value="Davao City">Davao City</option>
              </select>
            </div>
            <Input label="Province" value={province} onChange={e => setProvince(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Expected Monthly Salary (PHP)" type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="e.g. 45000" />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Availability</label>
              <select value={availability} onChange={e => setAvailability(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-dark focus:border-mint-500 focus:outline-none">
                <option value="Immediately Available">Immediately Available</option>
                <option value="2 Weeks Notice">2 Weeks Notice</option>
                <option value="1 Month Notice">1 Month Notice</option>
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" variant="primary" size="md" isLoading={saving}>
              <Save className="w-4 h-4" /> Save Profile
            </Button>
          </div>
        </form>

        {/* Skills Manager */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-dark uppercase tracking-wider">Skills</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Add Skill</label>
              <select value={selectedSkillId} onChange={e => setSelectedSkillId(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none">
                <option value="">Select a skill...</option>
                {allSkills.map((sk: any) => (
                  <option key={sk.id} value={sk.id}>{sk.name}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Level (1-5)</label>
              <input type="number" min={1} max={5} value={proficiency} onChange={e => setProficiency(Number(e.target.value))} className="w-full h-11 rounded-xl border border-border px-3 text-sm text-dark focus:border-mint-500 focus:outline-none" />
            </div>
            <Button type="button" variant="primary" size="md" onClick={handleAddSkill}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {seekerSkills.map((sk: any) => (
              <div key={sk.id} className="flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-mint-800">
                {sk.skill?.name} â€” Lvl {sk.proficiency}/5
                <button onClick={() => handleDeleteSkill(sk.id)} className="text-mint-600 hover:text-rose-500 ml-1"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Education Manager */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-dark uppercase tracking-wider">Education</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Degree" placeholder="e.g. Bachelor of Science" value={newEdu.degree} onChange={e => setNewEdu(p => ({ ...p, degree: e.target.value }))} />
            <Input label="Field of Study" placeholder="e.g. Information Technology" value={newEdu.field_of_study} onChange={e => setNewEdu(p => ({ ...p, field_of_study: e.target.value }))} />
            <Input label="School / University" placeholder="e.g. University of San Carlos" value={newEdu.school_name} onChange={e => setNewEdu(p => ({ ...p, school_name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Start Year" placeholder="2018" value={newEdu.start_year} onChange={e => setNewEdu(p => ({ ...p, start_year: e.target.value }))} />
              <Input label="End Year" placeholder="2022" value={newEdu.end_year} onChange={e => setNewEdu(p => ({ ...p, end_year: e.target.value }))} />
            </div>
          </div>
          <Button type="button" variant="mint-soft" size="sm" onClick={handleAddEducation}>
            <Plus className="w-4 h-4" /> Add Education
          </Button>
          <div className="space-y-2">
            {educations.map((edu: any) => (
              <div key={edu.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-dark">{edu.degree} in {edu.field_of_study}</h4>
                  <p className="text-xs text-mint-700">{edu.school_name} â€¢ {edu.start_year}â€“{edu.end_year || 'Present'}</p>
                </div>
                <button onClick={() => handleDeleteEducation(edu.id)} className="text-rose-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

