'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowLeft,
  UploadCloud,
  Camera,
  Briefcase,
  GraduationCap,
  Star,
  User,
} from 'lucide-react';

export default function SeekerProfileEditPage() {
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Job Seeker Profile fields
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [yearsExperience, setYearsExperience] = useState('1');
  const [salaryMin, setSalaryMin] = useState('');
  const [jobType, setJobType] = useState('Full-time');
  const [workArrangement, setWorkArrangement] = useState('Hybrid');
  const [availability, setAvailability] = useState('Immediate');

  // Skills
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [seekerSkills, setSeekerSkills] = useState<any[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [proficiency, setProficiency] = useState(3);

  // Education
  const [educations, setEducations] = useState<any[]>([]);
  const [newEdu, setNewEdu] = useState({
    degree: '',
    field_of_study: '',
    school_name: '',
    start_year: '',
    end_year: '',
  });

  // Work Experience
  const [experiences, setExperiences] = useState<any[]>([]);
  const [newExp, setNewExp] = useState({
    job_title: '',
    company_name: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      fetchAll(user.id, user);
    });
  }, []);

  async function fetchAll(uid: string, authUser: any) {
    const [profileRes, seekerRes, skillsRes, seekerSkillsRes, eduRes, expRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('job_seeker_profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('skills').select('*').order('name'),
      supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', uid),
      supabase.from('educations').select('*').eq('user_id', uid),
      supabase.from('work_experiences').select('*').eq('user_id', uid),
    ]);

    const p = profileRes.data;
    const sp = seekerRes.data;
    const meta = authUser.user_metadata;

    const fallbackFirst =
      meta?.first_name ||
      meta?.full_name?.split(' ')[0] ||
      meta?.name?.split(' ')[0] ||
      authUser.email?.split('@')[0] ||
      '';
    const fallbackLast =
      meta?.last_name ||
      meta?.full_name?.split(' ').slice(1).join(' ') ||
      meta?.name?.split(' ').slice(1).join(' ') ||
      '';
    const fallbackAvatar = meta?.avatar_url || meta?.picture || '';

    setFirstName(p?.first_name || fallbackFirst);
    setLastName(p?.last_name || fallbackLast);
    setPhone(p?.phone || '');
    setAvatarUrl(p?.avatar_url || fallbackAvatar);

    setTitle(sp?.professional_title || '');
    setBio(sp?.bio || '');
    setCity(sp?.city || 'Cebu City');
    setProvince(sp?.province || 'Cebu');
    setYearsExperience(sp?.years_experience?.toString() || '1');
    setSalaryMin(sp?.preferred_salary_min?.toString() || '');
    setJobType(sp?.preferred_job_type || 'Full-time');
    setWorkArrangement(sp?.preferred_work_arrangement || 'Hybrid');

    // Ensure availability matches allowed DB values
    const validAvailabilities = [
      'Immediate',
      '2 Weeks Notice',
      '1 Month Notice',
      'Actively Looking',
      'Casually Exploring',
    ];
    if (sp?.availability && validAvailabilities.includes(sp.availability)) {
      setAvailability(sp.availability);
    } else {
      setAvailability('Immediate');
    }

    setAllSkills(skillsRes.data ?? []);
    setSeekerSkills(seekerSkillsRes.data ?? []);
    setEducations(eduRes.data ?? []);
    setExperiences(expRes.data ?? []);
    setLoading(false);
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    setUploadingAvatar(true);
    setErrorMessage('');

    try {
      const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `avatars/${userId}/${Date.now()}_${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        console.warn('Avatar upload note:', uploadError.message);
      }

      // Generate public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      setErrorMessage('Failed to upload image. You can also paste an image URL.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSaved(false);

    try {
      // 1. Update public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 2. Upsert public.job_seeker_profiles
      const { error: seekerError } = await supabase
        .from('job_seeker_profiles')
        .upsert(
          {
            user_id: userId,
            professional_title: title.trim(),
            bio: bio.trim(),
            city: city.trim(),
            province: province.trim(),
            years_experience: Number(yearsExperience) || 0,
            preferred_salary_min: salaryMin ? Number(salaryMin) : null,
            preferred_job_type: jobType,
            preferred_work_arrangement: workArrangement,
            availability: availability,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (seekerError) throw seekerError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      console.error('Save profile error:', err);
      setErrorMessage(err.message || 'Failed to save profile. Please check all fields.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async () => {
    if (!selectedSkillId) return;
    const { error } = await supabase.from('job_seeker_skills').upsert(
      {
        user_id: userId,
        skill_id: selectedSkillId,
        proficiency,
        verified: false,
        source: 'Self',
      },
      { onConflict: 'user_id,skill_id' }
    );
    if (!error) {
      const { data } = await supabase
        .from('job_seeker_skills')
        .select('*, skill:skills(*)')
        .eq('user_id', userId);
      setSeekerSkills(data ?? []);
      setSelectedSkillId('');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    await supabase.from('job_seeker_skills').delete().eq('id', id);
    setSeekerSkills((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddEducation = async () => {
    if (!newEdu.school_name || !newEdu.degree) return;
    const { data, error } = await supabase
      .from('educations')
      .insert({
        user_id: userId,
        degree: newEdu.degree.trim(),
        field_of_study: newEdu.field_of_study.trim() || 'General Studies',
        school_name: newEdu.school_name.trim(),
        start_year: newEdu.start_year.trim() || '2018',
        end_year: newEdu.end_year.trim() || '2022',
        start_date: newEdu.start_year ? `${newEdu.start_year}-01-01` : '2018-01-01',
        end_date: newEdu.end_year ? `${newEdu.end_year}-01-01` : '2022-01-01',
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      setEducations((prev) => [data, ...prev]);
      setNewEdu({ degree: '', field_of_study: '', school_name: '', start_year: '', end_year: '' });
    }
  };

  const handleDeleteEducation = async (id: string) => {
    await supabase.from('educations').delete().eq('id', id);
    setEducations((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddExperience = async () => {
    if (!newExp.job_title || !newExp.company_name) return;
    const { data, error } = await supabase
      .from('work_experiences')
      .insert({
        user_id: userId,
        job_title: newExp.job_title.trim(),
        company_name: newExp.company_name.trim(),
        start_date: newExp.start_date || new Date().toISOString().split('T')[0],
        end_date: newExp.is_current ? null : newExp.end_date || null,
        is_current: newExp.is_current,
        description: newExp.description.trim(),
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      setExperiences((prev) => [data, ...prev]);
      setNewExp({
        job_title: '',
        company_name: '',
        start_date: '',
        end_date: '',
        is_current: false,
        description: '',
      });
    }
  };

  const handleDeleteExperience = async (id: string) => {
    await supabase.from('work_experiences').delete().eq('id', id);
    setExperiences((prev) => prev.filter((e) => e.id !== id));
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
      subtitle="Keep your profile information accurate to maximize job recommendations and employer match scores."
      actions={
        <Link href="/seeker/profile">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" /> View Profile
          </Button>
        </Link>
      }
    >
      <div className="max-w-3xl space-y-6">
        {saved && (
          <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-4 rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-mint-600 shrink-0" />
            <span>Profile successfully updated in Supabase database!</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Basic Info Form */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-5">
          <h3 className="text-sm font-bold text-dark uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-mint-600" /> Personal & Account Information
          </h3>

          {/* Profile Picture Upload & Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="relative group shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-mint-200 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-mint-500 text-white font-black text-xl flex items-center justify-center shadow-sm">
                  {firstName?.[0] || 'U'}{lastName?.[0] || ''}
                </div>
              )}
            </div>

            <div className="space-y-1.5 flex-1 text-center sm:text-left">
              <label className="block text-xs font-bold text-dark">Profile Photo</label>
              <p className="text-[11px] text-muted">
                Upload a professional photo or use your synced Google account picture.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                <input
                  type="file"
                  id="avatarFileInput"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="avatarFileInput"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-mint-600" />
                  {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-xs text-rose-600 hover:underline px-2 py-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="+63 912 345 6789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Professional Title"
              placeholder="e.g. Full Stack Developer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Professional Bio</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Briefly describe your career focus, technical expertise, and what roles you are seeking..."
              className="w-full rounded-xl border border-border p-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-xs text-dark focus:border-mint-500 focus:outline-none"
              >
                <option value="Cebu City">Cebu City</option>
                <option value="Mandaue City">Mandaue City</option>
                <option value="Lapu-Lapu City">Lapu-Lapu City</option>
                <option value="Taguig">Taguig / BGC</option>
                <option value="Makati">Makati City</option>
                <option value="Manila">Manila</option>
                <option value="Quezon City">Quezon City</option>
                <option value="Pasig">Pasig City</option>
                <option value="Davao City">Davao City</option>
                <option value="Iloilo City">Iloilo City</option>
              </select>
            </div>

            <Input
              label="Province / Region"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-xs text-dark focus:border-mint-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Expected Monthly Salary (PHP)"
              type="number"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              placeholder="e.g. 50000"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Work Setup</label>
              <select
                value={workArrangement}
                onChange={(e) => setWorkArrangement(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-xs text-dark focus:border-mint-500 focus:outline-none"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Availability</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-xs text-dark focus:border-mint-500 focus:outline-none"
              >
                <option value="Immediate">Immediate</option>
                <option value="2 Weeks Notice">2 Weeks Notice</option>
                <option value="1 Month Notice">1 Month Notice</option>
                <option value="Actively Looking">Actively Looking</option>
                <option value="Casually Exploring">Casually Exploring</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" variant="primary" size="md" isLoading={saving} className="font-bold shadow-sm">
              <Save className="w-4 h-4" /> Save Profile
            </Button>
          </div>
        </form>

        {/* Skills Manager */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-dark uppercase tracking-wider flex items-center gap-2">
            <Star className="w-4 h-4 text-mint-600" /> Skills & Proficiencies
          </h3>
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Skill</label>
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-white px-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
              >
                <option value="">Select from taxonomy...</option>
                {allSkills.map((sk: any) => (
                  <option key={sk.id} value={sk.id}>
                    {sk.name} ({sk.category})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-28">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Level (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={proficiency}
                onChange={(e) => setProficiency(Number(e.target.value))}
                className="w-full h-11 rounded-xl border border-border px-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
              />
            </div>
            <Button type="button" variant="primary" size="md" onClick={handleAddSkill} className="w-full sm:w-auto">
              <Plus className="w-4 h-4" /> Add Skill
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {seekerSkills.map((sk: any) => (
              <div
                key={sk.id}
                className="flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-mint-800"
              >
                <span>{sk.skill?.name} — Lvl {sk.proficiency}/5</span>
                <button
                  type="button"
                  onClick={() => handleDeleteSkill(sk.id)}
                  className="text-mint-600 hover:text-rose-500 ml-1 p-0.5"
                  title="Remove skill"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Work Experience Manager */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-dark uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-mint-600" /> Work Experience
          </h3>
          <div className="space-y-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Job Title"
                placeholder="e.g. Senior Frontend Developer"
                value={newExp.job_title}
                onChange={(e) => setNewExp((p) => ({ ...p, job_title: e.target.value }))}
              />
              <Input
                label="Company Name"
                placeholder="e.g. TechCorp Solutions"
                value={newExp.company_name}
                onChange={(e) => setNewExp((p) => ({ ...p, company_name: e.target.value }))}
              />
              <Input
                label="Start Date"
                type="date"
                value={newExp.start_date}
                onChange={(e) => setNewExp((p) => ({ ...p, start_date: e.target.value }))}
              />
              <Input
                label="End Date (if applicable)"
                type="date"
                disabled={newExp.is_current}
                value={newExp.end_date}
                onChange={(e) => setNewExp((p) => ({ ...p, end_date: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCurrentExp"
                checked={newExp.is_current}
                onChange={(e) => setNewExp((p) => ({ ...p, is_current: e.target.checked }))}
                className="w-4 h-4 accent-mint-500 rounded"
              />
              <label htmlFor="isCurrentExp" className="text-xs font-semibold text-slate-700">
                I currently work here
              </label>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Description / Key Achievements</label>
              <textarea
                rows={2}
                value={newExp.description}
                onChange={(e) => setNewExp((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe your role and impact..."
                className="w-full rounded-xl border border-border p-2.5 text-xs text-dark focus:border-mint-500 focus:outline-none"
              />
            </div>

            <Button type="button" variant="mint-soft" size="sm" onClick={handleAddExperience}>
              <Plus className="w-4 h-4" /> Add Experience Record
            </Button>
          </div>

          <div className="space-y-2">
            {experiences.map((exp: any) => (
              <div
                key={exp.id}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center gap-3"
              >
                <div>
                  <h4 className="text-xs font-bold text-dark">{exp.job_title}</h4>
                  <p className="text-[11px] text-mint-700 font-semibold">{exp.company_name}</p>
                  <p className="text-[10px] text-muted">
                    {exp.start_date} — {exp.is_current ? 'Present' : exp.end_date || 'Present'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteExperience(exp.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Education Manager */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-dark uppercase tracking-wider flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-mint-600" /> Education
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
            <Input
              label="Degree"
              placeholder="e.g. Bachelor of Science"
              value={newEdu.degree}
              onChange={(e) => setNewEdu((p) => ({ ...p, degree: e.target.value }))}
            />
            <Input
              label="Field of Study"
              placeholder="e.g. Information Technology"
              value={newEdu.field_of_study}
              onChange={(e) => setNewEdu((p) => ({ ...p, field_of_study: e.target.value }))}
            />
            <Input
              label="School / University"
              placeholder="e.g. University of San Carlos"
              value={newEdu.school_name}
              onChange={(e) => setNewEdu((p) => ({ ...p, school_name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Start Year"
                placeholder="2018"
                value={newEdu.start_year}
                onChange={(e) => setNewEdu((p) => ({ ...p, start_year: e.target.value }))}
              />
              <Input
                label="End Year"
                placeholder="2022"
                value={newEdu.end_year}
                onChange={(e) => setNewEdu((p) => ({ ...p, end_year: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 pt-1">
              <Button type="button" variant="mint-soft" size="sm" onClick={handleAddEducation}>
                <Plus className="w-4 h-4" /> Add Education Record
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {educations.map((edu: any) => (
              <div
                key={edu.id}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center gap-3"
              >
                <div>
                  <h4 className="text-xs font-bold text-dark">
                    {edu.degree} in {edu.field_of_study}
                  </h4>
                  <p className="text-[11px] text-mint-700 font-semibold">{edu.school_name}</p>
                  <p className="text-[10px] text-muted">
                    {edu.start_year || edu.start_date || ''} — {edu.end_year || edu.end_date || 'Graduated'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteEducation(edu.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
