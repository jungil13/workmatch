'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/passwordValidation';
import {
  Mail, Lock, Phone, ArrowRight, CheckCircle2,
  Eye, EyeOff, Check, X, RotateCcw, Loader2,
} from 'lucide-react';

export default function SeekerSignUpPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: 'Cebu City',
    province: 'Cebu',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Check if landing here from an email confirmation redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const hashString = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hashString);

    const isVerifiedQuery =
      searchParams.get('verified') === '1' ||
      searchParams.get('verified') === 'true' ||
      searchParams.get('confirmed') === 'true';

    const isVerifiedHash =
      hashParams.get('type') === 'signup' ||
      hashParams.get('type') === 'email_confirmation';

    if (isVerifiedQuery || isVerifiedHash) {
      setIsEmailVerified(true);
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (_) {}
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (hash.includes('type=signup') || hash.includes('type=email_confirmation')) {
          setIsEmailVerified(true);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Resend state
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendError, setResendError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess('');
    setResendError('');

    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registeredEmail }),
    });
    const data = await res.json();
    setIsResending(false);

    if (!res.ok) {
      setResendError(data.error || 'Failed to resend. Please try again later.');
    } else {
      setResendSuccess(data.message || 'Verification email sent!');
      startResendCooldown();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    const pwValidation = validatePassword(formData.password);
    if (!pwValidation.isValid) {
      setError(`Password requirements not met: ${pwValidation.errors.join(', ')}.`);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'job_seeker',
          },
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?type=signup`,
        },
      });

      if (authError) {
        const msg = authError.message;
        if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('limit')) {
          setError('Email rate limit reached: Supabase default mailer allows max 3 emails per hour. You can manually confirm this email in Supabase Dashboard → Authentication → Users to log in immediately.');
        } else {
          setError(msg);
        }
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // Insert profile rows regardless of verification status
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          role: 'job_seeker',
          status: 'active',
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.warn('Profile insert warning:', profileError);
        }

        const { error: seekerProfileError } = await supabase.from('job_seeker_profiles').upsert({
          user_id: authData.user.id,
          city: formData.city,
          province: formData.province,
          availability: 'Immediate',
          profile_visibility: 'Employers Only',
          updated_at: new Date().toISOString(),
        });

        if (seekerProfileError) {
          console.warn('Seeker profile insert warning:', seekerProfileError);
        }

        await supabase.from('user_settings').upsert({
          user_id: authData.user.id,
          email_notifications: true,
          show_skills: true,
          show_education: true,
          show_experience: true,
          show_location: true,
          allow_employer_contact: true,
          preferred_search_radius: 25,
        });

        // If email confirmation is disabled in Supabase, a session is returned immediately.
        // If enabled, session will be null — show the verification reminder.
        if (authData.session) {
          window.location.href = '/seeker/dashboard';
        } else {
          setRegisteredEmail(formData.email);
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign up.');
      setIsLoading(false);
    }
  };

  // Live password validation
  const pwValidation = validatePassword(formData.password);
  const isMatchValid = formData.password.length > 0 && formData.password === formData.confirmPassword;

  const requirementItem = (label: string, met: boolean) => (
    <div className={`flex items-center gap-1.5 ${met ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
      {met
        ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        : <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
      }
      <span>{label}</span>
    </div>
  );

  // ── Verification Pending Screen ─────────────────────────────────────────
  if (registeredEmail) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0d3d2e] via-[#0a4a38] to-[#07503f] selection:bg-emerald-200">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 sm:px-6 py-16 flex flex-col justify-center w-full">
          <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                <Mail className="w-7 h-7 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-black text-dark tracking-tight">Check Your Email</h1>
              <p className="text-xs text-muted leading-relaxed">
                We sent a verification link to{' '}
                <strong className="text-dark">{registeredEmail}</strong>.{' '}
                Click the link in the email to activate your account before signing in.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Account Created Successfully
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[12px] text-emerald-800 leading-relaxed">
                <li>Open the email from <strong>WorkMatch</strong> in your inbox.</li>
                <li>Click the <strong>"Confirm your email"</strong> button.</li>
                <li>You will be redirected to sign in and access your dashboard.</li>
              </ol>
              <p className="text-[11px] text-emerald-700 pt-1">
                Don't see it? Check your <strong>Spam</strong> or <strong>Junk</strong> folder.
              </p>
            </div>

            {resendSuccess && (
              <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-3 rounded-xl flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-mint-600" /> {resendSuccess}
              </div>
            )}
            {resendError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-semibold">
                {resendError}
              </div>
            )}

            <button
              type="button"
              disabled={isResending || resendCooldown > 0}
              onClick={handleResend}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 disabled:opacity-40 py-2.5 transition-colors border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              {isResending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RotateCcw className="w-3.5 h-3.5" />
              }
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
            </button>

            <div className="text-center text-xs text-muted pt-2 border-t border-border">
              Already verified?{' '}
              <Link href="/auth/sign-in" className="text-mint-700 font-bold hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0d3d2e] via-[#0a4a38] to-[#07503f] selection:bg-emerald-200">
      <Navbar />

      <main className="flex-1 max-w-xl mx-auto px-4 sm:px-6 py-12 flex flex-col justify-center w-full">
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-dark tracking-tight">
              Create Your WorkMatch Profile
            </h1>
            <p className="text-xs text-muted">
              Connect your verified skills with top local and remote opportunities.
            </p>
          </div>

          {/* Email Verified Banner */}
          {isEmailVerified && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-emerald-950">
                    Email verified successfully!
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                    Your email address has been verified. You can now proceed to log in to your account.
                  </p>
                </div>
              </div>
              <Link
                href="/auth/sign-in"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm hover:shadow"
              >
                Proceed to Log In
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name *"
                placeholder="Maria"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name *"
                placeholder="Santos"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>

            <Input
              label="Email Address *"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <Input
              label="Phone Number"
              placeholder="+63 917 123 4567"
              icon={<Phone className="w-4 h-4" />}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">City *</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none"
                >
                  <option value="Cebu City">Cebu City</option>
                  <option value="Taguig / BGC">Taguig / BGC</option>
                  <option value="Makati City">Makati City</option>
                  <option value="Manila">Manila</option>
                  <option value="Davao City">Davao City</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Province *</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full h-11 rounded-xl border border-border bg-white px-3 text-sm text-dark focus:border-mint-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Password *"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-700 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <Input
                label="Confirm Password *"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="text-slate-400 hover:text-slate-700 transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>

            {/* Live password requirement checklist */}
            {formData.password.length > 0 && (
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl space-y-1.5 text-[11px]">
                {requirementItem('At least 8 characters', pwValidation.checks.minLength)}
                {requirementItem('At least one letter', pwValidation.checks.hasLetter)}
                {requirementItem('At least one number', pwValidation.checks.hasNumber)}
                {requirementItem('At least one special character (e.g. !@#$%)', pwValidation.checks.hasSpecial)}
                {requirementItem('Passwords match', isMatchValid)}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full justify-center shadow-md mt-2 font-bold" isLoading={isLoading}>
              Complete Registration <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center text-xs text-muted pt-2 border-t border-border">
            Already have an account?{' '}
            <Link href="/auth/seeker/sign-in" className="text-mint-700 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
