'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  ShieldAlert,
  Users,
  Building2,
  Briefcase,
  FileCheck2,
  BarChart,
  Star,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

export function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Command Center', href: '/admin', icon: ShieldAlert },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Companies', href: '/admin/companies', icon: Building2 },
    { name: 'Job Moderation', href: '/admin/jobs', icon: Briefcase },
    { name: 'Document Verification', href: '/admin/documents', icon: FileCheck2 },
    { name: 'Review Moderation', href: '/admin/reviews', icon: Star },
    { name: 'Platform Analytics', href: '/admin/analytics', icon: BarChart },
    { name: 'System Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white flex flex-col justify-between p-4 shrink-0 min-h-full">
      <div className="space-y-6">
        {/* Admin status banner */}
        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-dark truncate">WorkMatch Admin</h4>
            <p className="text-[11px] text-emerald-700 font-semibold truncate flex items-center gap-1">
              Superadmin Access
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Platform Moderation
          </p>
          {links.map((link) => {
            const isActive =
              link.href === '/admin'
                ? pathname === '/admin'
                : pathname === link.href || pathname.startsWith(link.href + '/');
            const Icon = link.icon;

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 shadow-xs'
                    : 'text-slate-600 hover:text-dark hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/';
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
