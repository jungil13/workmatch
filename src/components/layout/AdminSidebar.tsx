'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  Building2,
  Briefcase,
  FileCheck2,
  FileText,
  AlertTriangle,
  BarChart,
  Star,
  Activity,
  Settings,
  LogOut,
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
    { name: 'Reported Issues', href: '/admin/reports', icon: AlertTriangle },
    { name: 'Platform Analytics', href: '/admin/analytics', icon: BarChart },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: Activity },
    { name: 'System Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        {/* Admin status pill */}
        <div className="bg-slate-800 p-3.5 rounded-2xl border border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mint-500 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow-sm">
            ADM
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">Platform Admin</h4>
            <p className="text-[11px] text-mint-400 font-medium truncate">
              Root Level Access
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Admin Navigation
          </p>
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-mint-500 text-slate-950 font-bold shadow-sm shadow-mint-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 space-y-2">
        <Link
          href="/roles"
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-error hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Exit Admin Mode
        </Link>
      </div>
    </aside>
  );
}
