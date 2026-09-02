'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase/client';
import { Company } from '@/types/database';
import { Building2, ShieldCheck, MapPin } from 'lucide-react';

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('companies').select('*').order('name').then(({ data }) => {
      setCompanies((data ?? []) as Company[]);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout
      portal="admin"
      title="Company Management"
      subtitle="Verify employer corporate registrations, review headquarters, and manage companies."
    >
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-dark">No companies registered yet</h3>
          <p className="text-xs text-muted">When employer accounts register and set up company profiles, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
          {companies.map((comp) => (
            <div key={comp.id} className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {comp.logo_url ? (
                    <img src={comp.logo_url} alt={comp.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                {comp.verified && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-dark">{comp.name}</h3>
                <p className="text-xs text-mint-700 font-semibold">{comp.industry}</p>
                <p className="text-xs text-muted flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-mint-500" /> {comp.city}, {comp.province}
                </p>
              </div>

              {comp.description && (
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{comp.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
