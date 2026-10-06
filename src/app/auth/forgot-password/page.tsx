'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { AppLogo } from '@/components/ui/AppLogo';
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await res.json();
    setIsLoading(false);

    if (!res.ok) {
      setError(data.error || 'Failed to send reset email. Please try again.');
      return;
    }

    setSent(true);
    startCooldown();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-emerald-200">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">

            {/* Emerald header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 pt-8 pb-6 text-center text-white">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-4 shadow-inner">
                {sent
                  ? <CheckCircle2 className="w-8 h-8 text-white" />
                  : <AppLogo className="w-8 h-8" color="#ffffff" />
                }
              </div>
              <h1 className="text-xl font-black tracking-tight">
                {sent ? 'Check Your Email' : 'Forgot Password?'}
              </h1>
              <p className="text-emerald-100 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
                {sent
                  ? <>We sent a reset link to <strong className="text-white">{email}</strong>.</>
                  : "Enter your email and we'll send a password reset link."
                }
              </p>
            </div>

            {/* Body */}
            <div className="px-8 py-7 space-y-5">

              {error && (
                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {!sent ? (
                /* -- STEP 1: Enter email -- */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reset-email" className="text-xs font-semibold text-slate-700">
                      Registered Email Address
                    </label>
                    <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-400 transition-all bg-slate-50">
                      <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                      <input
                        id="reset-email"
                        type="email"
                        placeholder="you@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none min-w-0"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center font-bold text-sm shadow-md"
                    isLoading={isLoading}
                  >
                    Send Reset Link <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              ) : (
                /* -- STEP 2: Sent confirmation -- */
                <div className="space-y-4">
                  {/* Open Gmail shortcut */}
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-colors"
                  >
                    <Mail className="w-4 h-4" /> Open Gmail Inbox <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Info box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs text-slate-600">
                    <p className="font-bold text-slate-800 text-sm">What to do next:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-[12px] text-slate-600 leading-relaxed">
                      <li>Open the email from <strong>WorkMatch</strong> in your inbox.</li>
                      <li>Click the <strong>"Reset Password"</strong> button in the email.</li>
                      <li>You will be redirected here to set your new password.</li>
                    </ol>
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-500 pt-1">
                      <span>??</span>
                      <span>Don't see it? Check your <strong>Spam</strong> or <strong>Junk</strong> folder.</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>This link expires in 60 minutes for your security.</span>
                    </div>
                  </div>

                  {/* Resend */}
                  <button
                    type="button"
                    disabled={cooldown > 0 || isLoading}
                    onClick={() => handleSubmit()}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 disabled:opacity-40 py-2 transition-colors border border-slate-200 rounded-xl hover:bg-slate-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Reset Email'}
                  </button>
                </div>
              )}

              {/* Bottom nav */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                {sent ? (
                  <button
                    type="button"
                    onClick={() => { setSent(false); setError(''); }}
                    className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Use different email
                  </button>
                ) : (
                  <Link
                    href="/auth/sign-in"
                    className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </Link>
                )}
                <Link href="/auth/sign-in" className="text-emerald-700 font-bold hover:underline">
                  Sign In
                </Link>
              </div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
