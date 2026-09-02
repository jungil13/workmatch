'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';

export default function SeekerLocationSettingsPage() {
  const [userId, setUserId] = useState('');
  const [city, setCity] = useState('Cebu City');
  const [province, setProvince] = useState('Cebu');
  const [radius, setRadius] = useState(25);
  const [saved, setSaved] = useState(false);

  const radiusOptions = [5, 10, 25, 50];

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const [seekerRes, settingsRes] = await Promise.all([
        supabase.from('job_seeker_profiles').select('city, province').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_settings').select('preferred_search_radius').eq('user_id', user.id).maybeSingle(),
      ]);
      if (seekerRes.data) {
        setCity(seekerRes.data.city || 'Cebu City');
        setProvince(seekerRes.data.province || 'Cebu');
      }
      if (settingsRes.data?.preferred_search_radius) {
        setRadius(settingsRes.data.preferred_search_radius);
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    await Promise.all([
      supabase.from('job_seeker_profiles').upsert({
        user_id: userId,
        city,
        province,
        updated_at: new Date().toISOString(),
      }),
      supabase.from('user_settings').upsert({
        user_id: userId,
        preferred_search_radius: radius,
        updated_at: new Date().toISOString(),
      }),
    ]);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout
      portal="seeker"
      title="Location & Distance Radius"
      subtitle="Define your primary location and commute distance boundaries for proximity matching."
      actions={
        <Link href="/seeker/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" /> Settings Hub
          </Button>
        </Link>
      }
    >
      <div className="max-w-2xl bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
        {saved && (
          <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-mint-600" /> Location preferences updated!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Primary City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-dark focus:border-mint-500 focus:outline-none"
            >
              <option value="Cebu City">Cebu City (Central Visayas)</option>
              <option value="Taguig / BGC">Taguig / BGC (Metro Manila)</option>
              <option value="Makati City">Makati City (Metro Manila)</option>
              <option value="Manila">Manila (Metro Manila)</option>
              <option value="Davao City">Davao City (Mindanao)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <label className="block text-xs font-semibold text-slate-700">
              Preferred Search Radius: <strong className="text-mint-700">{radius} km</strong>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {radiusOptions.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    radius === r
                      ? 'bg-mint-500 text-white border-mint-500 shadow-sm'
                      : 'bg-white border-border text-dark hover:bg-slate-50'
                  }`}
                >
                  {r} km Radius
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted pt-1">
              Job opportunities located within {radius} km will receive priority proximity matching.
            </p>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" variant="primary" size="md">
              <Save className="w-4 h-4" /> Save Location Settings
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

