'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Sparkles, Mail, Lock, Phone, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';

export default function EmployerSignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    city: 'Cebu City',
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

    if (!formData.firstName || !formData.lastName || !formData.companyName || !formData.email || !formData.password) {
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'employer',
            company_name: formData.companyName,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // 1. Create company record with auto slug
        const companySlug = formData.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
        const { data: company, error: compError } = await supabase.from('companies').insert({
          name: formData.companyName,
          slug: companySlug,
          city: formData.city,
          province: formData.city === 'Cebu City' ? 'Cebu' : 'Metro Manila',
          industry: 'Software & Technology',
          verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select().maybeSingle();

        if (compError) {
          console.warn('Company insert warning:', compError);
        }

        // 2. Create user profile
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          role: 'employer',
          status: 'active',
          updated_at: new Date().toISOString(),
        });

        // 3. Create employer profile
        if (company) {
          await supabase.from('employer_profiles').upsert({
            user_id: authData.user.id,
            company_id: company.id,
            position: 'Talent Acquisition / HR Manager',
            updated_at: new Date().toISOString(),
          });
        }

        // 4. Default user settings
        await supabase.from('user_settings').upsert({
          user_id: authData.user.id,
          email_notifications: true,
          application_notifications: true,
        });

        if (authData.session) {
          window.location.href = '/employer/dashboard';
        } else {
          setSuccessMessage(
            'Employer account created! If email confirmation is enabled in your Supabase project, check your inbox to confirm, then sign in.'
          );
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during employer registration.');
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
              <Sparkles className="w-3.5 h-3.5 text-mint-600" /> Employer & Recruiter Account
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-dark tracking-tight">
              Post Jobs & Hire Top Talent
            </h1>
            <p className="text-xs text-muted">
              Discover pre-screened talent scored with multi-factor AI matching algorithms.
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
              <Link href="/auth/employer/sign-in" className="inline-block mt-2 font-bold text-mint-700 underline">
                Go to Sign In Page →
              </Link>
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Recruiter First Name *"
                  placeholder="Carlos"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Recruiter Last Name *"
                  placeholder="Reyes"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Company Name *"
                placeholder="e.g. Archipelago Tech Labs"
                icon={<Building2 className="w-4 h-4" />}
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />

              <Input
                label="Work Email Address *"
                type="email"
                placeholder="recruiter@company.ph"
                icon={<Mail className="w-4 h-4" />}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Phone / Mobile"
                  placeholder="+63 918 123 4567"
                  icon={<Phone className="w-4 h-4" />}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Company Headquarters *</label>
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
                Create Employer Account <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          <div className="text-center text-xs text-muted pt-2 border-t border-border">
            Already have an employer account?{' '}
            <Link href="/auth/employer/sign-in" className="text-mint-700 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
