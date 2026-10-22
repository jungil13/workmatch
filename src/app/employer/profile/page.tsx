'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VerifiedCompanyBadge } from '@/components/ui/VerifiedCompanyBadge';
import { supabase } from '@/lib/supabase/client';
import { useToast, useConfirm } from '@/components/ui/Toast';
import {
  Building2,
  ShieldCheck,
  Save,
  CheckCircle2,
  User,
  Briefcase,
  AlertCircle,
  Globe,
  Mail,
  Phone,
  MapPin,
  Flame,
  FileText,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

interface PermitSubmission {
  id: string;
  status: string;
  permit_file_name: string;
  permit_mime_type: string;
  permit_file_size: number;
  signed_url: string;
  admin_notes: string | null;
}

const CITY_PROVINCE_MAP: Record<string, string> = {
  'Cebu City': 'Cebu',
  'Taguig / BGC': 'Metro Manila',
  'Makati City': 'Metro Manila',
  'Manila': 'Metro Manila',
  'Davao City': 'Davao del Sur',
  'Pasig City': 'Metro Manila',
  'Quezon City': 'Metro Manila',
};

export default function EmployerProfilePage() {
  const toast = useToast();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();
  const [userId, setUserId] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Recruiter Profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [recruiterPhone, setRecruiterPhone] = useState('');
  const [position, setPosition] = useState('Hiring Manager / Recruiter');

  // Company Profile
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Software & Technology');
  const [website, setWebsite] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Cebu City');
  const [province, setProvince] = useState('Cebu');
  const [description, setDescription] = useState('');
  const [isCompanyUrgent, setIsCompanyUrgent] = useState(false);
  const [facebookUrl, setFacebookUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [otherSocialUrl, setOtherSocialUrl] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('unverified');
  const [permitSubmission, setPermitSubmission] = useState<PermitSubmission | null>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [permitPreviewUrl, setPermitPreviewUrl] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  // UI State
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadPermitSubmission(showError = false) {
    try {
      const response = await fetch('/api/company/verification');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load the business permit.');

      const submission = result.verification as PermitSubmission | null;
      setPermitSubmission(submission);
      if (submission) setVerificationStatus(submission.status);
    } catch (error) {
      console.error('Could not load employer business permit:', error);
      if (showError) {
        setVerifyMsg(error instanceof Error ? error.message : 'Could not load the business permit.');
      }
    }
  }

  useEffect(() => {
    if (!permitFile) {
      setPermitPreviewUrl('');
      return;
    }

    const previewUrl = URL.createObjectURL(permitFile);
    setPermitPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [permitFile]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const permitNotice = sessionStorage.getItem('employer-permit-notice');
      if (permitNotice) {
        setVerifyMsg(permitNotice);
        sessionStorage.removeItem('employer-permit-notice');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoading(false);
        return;
      }
      if (active) setUserId(user.id);

      // 1. Fetch user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (userProfile) {
        setFirstName(userProfile.first_name || '');
        setLastName(userProfile.last_name || '');
        setRecruiterPhone(userProfile.phone || '');
      } else {
        const meta = user.user_metadata;
        setFirstName(meta?.first_name || user.email?.split('@')[0] || '');
        setLastName(meta?.last_name || '');
      }

      // 2. Fetch employer profile + company
      const { data: ep } = await supabase
        .from('employer_profiles')
        .select('company_id, position, company:companies(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ep) {
        if (ep.position) setPosition(ep.position);
        if (ep.company_id) {
          setCompanyId(ep.company_id);
          await loadPermitSubmission();
        }

        if (ep.company) {
          const c = ep.company as any;
          setCompanyName(c.name || '');
          setIndustry(c.industry || 'Software & Technology');
          setWebsite(c.website || '');
          setCompanyEmail(c.email || '');
          setCompanyPhone(c.phone || '');
          setAddress(c.address || '');
          setCity(c.city || 'Cebu City');
          setProvince(c.province || 'Cebu');
          setDescription(c.description || '');
          setIsCompanyUrgent(Boolean(c.is_urgent));
          setFacebookUrl(c.facebook_url || '');
          setLinkedinUrl(c.linkedin_url || '');
          setInstagramUrl(c.instagram_url || '');
          setOtherSocialUrl(c.other_social_url || '');
          setVerificationStatus(c.verification_status || (c.verified ? 'approved' : 'unverified'));
        }
      }

      if (active) setLoading(false);
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`company-verification-${companyId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'companies', filter: `id=eq.${companyId}` },
        (payload) => {
          const company = payload.new as { verification_status?: string; verified?: boolean };
          setVerificationStatus(company.verification_status || (company.verified ? 'approved' : 'unverified'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_verifications', filter: `company_id=eq.${companyId}` },
        () => {
          void loadPermitSubmission(true);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Company verification realtime subscription failed: ${status}`);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId]);

  const deletePermitSubmission = async () => {
    if (!permitSubmission) return;
    const ok = await confirmDialog('Permanently delete this business permit submission?', {
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      type: 'error',
    });
    if (!ok) return;

    setVerifyBusy(true);
    setVerifyMsg('');
    try {
      const response = await fetch('/api/company/verification', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId: permitSubmission.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete the business permit.');

      setPermitSubmission(null);
      setPermitFile(null);
      setVerificationStatus('unverified');
      setVerifyMsg('Business permit deleted.');
      toast.success('Permit deleted', 'Your business permit submission was removed.');
      await loadPermitSubmission(true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not delete the business permit.';
      setVerifyMsg(msg);
      toast.error('Delete failed', msg);
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    if (CITY_PROVINCE_MAP[newCity]) {
      setProvince(CITY_PROVINCE_MAP[newCity]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSaving(true);
    setErrorMessage('');
    setSaved(false);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw new Error(`Could not verify your account: ${authError.message}`);
      if (!user?.email || user.id !== userId) {
        throw new Error('Your account email is unavailable. Sign in again and retry.');
      }

      // 1. Update personal recruiter profile in public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          phone: recruiterPhone || null,
          role: 'employer',
          status: 'active',
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Error saving personal profile:', profileError);
        throw new Error(profileError.message);
      }

      // 2. Save or create company in public.companies
      let currentCompanyId = companyId;

      if (currentCompanyId) {
        // Update existing company
        const compPayload: any = {
          name: companyName || 'My Company',
          industry,
          website: website || null,
          email: companyEmail || null,
          phone: companyPhone || null,
          address: address || null,
          city: city || 'Cebu City',
          province: province || 'Cebu',
          description: description || null,
          facebook_url: facebookUrl || null,
          linkedin_url: linkedinUrl || null,
          instagram_url: instagramUrl || null,
          other_social_url: otherSocialUrl || null,
          is_urgent: isCompanyUrgent,
          updated_at: new Date().toISOString(),
        };

        let { error: companyError } = await supabase
          .from('companies')
          .update(compPayload)
          .eq('id', currentCompanyId);

        if (companyError && companyError.message?.includes('is_urgent')) {
          delete compPayload.is_urgent;
          const retry = await supabase.from('companies').update(compPayload).eq('id', currentCompanyId);
          companyError = retry.error;
        }

        if (companyError) {
          console.error('Error updating company:', companyError);
          throw new Error(companyError.message);
        }
      } else {
        // Create brand new company record
        const compSlug = (companyName || 'company')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);

        const newCompPayload: any = {
          name: companyName || 'My Company',
          slug: compSlug,
          industry,
          website: website || null,
          email: companyEmail || null,
          phone: companyPhone || null,
          address: address || null,
          city: city || 'Cebu City',
          province: province || 'Cebu',
          description: description || null,
          is_urgent: isCompanyUrgent,
          verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        let { data: newComp, error: insertCompError } = await supabase
          .from('companies')
          .insert(newCompPayload)
          .select()
          .maybeSingle();

        if (insertCompError && insertCompError.message?.includes('is_urgent')) {
          delete newCompPayload.is_urgent;
          const retry = await supabase.from('companies').insert(newCompPayload).select().maybeSingle();
          newComp = retry.data;
          insertCompError = retry.error;
        }

        if (insertCompError) {
          console.error('Error inserting company:', insertCompError);
          throw new Error(insertCompError.message);
        }

        if (newComp) {
          currentCompanyId = newComp.id;
          setCompanyId(newComp.id);
        }
      }

      // 3. Update or create employer_profiles record
      // Use update-first approach to avoid unique constraint conflict with RLS-restricted upsert
      const epPayload = {
        company_id: currentCompanyId,
        position: position || 'Hiring Manager',
        updated_at: new Date().toISOString(),
      };

      const { data: existingEp, error: epFetchError } = await supabase
        .from('employer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (epFetchError) {
        console.error('Error checking employer profile:', epFetchError);
        throw new Error(epFetchError.message);
      }

      let epError: any = null;
      if (existingEp) {
        // Row exists — update it
        const { error } = await supabase
          .from('employer_profiles')
          .update(epPayload)
          .eq('user_id', userId);
        epError = error;
      } else {
        // No row yet — insert a fresh one
        const { error } = await supabase
          .from('employer_profiles')
          .insert({ user_id: userId, ...epPayload });
        epError = error;
      }

      if (epError) {
        console.error('Error updating employer profile:', epError);
        throw new Error(epError.message);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save employer profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <DashboardLayout
      portal="employer"
      title="Company Profile & Branding"
      subtitle="Manage your recruiter details, company brand, office locations, and contact info."
    >
      <div className="max-w-4xl space-y-6">
        {saved && (
          <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-4 rounded-2xl flex items-center gap-2 font-bold shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-mint-600 shrink-0" /> Employer profile and company branding saved successfully!
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-2xl flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Recruiter Personal Info */}
            <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-10 h-10 rounded-xl bg-mint-50 text-mint-700 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark">Recruiter & Account Details</h3>
                  <p className="text-xs text-muted">Your personal contact details shown to candidates when communicating.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Maria"
                  required
                />
                <Input
                  label="Last Name *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Santos"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your Job Position / Title *"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Talent Acquisition Manager"
                  required
                />
                <Input
                  label="Direct Contact Phone"
                  value={recruiterPhone}
                  onChange={(e) => setRecruiterPhone(e.target.value)}
                  placeholder="+63 912 345 6789"
                />
              </div>
            </div>

            {/* Section 2: Company Information & Branding */}
            <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-5">
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="w-14 h-14 rounded-2xl bg-dark text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                  {companyName ? companyName.slice(0, 2).toUpperCase() : 'CO'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-dark">{companyName || 'Company Profile'}</h3>
                    <span className="text-[10px] font-bold text-mint-800 bg-mint-50 px-2 py-0.5 rounded-full border border-mint-200">
                      Active Employer
                    </span>
                  </div>
                  <p className="text-xs text-muted">{city ? `${city}, ${province}` : 'Office Location'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Company Legal Name *"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. TechCorp Solutions Inc."
                  required
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Industry Sector *</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-dark focus:border-mint-500 focus:outline-none"
                  >
                    <option value="Software & Technology">Software & Technology</option>
                    <option value="Financial Technology">Financial Technology</option>
                    <option value="Digital Transformation">Digital Transformation</option>
                    <option value="Design & Creative">Design & Creative</option>
                    <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                    <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                    <option value="Education & E-Learning">Education & E-Learning</option>
                    <option value="Business Process Outsourcing (BPO)">Business Process Outsourcing (BPO)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Company Website"
                  placeholder="https://company.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
                <Input
                  label="General / Careers Email"
                  type="email"
                  placeholder="careers@company.com"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                />
                <Input
                  label="Company Hotline"
                  placeholder="+63 32 123 4567"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Headquarters City *</label>
                  <select
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none"
                  >
                    <option value="Cebu City">Cebu City</option>
                    <option value="Taguig / BGC">Taguig / BGC</option>
                    <option value="Makati City">Makati City</option>
                    <option value="Manila">Manila</option>
                    <option value="Pasig City">Pasig City</option>
                    <option value="Quezon City">Quezon City</option>
                    <option value="Davao City">Davao City</option>
                  </select>
                </div>

                <Input
                  label="Province *"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  required
                />

                <Input
                  label="Street Address"
                  placeholder="Building, Street, Barangay"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Company Overview & Culture</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your company mission, team culture, perks, and vision to attract top candidate talent..."
                  className="w-full rounded-2xl border border-border p-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
                />
              </div>

              {/* Company Urgent Hiring Status Box */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isCompanyUrgent ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCompanyUrgent}
                    onChange={(e) => setIsCompanyUrgent(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 h-5 w-5 mt-0.5"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-dark flex items-center gap-1.5">
                        <Flame className={`w-4 h-4 ${isCompanyUrgent ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
                        Flag Company as Urgently Hiring
                      </span>
                      {isCompanyUrgent && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                          🔥 Urgent Hiring Company
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Highlights your entire company profile with an Urgent Hiring badge in the employer directory and alerts job seekers that your team is actively recruiting.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-4">
              <h3 className="text-base font-bold text-dark">Official website and social pages</h3>
              <p className="text-xs text-muted">These are employer-provided links. They are not independently verified by WorkMatch.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Facebook page (HTTPS)" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." />
                <Input label="LinkedIn page (HTTPS)" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/company/..." />
                <Input label="Instagram page (HTTPS)" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
                <Input label="Other official page (HTTPS)" value={otherSocialUrl} onChange={(e) => setOtherSocialUrl(e.target.value)} placeholder="https://" />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-dark">Business permit verification</h3>
                  <p className="text-xs text-muted">Uploading a permit does not verify your company. An administrator must review and approve it.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full ${
                    verificationStatus === 'approved'
                      ? 'bg-emerald-50 text-emerald-800'
                      : verificationStatus === 'pending'
                      ? 'bg-amber-50 text-amber-800'
                      : verificationStatus === 'rejected'
                      ? 'bg-rose-50 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>{verificationStatus.replaceAll('_', ' ')}</span>
                  <VerifiedCompanyBadge company={{ verification_status: verificationStatus }} />
                </div>
              </div>
              {verifyMsg && (
                <p className={`text-xs font-semibold ${verifyMsg.toLowerCase().includes('could not') || verifyMsg.toLowerCase().includes('error') ? 'text-rose-700' : 'text-emerald-800'}`} role="status">
                  {verifyMsg}
                </p>
              )}
              {(permitFile || permitSubmission) && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="text-xs font-semibold truncate">
                        {permitFile?.name || permitSubmission?.permit_file_name}
                      </span>
                      {permitSubmission && !permitFile && (
                        <span className="text-[10px] uppercase text-muted">
                          {permitSubmission.status.replaceAll('_', ' ')}
                        </span>
                      )}
                    </div>
                    {permitSubmission && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={verifyBusy}
                        onClick={() => void deletePermitSubmission()}
                        className="text-rose-700 border-rose-200 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                  {(permitFile?.type.startsWith('image/') || permitSubmission?.permit_mime_type.startsWith('image/')) && (
                    <img
                      src={permitPreviewUrl || permitSubmission?.signed_url}
                      alt="Business permit preview"
                      className="max-h-72 w-full rounded-xl border border-slate-200 bg-white object-contain"
                    />
                  )}
                  {(permitFile?.type === 'application/pdf' || permitSubmission?.permit_mime_type === 'application/pdf') && (
                    <iframe
                      src={permitPreviewUrl || permitSubmission?.signed_url}
                      title="Business permit PDF preview"
                      className="h-96 w-full rounded-xl border border-slate-200 bg-white"
                    />
                  )}
                </div>
              )}
              {/* Approved — locked, no re-upload */}
              {verificationStatus === 'approved' ? (
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-emerald-950">Business Permit Approved ✓</h4>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Your company is verified. A new permit submission is not needed. If you need to update your permit, contact the platform administrator.
                    </p>
                    {permitSubmission && (
                      <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {permitSubmission.permit_file_name}
                      </p>
                    )}
                  </div>
                </div>
              ) : verificationStatus === 'pending' ? (
                /* Pending — locked, show current submission, allow deletion to re-submit */
                <div className="space-y-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-950">Permit Under Review</h4>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Your business permit is pending admin approval. You will be notified when it is reviewed. To withdraw and resubmit, delete the current submission below.
                      </p>
                    </div>
                  </div>
                  {permitSubmission && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-semibold truncate">{permitSubmission.permit_file_name}</span>
                        <span className="text-[10px] uppercase text-amber-700 font-bold shrink-0">Pending</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={verifyBusy}
                        onClick={() => void deletePermitSubmission()}
                        className="text-rose-700 border-rose-200 hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Withdraw
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* Not verified / rejected / resubmission_required — show upload UI */
                <>
                  {verificationStatus === 'rejected' && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-semibold">
                      ❌ Your permit was rejected. Please upload a clearer copy with all required details visible.
                      {permitSubmission?.admin_notes && (
                        <p className="mt-1 font-normal text-rose-700">Admin note: {permitSubmission.admin_notes}</p>
                      )}
                    </div>
                  )}
                  {verificationStatus === 'resubmission_required' && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-semibold">
                      ⚠️ Admin requested resubmission. Please upload a new, clearer business permit.
                      {permitSubmission?.admin_notes && (
                        <p className="mt-1 font-normal text-amber-700">Admin note: {permitSubmission.admin_notes}</p>
                      )}
                    </div>
                  )}
                  {permitSubmission && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-xs font-semibold truncate">{permitSubmission.permit_file_name}</span>
                        <span className="text-[10px] uppercase text-muted shrink-0">{permitSubmission.status.replaceAll('_', ' ')}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={verifyBusy}
                        onClick={() => void deletePermitSubmission()}
                        className="text-rose-700 border-rose-200 hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  )}
                  <label
                    htmlFor="business-permit-upload"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-7 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/50"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                      <UploadCloud className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {permitFile ? 'Choose a different permit' : 'Upload your business permit'}
                    </span>
                    <span className="text-xs text-slate-500">PDF, JPG, PNG, or WEBP · Maximum 10 MB</span>
                  </label>
                  <input
                    id="business-permit-upload"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onClick={(e) => { e.currentTarget.value = ''; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && file.size > 10 * 1024 * 1024) {
                        setPermitFile(null);
                        setVerifyMsg('Permit file must be 10 MB or smaller.');
                        return;
                      }
                      setVerifyMsg('');
                      setPermitFile(file);
                    }}
                  />
                  {permitFile && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
                        <span className="truncate text-xs font-semibold text-slate-700">{permitFile.name}</span>
                        <span className="shrink-0 text-[11px] text-slate-500">
                          {(permitFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove selected permit"
                        onClick={() => setPermitFile(null)}
                        className="rounded-lg p-1 text-slate-500 hover:bg-white hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {permitFile && (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      isLoading={verifyBusy}
                      disabled={verifyBusy}
                      className="w-full justify-center"
                      onClick={async () => {
                        setVerifyBusy(true);
                        setVerifyMsg('');
                        const form = new FormData();
                        form.set('businessName', companyName);
                        form.set('businessAddress', address || `${city}, ${province}`);
                        form.set('contactEmail', companyEmail);
                        form.set('contactPhone', companyPhone);
                        form.set('website', website);
                        form.set('facebookUrl', facebookUrl);
                        form.set('linkedinUrl', linkedinUrl);
                        form.set('instagramUrl', instagramUrl);
                        form.set('otherSocialUrl', otherSocialUrl);
                        form.set('permit', permitFile);
                        try {
                          const res = await fetch('/api/company/verification', { method: 'POST', body: form });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Could not submit the business permit.');
                          setVerifyMsg(data.message || 'Submitted for review.');
                          setVerificationStatus('pending');
                          setPermitFile(null);
                          await loadPermitSubmission(true);
                        } catch (error) {
                          setVerifyMsg(error instanceof Error ? error.message : 'Could not submit the business permit.');
                        } finally {
                          setVerifyBusy(false);
                        }
                      }}
                    >
                      <ShieldCheck className="h-4 w-4" /> Submit permit for admin review
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="submit" variant="primary" size="lg" isLoading={isSaving} className="shadow-md">
                <Save className="w-4 h-4" /> Save Profile & Company Details
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
    {ConfirmDialog}
    </>
  );
}
