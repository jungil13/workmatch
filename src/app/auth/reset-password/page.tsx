'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppLogo } from '@/components/ui/AppLogo';
import { supabase } from '@/lib/supabase/client';
import {
  Lock,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Check,
} from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Check if URL contains hash parameters (e.g., direct link or redirect)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashString = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const params = new URLSearchParams(hashString);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');

      if (errorCode || errorDescription) {
        const decoded = decodeURIComponent(errorDescription || errorCode || 'Reset link expired or invalid.');
        setError(decoded.replace(/\+/g, ' '));
        setHasSession(false);
        return;
      }

      if (accessToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        }).then(({ data, error: sErr }) => {
          if (!sErr && data.session) {
            setHasSession(true);
          }
        });
      }
    }

    // 2. Check if recovery session is active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      } else {
        // Give client a brief moment to process URL hash before marking as false
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: retrySession } }) => {
            setHasSession(!!retrySession);
          });
        }, 800);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      // Redirect after brief delay
      setTimeout(async () => {
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profile?.role === 'admin') {
            window.location.href = '/admin';
          } else if (profile?.role === 'employer') {
            window.location.href = '/employer/dashboard';
          } else {
            window.location.href = '/seeker/dashboard';
          }
        } else {
          window.location.href = '/auth/sign-in';
        }
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const isLengthValid = password.length >= 8;
  const isMatchValid = password.length > 0 && password === confirmPassword;

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-md mx-auto px-4 sm:px-6 py-16 flex flex-col justify-center w-full">
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
              <KeyRound className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black text-dark tracking-tight">
              Set New Password
            </h1>
            <p className="text-xs text-muted">
              Choose a secure password with at least 8 characters to safeguard your account.
            </p>
          </div>

          {/* Session check warning */}
          {hasSession === false && !success && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Reset Session Not Detected
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700">
                Please make sure you clicked the link received in your Gmail inbox. If your link has expired, you can request a fresh one below.
              </p>
              <Link
                href="/auth/forgot-password"
                className="inline-block text-[11px] font-bold text-amber-900 underline pt-1"
              >
                Request a new password reset link &rarr;
              </Link>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3 animate-in zoom-in">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-emerald-950">Password Successfully Updated!</h3>
              <p className="text-xs text-emerald-700">
                Your new credentials are now active. Redirecting you to your account...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password Field with Eye Toggle */}
              <div>
                <Input
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  icon={<Lock className="w-4 h-4 text-emerald-600" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-dark transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />
              </div>

              {/* Confirm Password Field with Eye Toggle */}
              <div>
                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your new password"
                  icon={<Lock className="w-4 h-4 text-emerald-600" />}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-slate-400 hover:text-dark transition-colors p-1"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />
              </div>

              {/* Password Requirements Checklist */}
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl space-y-1.5 text-[11px]">
                <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <Check className={`w-3.5 h-3.5 ${isLengthValid ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Minimum 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${isMatchValid ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <Check className={`w-3.5 h-3.5 ${isMatchValid ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Passwords match</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center shadow-md font-bold text-sm"
                isLoading={isLoading}
              >
                Update Password <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link
              href="/auth/sign-in"
              className="text-xs text-muted hover:text-dark font-medium transition-colors"
            >
              Remember your password? <strong className="text-emerald-700 font-bold hover:underline">Sign In</strong>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
