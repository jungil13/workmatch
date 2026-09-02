'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Save, CheckCircle2, Lock } from 'lucide-react';

export default function SeekerAccountSettingsPage() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email || '');
      const { data: profile } = await supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle();
      if (profile?.phone) setPhone(profile.phone);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setErrorMsg('');

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ phone, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (password) {
      const { error: pwdError } = await supabase.auth.updateUser({ password });
      if (pwdError) {
        setErrorMsg(pwdError.message);
        return;
      }
    }

    if (!profileError) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <DashboardLayout
      portal="seeker"
      title="Account Settings"
      subtitle="Manage your authentication credentials and account details."
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
            <CheckCircle2 className="w-4 h-4 text-mint-600" /> Account details updated!
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            disabled
            className="bg-slate-50 text-slate-500 cursor-not-allowed"
          />

          <Input
            label="Phone Number"
            placeholder="+63 9..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="pt-4 border-t border-border space-y-3">
            <h4 className="text-xs font-bold text-dark">Change Password</h4>
            <Input
              type="password"
              placeholder="Leave blank to keep current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" variant="primary" size="md">
              <Save className="w-4 h-4" /> Save Account Changes
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

