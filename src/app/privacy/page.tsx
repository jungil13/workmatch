'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6 w-full">
        <h1 className="text-3xl font-black text-dark tracking-tight">Privacy Policy</h1>
        <div className="bg-white p-8 rounded-3xl border border-border shadow-soft space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            At WorkMatch, we value your privacy and are committed to protecting your personal data in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).
          </p>
          <h3 className="text-sm font-bold text-dark pt-2">1. Information We Collect</h3>
          <p>We collect information you provide directly to us when creating a candidate or employer profile, including name, email, phone number, work experience, education, skills, and uploaded documents (resumes and diplomas).</p>
          <h3 className="text-sm font-bold text-dark pt-2">2. How We Use Document Uploads</h3>
          <p>Uploaded diplomas and resumes are processed securely. Extracted skill keywords and degree names are saved for match calculation. Private documents are accessible only to verified recruiters and authorized platform administrators under strict Row Level Security (RLS).</p>
          <h3 className="text-sm font-bold text-dark pt-2">3. Location Privacy</h3>
          <p>Exact GPS coordinates are never made public. Only approximate city and distance radius calculations in kilometers are shown to prospective employers.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
