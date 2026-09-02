'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Sparkles, Mail, Lock, ArrowRight, Building2 } from 'lucide-react';

export default function EmployerSignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your work email and password.');
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
      window.location.href = '/employer/dashboard';
    } else {
      setError('Sign in failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-md mx-auto px-4 sm:px-6 py-16 flex flex-col justify-center w-full">
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1 rounded-full text-xs font-bold text-mint-800">
              <Building2 className="w-3.5 h-3.5 text-mint-600" /> Recruiter Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-dark tracking-tight">
              Employer Sign In
            </h1>
            <p className="text-xs text-muted">
              Access candidate pipelines, job postings, and interview management.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email Address *"
              type="email"
              placeholder="recruiter@company.ph"
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
              <div className="text-right pt-1">
                <Link
                  href="/auth/forgot-password"
                  className="text-[11px] font-semibold text-slate-500 hover:text-mint-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full justify-center shadow-md mt-2" isLoading={isLoading}>
              Sign In to Recruiter Portal <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center text-xs text-muted pt-2 border-t border-border">
            Don't have an employer account?{' '}
            <Link href="/auth/employer/sign-up" className="text-mint-700 font-bold hover:underline">
              Create Employer Account
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
