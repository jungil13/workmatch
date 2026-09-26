'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Sparkles, Mail, Lock, ArrowRight, ShieldCheck, Briefcase, UserCheck } from 'lucide-react';

export default function UnifiedSignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRedirectByRole = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      const userRole = profile?.role;
      if (userRole === 'admin') {
        window.location.href = '/admin';
      } else if (userRole === 'employer') {
        window.location.href = '/employer/dashboard';
      } else {
        window.location.href = '/seeker/dashboard';
      }
    } catch {
      window.location.href = '/seeker/dashboard';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    if (data.user) {
      await handleRedirectByRole(data.user.id);
    } else {
      setError('Sign in failed. Please verify your credentials and try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-md mx-auto px-4 sm:px-6 py-16 flex flex-col justify-center w-full">
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1 rounded-full text-xs font-bold text-mint-800">
              <Sparkles className="w-3.5 h-3.5 text-mint-600" /> WorkMatch Universal Login
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-dark tracking-tight">
              Sign In to WorkMatch
            </h1>
            <p className="text-xs text-muted">
              Enter your credentials. You will be automatically routed to your Job Seeker, Employer, or Admin dashboard.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium animate-shake">
              {error}
            </div>
          )}

          {/* Social Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border bg-white text-xs font-bold text-dark hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <div className="w-4 h-4 border-2 border-mint-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-white px-3 text-[11px] text-muted uppercase font-bold tracking-wider absolute">
              or sign in with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address *"
              type="email"
              placeholder="you@domain.com"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="space-y-1">
              <Input
                label="Password *"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end pt-1">
                {/* <Link
                  href="/auth/forgot-password"
                  className="text-xs text-mint-700 hover:text-mint-800 font-semibold hover:underline"
                >
                  Forgot password?
                </Link> */}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-md mt-2 font-bold"
              isLoading={isLoading}
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick role dashboard indicator */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-around text-[11px] text-slate-600 font-medium">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-mint-600" /> Job Seeker
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-700" /> Employer
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Admin
            </span>
          </div>

          <div className="pt-2 border-t border-border text-center space-y-2 text-xs text-muted">
            <p>
              Don't have an account yet?{' '}
              <Link href="/roles" className="text-mint-700 font-bold hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
