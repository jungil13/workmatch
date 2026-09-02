'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Shield, MapPin, User, Bell, ChevronRight } from 'lucide-react';

export default function SeekerSettingsHubPage() {
  const sections = [
    {
      title: 'Privacy & Profile Visibility',
      description: 'Configure who can see your skills, education, approximate location, and contact information.',
      href: '/seeker/settings/privacy',
      icon: Shield,
    },
    {
      title: 'Location & Commute Preferences',
      description: 'Set your primary residence coordinates, city, and preferred job search proximity radius (5km - 50km).',
      href: '/seeker/settings/location',
      icon: MapPin,
    },
    {
      title: 'Account & Security Settings',
      description: 'Manage email address, password updates, and connected credentials.',
      href: '/seeker/settings/account',
      icon: User,
    },
  ];

  return (
    <DashboardLayout
      portal="seeker"
      title="Settings & Preferences"
      subtitle="Customize your candidate privacy levels, location radius, and notification alerts."
    >
      <div className="max-w-3xl space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.title} href={section.href} className="block group">
              <div className="bg-white rounded-3xl border border-border p-6 shadow-soft group-hover:border-mint-300 transition-all flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-mint-50 text-mint-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-dark group-hover:text-mint-700 transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-xs text-muted mt-0.5">{section.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-mint-600 transition-colors shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
