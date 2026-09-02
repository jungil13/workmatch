'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Save, CheckCircle2, Shield, Database, Lock } from 'lucide-react';

export default function AdminSettingsPage() {
  const [dbStatus, setDbStatus] = useState('Connected • Supabase PostgreSQL');
  const [skillOntologyVersion, setSkillOntologyVersion] = useState('v2.4 (2026 Edition)');
  const [ocrConfidenceCutoff, setOcrConfidenceCutoff] = useState(75);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout
      portal="admin"
      title="System & AI Settings"
      subtitle="Configure global database connection parameters, AI OCR thresholds, and security policies."
    >
      <div className="max-w-3xl bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
        {saved && (
          <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-mint-600" /> System settings updated!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-dark uppercase tracking-wider">Database & Storage Status</h3>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-mint-600" />
                <span className="font-bold text-dark">{dbStatus}</span>
              </div>
              <span className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                Healthy (22 Tables Indexed)
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-bold text-dark uppercase tracking-wider">AI Skill Scanner & OCR Weights</h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Ontology Taxonomy Version</label>
              <input
                type="text"
                value={skillOntologyVersion}
                disabled
                className="w-full h-11 rounded-xl border border-border bg-slate-50 px-3.5 text-xs text-muted"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span>Minimum OCR Confidence Acceptance Threshold</span>
                <span className="text-mint-700">{ocrConfidenceCutoff}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                value={ocrConfidenceCutoff}
                onChange={(e) => setOcrConfidenceCutoff(Number(e.target.value))}
                className="w-full accent-mint-500"
              />
              <p className="text-[11px] text-muted">
                Skills detected below this threshold will be flagged for manual candidate confirmation.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" variant="primary" size="md">
              <Save className="w-4 h-4" /> Save System Settings
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
