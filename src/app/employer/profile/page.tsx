'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
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
} from 'lucide-react';

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

  // UI State
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

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
        if (ep.company_id) setCompanyId(ep.company_id);

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
        }
      }

      setLoading(false);
    });
  }, []);

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
      // 1. Update personal recruiter profile in public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
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
        const { error: companyError } = await supabase
          .from('companies')
          .update({
            name: companyName || 'My Company',
            industry,
            website: website || null,
            email: companyEmail || null,
            phone: companyPhone || null,
            address: address || null,
            city: city || 'Cebu City',
            province: province || 'Cebu',
            description: description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentCompanyId);

        if (companyError) {
          console.error('Error updating company:', companyError);
          throw new Error(companyError.message);
        }
      } else {
        // Create brand new company record
        const compSlug = (companyName || 'company')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);

        const { data: newComp, error: insertCompError } = await supabase
          .from('companies')
          .insert({
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
            verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

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
      const { error: epError } = await supabase
        .from('employer_profiles')
        .upsert({
          user_id: userId,
          company_id: currentCompanyId,
          position: position || 'Hiring Manager',
          updated_at: new Date().toISOString(),
        });

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
  );
}
