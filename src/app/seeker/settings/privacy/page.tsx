'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';

export default function SeekerPrivacySettingsPage() {
  const [showSkills, setShowSkills] = useState(true);
  const [showEducation, setShowEducation] = useState(true);
  const [showExperience, setShowExperience] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [allowContact, setAllowContact] = useState(true);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (settings) {
        setShowSkills(settings.show_skills ?? true);
        setShowEducation(settings.show_education ?? true);
        setShowExperience(settings.show_experience ?? true);
        setShowLocation(settings.show_location ?? true);
        setAllowContact(settings.allow_employer_contact ?? true);
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    await supabase.from('user_settings').upsert({
      user_id: userId,
      show_skills: showSkills,
      show_education: showEducation,
      show_experience: showExperience,
      show_location: showLocation,
      allow_employer_contact: allowContact,
      updated_at: new Date().toISOString(),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout
      portal="seeker"
      title="Privacy Settings"
      subtitle="Manage profile visibility and who can discover your candidate information."
      actions={
        <Link href="/seeker/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" /> Settings Hub
          </Button>
        </Link>
      }
    >
      <div className="max-w-2xl bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
        {saved && (
          <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-mint-600" /> Privacy preferences updated!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-dark">Show Skills to Employers</h4>
                <p className="text-[11px] text-muted">Allow recruiters to see your matched skills and levels.</p>
              </div>
              <input
                type="checkbox"
                checked={showSkills}
                onChange={(e) => setShowSkills(e.target.checked)}
                className="w-5 h-5 accent-mint-500 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-dark">Display Education Credentials</h4>
                <p className="text-[11px] text-muted">Include college degree and university name in candidate profiles.</p>
              </div>
              <input
                type="checkbox"
                checked={showEducation}
                onChange={(e) => setShowEducation(e.target.checked)}
                className="w-5 h-5 accent-mint-500 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-dark">Display Work Experience</h4>
                <p className="text-[11px] text-muted">Show past companies and role descriptions.</p>
              </div>
              <input
                type="checkbox"
                checked={showExperience}
                onChange={(e) => setShowExperience(e.target.checked)}
                className="w-5 h-5 accent-mint-500 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-dark">Approximate Location Sharing</h4>
                <p className="text-[11px] text-muted">Show city for distance proximity matching.</p>
              </div>
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => setShowLocation(e.target.checked)}
                className="w-5 h-5 accent-mint-500 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-dark">Allow Direct Employer Contact</h4>
                <p className="text-[11px] text-muted">Permit recruiters to invite you to matching job openings.</p>
              </div>
              <input
                type="checkbox"
                checked={allowContact}
                onChange={(e) => setAllowContact(e.target.checked)}
                className="w-5 h-5 accent-mint-500 rounded"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" variant="primary" size="md">
              <Save className="w-4 h-4" /> Save Privacy Settings
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

