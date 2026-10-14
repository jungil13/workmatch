'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/passwordValidation';
import { Save, CheckCircle2, Lock, Eye, EyeOff, Check, X } from 'lucide-react';

export default function EmployerSettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwErrorMsg, setPwErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: settings } = await supabase
        .from('user_settings')
        .select('email_notifications')
        .eq('user_id', user.id)
        .maybeSingle();
      if (settings) setEmailAlerts(settings.email_notifications ?? true);
    });
  }, []);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErrorMsg('');
    setPwSuccess(false);

    if (!currentPassword) {
      setPwErrorMsg('Please enter your current password.');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setPwErrorMsg(`New password requirements not met: ${validation.errors.join(', ')}.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwErrorMsg('New password and confirm password do not match.');
      return;
    }

    setIsChangingPw(true);

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    setIsChangingPw(false);

    if (!res.ok) {
      setPwErrorMsg(data.error || 'Failed to update password. Please try again.');
      return;
    }

    setPwSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPwSuccess(false), 5000);
  };

  // Live validation
  const pwValidation = validatePassword(newPassword);
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;

  const requirementItem = (label: string, met: boolean) => (
    <div className={`flex items-center gap-1.5 ${met ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
      {met
        ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        : <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
      }
      <span>{label}</span>
    </div>
  );

  return (
    <DashboardLayout
      portal="employer"
      title="Employer Settings"
      subtitle="Configure applicant notifications and account security."
    >
      <div className="max-w-2xl space-y-6">
        {/* ── Notification Preferences ─────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
          <div>
            <h2 className="text-sm font-bold text-dark">Notification Preferences</h2>
            <p className="text-xs text-muted mt-0.5">Control how you receive applicant alerts.</p>
          </div>

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

        {/* ── Change Password ───────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
          <div>
            <h2 className="text-sm font-bold text-dark">Change Password</h2>
            <p className="text-xs text-muted mt-0.5">
              You must enter your current password to set a new one.
            </p>
          </div>

          {pwSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Password updated successfully!
            </div>
          )}

          {pwErrorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl font-bold">
              {pwErrorMsg}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password *"
              type={showCurrentPw ? 'text' : 'password'}
              placeholder="Enter your current password"
              icon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <Input
              label="New Password *"
              type={showNewPw ? 'text' : 'password'}
              placeholder="At least 8 characters"
              icon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showNewPw ? 'Hide password' : 'Show password'}
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password *"
              type={showConfirmPw ? 'text' : 'password'}
              placeholder="Re-enter your new password"
              icon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {newPassword.length > 0 && (
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl space-y-1.5 text-[11px]">
                {requirementItem('At least 8 characters', pwValidation.checks.minLength)}
                {requirementItem('At least one letter', pwValidation.checks.hasLetter)}
                {requirementItem('At least one number', pwValidation.checks.hasNumber)}
                {requirementItem('At least one special character (e.g. !@#$%)', pwValidation.checks.hasSpecial)}
                {requirementItem('Passwords match', isMatchValid)}
              </div>
            )}

            <div className="pt-4 border-t border-border flex justify-end">
              <Button type="submit" variant="primary" size="md" isLoading={isChangingPw}>
                <Lock className="w-4 h-4" /> Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
