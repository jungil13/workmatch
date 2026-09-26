'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`;

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setIsLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-md mx-auto px-4 sm:px-6 py-16 flex flex-col justify-center w-full">
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-dark tracking-tight">
              Reset Your Password
            </h1>
            <p className="text-xs text-muted">
              Enter your verified email and we'll send you instructions to reset your password.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="bg-mint-50 border border-mint-200 p-4 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-mint-600 mx-auto" />
              <h3 className="text-sm font-bold text-mint-900">Reset Email Sent!</h3>
              <p className="text-xs text-mint-700">
                Check your inbox at <strong>{email}</strong> for instructions.
              </p>
              <Link href="/auth/seeker/sign-in">
                <Button variant="primary" size="sm" className="w-full justify-center mt-2">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Registered Email Address"
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" size="lg" className="w-full justify-center shadow-md" isLoading={isLoading}>
                Send Reset Link
              </Button>
            </form>
          )}

          <div className="text-center">
            <Link
              href="/roles"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-dark font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Role Selection
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
