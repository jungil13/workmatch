'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Lock, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setIsLoading(true);

    const { data, error: updateError } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);

    // Redirect to the correct portal after a short delay
    setTimeout(async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user!.id)
        .maybeSingle();

      if (profileData?.role === 'admin') {
        window.location.href = '/admin';
      } else if (profileData?.role === 'employer') {
        window.location.href = '/employer/dashboard';
      } else {
        window.location.href = '/seeker/dashboard';
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-md mx-auto px-4 sm:px-6 py-16 flex flex-col justify-center w-full">
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-dark tracking-tight">
              Set New Password
            </h1>
            <p className="text-xs text-muted">
              Choose a strong password with at least 8 characters.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {error}
            </div>
          )}

          {success ? (
            <div className="bg-mint-50 border border-mint-200 p-4 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-mint-600 mx-auto" />
              <h3 className="text-sm font-bold text-mint-900">Password Updated!</h3>
              <p className="text-xs text-mint-700">Redirecting you to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center shadow-md"
                isLoading={isLoading}
              >
                Update Password <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
