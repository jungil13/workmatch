'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Company } from '@/types/database';
import { Building2, Search, MapPin, ShieldCheck, Star, Briefcase, ArrowRight } from 'lucide-react';

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All Industries');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('companies').select('*').order('name').then(({ data }) => {
      setCompanies((data ?? []) as Company[]);
      setLoading(false);
    });
  }, []);

  const filtered = companies.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.city && c.city.toLowerCase().includes(search.toLowerCase()));
    const matchIndustry = industry === 'All Industries' || c.industry === industry;
    return matchSearch && matchIndustry;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-mint-50 border border-mint-200 px-3 py-1 rounded-full text-xs font-bold text-mint-800">
            <Building2 className="w-3.5 h-3.5 text-mint-600" /> Employer Directory
          </div>
          <h1 className="text-3xl font-black text-dark tracking-tight">
            Explore Verified Companies & Workplaces
          </h1>
          <p className="text-sm text-muted">
            Read transparent employee reviews, work culture ratings, and open tech roles.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-border p-4 md:p-6 shadow-soft grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Search companies by name or location..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-dark focus:border-mint-500 focus:outline-none"
            >
              <option value="All Industries">All Industries</option>
              <option value="Software & Technology">Software & Technology</option>
              <option value="Financial Technology">Financial Technology</option>
              <option value="Digital Transformation">Digital Transformation</option>
              <option value="Design & Creative">Design & Creative</option>
            </select>
          </div>
        </div>

        {/* Companies Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-dark">No companies found</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              When employers register their profiles on WorkMatch, they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((company) => (
              <div
                key={company.id}
                className="bg-white rounded-3xl border border-border p-6 shadow-soft card-interactive flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    {company.verified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-mint-800 bg-mint-50 px-2.5 py-1 rounded-full border border-mint-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-mint-600" /> Verified
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-dark">{company.name}</h3>
                    <p className="text-xs text-mint-700 font-semibold">{company.industry}</p>
                  </div>

                  {company.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {company.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-mint-500" /> {company.city}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-end">
                  <Link href={`/companies/${company.id}`}>
                    <Button variant="outline" size="sm">
                      View Profile <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
