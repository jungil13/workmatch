'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/passwordValidation';
import { ArrowLeft, Save, CheckCircle2, Lock, Eye, EyeOff, Check, X } from 'lucide-react';

export default function SeekerAccountSettingsPage() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pwErrorMsg, setPwErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email || '');
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.phone) setPhone(profile.phone);
    });
  }, []);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setErrorMsg('');
    setIsSavingContact(true);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ phone, updated_at: new Date().toISOString() })
      .eq('id', userId);

    setIsSavingContact(false);
    if (!profileError) {
      setContactSaved(true);
      setTimeout(() => setContactSaved(false), 3000);
    } else {
      setErrorMsg('Failed to update contact details. Please try again.');
    }
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

  // Live password requirement checks
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
      <div className="max-w-2xl space-y-6">
        {/* ── Contact Details ──────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
          <div>
            <h2 className="text-sm font-bold text-dark">Contact Details</h2>
            <p className="text-xs text-muted mt-0.5">Update your phone number linked to this account.</p>
          </div>

          {contactSaved && (
            <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-mint-600" /> Contact details updated!
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSaveContact} className="space-y-4">
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

            <div className="pt-4 border-t border-border flex justify-end">
              <Button type="submit" variant="primary" size="md" isLoading={isSavingContact}>
                <Save className="w-4 h-4" /> Save Contact Details
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
            {/* Current Password */}
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

            {/* New Password */}
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

            {/* Confirm New Password */}
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

            {/* Live Requirements Checklist */}
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
