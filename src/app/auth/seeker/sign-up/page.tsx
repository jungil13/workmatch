'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Sparkles, Mail, Lock, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SeekerSignUpPage() {
  const router = useRouter();
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
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Sign up user in Supabase Auth with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'job_seeker',
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // 2. Insert into public.profiles
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

        // 3. Insert into public.job_seeker_profiles with valid schema constraint
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

        // 4. Insert default user settings
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

        // Check if session exists (auto-confirmed) or email confirmation is required
        if (authData.session) {
          window.location.href = '/seeker/dashboard';
        } else {
          setSuccessMessage(
            'Account created! If email confirmation is enabled in your Supabase project, please check your inbox to confirm, then sign in.'
          );
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign up.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-xl mx-auto px-4 sm:px-6 py-12 flex flex-col justify-center w-full">
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1 rounded-full text-xs font-bold text-mint-800">
              <Sparkles className="w-3.5 h-3.5 text-mint-600" /> Job Seeker Registration
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-dark tracking-tight">
              Create Your WorkMatch Profile
            </h1>
            <p className="text-xs text-muted">
              Connect your verified skills with top local and remote opportunities.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl font-medium space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {successMessage}
              </div>
              <Link href="/auth/seeker/sign-in" className="inline-block mt-2 font-bold text-mint-700 underline">
                Go to Sign In Page →
              </Link>
            </div>
          )}

          {!successMessage && (
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
                  type="password"
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <Input
                  label="Confirm Password *"
                  type="password"
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full justify-center shadow-md mt-2 font-bold" isLoading={isLoading}>
                Complete Registration <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

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
