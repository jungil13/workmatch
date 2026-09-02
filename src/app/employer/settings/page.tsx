'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Save, CheckCircle2 } from 'lucide-react';

export default function EmployerSettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        email_notifications: emailAlerts,
        updated_at: new Date().toISOString(),
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout
      portal="employer"
      title="Employer Settings"
      subtitle="Configure applicant notifications and notification preferences."
    >
      <div className="max-w-2xl bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
        {saved && (
          <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-mint-600" /> Settings updated!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-dark">Instant Applicant Email Alerts</h4>
                <p className="text-[11px] text-muted">Receive email notifications when a candidate submits an application.</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-5 h-5 accent-mint-500 rounded"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" variant="primary" size="md">
              <Save className="w-4 h-4" /> Save Preferences
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
