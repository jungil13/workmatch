'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Sparkles, ShieldCheck, MapPin, Zap, Award } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 w-full">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1 rounded-full text-xs font-bold text-mint-800">
            <Sparkles className="w-3.5 h-3.5 text-mint-600" /> Platform Architecture
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-dark tracking-tight">
            How WorkMatch Powers Smart Recruitment
          </h1>
          <p className="text-sm text-muted max-w-xl mx-auto">
            A modernized matching engine replacing keyword spam with verifiable skill taxonomies and geodesic proximity calculations.
          </p>
        </div>

        {/* Core Principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-dark">40% Skill Overlap Vector</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              We score hard framework proficiencies, programming languages, and tools against required vs preferred job requirements.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-dark">20% Proximity & Commute</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Haversine geodesic distance calculation ensures candidates find jobs within comfortable commute radiuses (5km to 50km).
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-dark">Verified Credentials</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI text extraction and registrar-verified diplomas give employers verified assurance on educational background.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-dark">Transparent Reasoning</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every score comes with an itemized explanation breakdown so candidates and recruiters know exactly why they match.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
