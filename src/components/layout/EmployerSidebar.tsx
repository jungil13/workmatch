'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  Users,
  UserCheck,
  Calendar,
  BarChart3,
  Building,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

export function EmployerSidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/employer/dashboard', icon: LayoutDashboard },
    { name: 'Post a Job', href: '/employer/jobs/create', icon: PlusCircle },
    { name: 'Job Postings', href: '/employer/jobs', icon: Briefcase },
    { name: 'Applicant Pipeline', href: '/employer/applicants', icon: Users },
    { name: 'AI Candidate Finder', href: '/employer/candidates', icon: UserCheck },
    { name: 'Interviews', href: '/employer/interviews', icon: Calendar },
    { name: 'HR Analytics', href: '/employer/analytics', icon: BarChart3 },
    { name: 'Company Profile', href: '/employer/profile', icon: Building },
    { name: 'Settings', href: '/employer/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-border min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        {/* Company preview snippet */}
        <div className="bg-mint-50/60 p-3.5 rounded-2xl border border-mint-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
            AT
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-dark truncate">Archipelago Tech</h4>
            <p className="text-[11px] text-mint-700 font-medium truncate flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-mint-600" /> SEC Verified
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Employer Portal
          </p>
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/employer/dashboard' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-mint-500 text-white font-semibold shadow-sm shadow-mint-500/20'
                    : 'text-slate-600 hover:text-dark hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-border space-y-2">
        <Link
          href="/roles"
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-error hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Switch Role / Sign Out
        </Link>
      </div>
    </aside>
  );
}
