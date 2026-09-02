'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6 w-full">
        <h1 className="text-3xl font-black text-dark tracking-tight">Terms of Service</h1>
        <div className="bg-white p-8 rounded-3xl border border-border shadow-soft space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            Welcome to WorkMatch. By using our recruitment and AI skill-matching platform, you agree to comply with and be bound by the following terms and conditions.
          </p>
          <h3 className="text-sm font-bold text-dark pt-2">1. Authentic Profile Information</h3>
          <p>Job seekers agree to provide accurate educational records and work experience. Falsification of diplomas or credentials may lead to immediate account termination.</p>
          <h3 className="text-sm font-bold text-dark pt-2">2. Employer Obligations</h3>
          <p>Employers agree to post genuine, non-discriminatory job openings offering compensation aligned with Philippine labor standards and local statutory requirements.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
