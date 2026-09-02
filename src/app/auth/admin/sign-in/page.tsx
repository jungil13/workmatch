'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react';

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your administrator email and password.');
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
      // Verify admin role in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.role === 'admin') {
        window.location.href = '/admin';
      } else {
        setError('Access denied: This account does not have administrator privileges. Please update the user role to "admin" in the Supabase profiles table.');
        setIsLoading(false);
      }
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
            <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-bold">
              <Shield className="w-3.5 h-3.5 text-mint-400" /> Platform Security
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-dark tracking-tight">
              Admin Command Center
            </h1>
            <p className="text-xs text-muted">
              Enter administrator credentials to manage platform records, verifications, and moderation.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Admin Email Address *"
              type="email"
              placeholder="admin@workmatch.ph"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password *"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" size="lg" className="w-full justify-center shadow-md mt-2 font-bold" isLoading={isLoading}>
              Sign In to Admin Panel <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="pt-4 border-t border-border text-center space-y-2 text-xs text-muted">
            <p>
              Looking for regular candidate or employer login?
            </p>
            <div className="flex items-center justify-center gap-3 font-bold text-mint-700">
              <Link href="/auth/seeker/sign-in" className="hover:underline">Job Seeker</Link>
              <span>•</span>
              <Link href="/auth/employer/sign-in" className="hover:underline">Employer</Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
