'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Search,
  Bookmark,
  FileCheck,
  Sparkles,
  GraduationCap,
  Star,
  User,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

export function SeekerSidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const meta = user.user_metadata;
      const fallbackFirst =
        meta?.first_name ||
        meta?.full_name?.split(' ')[0] ||
        meta?.name?.split(' ')[0] ||
        user.email?.split('@')[0] ||
        'Candidate';
      const fallbackLast =
        meta?.last_name ||
        meta?.full_name?.split(' ').slice(1).join(' ') ||
        meta?.name?.split(' ').slice(1).join(' ') ||
        '';
      const fallbackAvatar = meta?.avatar_url || meta?.picture || null;

      // Fetch user profile from database
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // Check if user has a verified diploma
      const { data: verifiedDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id)
        .eq('verification_status', 'verified')
        .limit(1)
        .maybeSingle();

      setProfile({
        first_name: dbProfile?.first_name || fallbackFirst,
        last_name: dbProfile?.last_name || fallbackLast,
        avatar_url: dbProfile?.avatar_url || fallbackAvatar,
        role: dbProfile?.role || 'job_seeker',
      });

      if (verifiedDoc) {
        setIsVerified(true);
      }
      setLoading(false);
    });
  }, []);

  const links = [
    { name: 'Dashboard', href: '/seeker/dashboard', icon: LayoutDashboard },
    { name: 'Find Jobs', href: '/seeker/find-jobs', icon: Search },
    { name: 'AI Job Recommendations', href: '/seeker/scanner', icon: Sparkles },
    { name: 'Saved Jobs', href: '/seeker/saved-jobs', icon: Bookmark },
    { name: 'Applications', href: '/seeker/applications', icon: FileCheck },
    { name: 'Diploma Verification', href: '/seeker/diploma', icon: GraduationCap },
    { name: 'My Profile', href: '/seeker/profile', icon: User },
    { name: 'Company Reviews', href: '/seeker/reviews', icon: Star },
    { name: 'Settings', href: '/seeker/settings', icon: Settings },
  ];

  const getInitials = () => {
    if (!profile) return 'U';
    const firstInitial = profile.first_name?.[0] || '';
    const lastInitial = profile.last_name?.[0] || '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  };

  return (
    <aside className="w-64 bg-white border-r border-border min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        {/* Dynamic User Profile Preview Snippet */}
        <div className="bg-mint-50/60 p-3.5 rounded-2xl border border-mint-100 flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.first_name || 'User avatar'}
              className="w-10 h-10 rounded-full object-cover border border-mint-200 shadow-sm shrink-0"
              onError={(e) => {
                // If avatar URL fails to load, fallback to initials box
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-mint-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
              {getInitials()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-dark truncate">
              {loading ? (
                <span className="inline-block w-20 h-3.5 bg-slate-200 rounded animate-pulse" />
              ) : (
                `${profile?.first_name || 'User'} ${profile?.last_name || ''}`
              )}
            </h4>
            <p className="text-[11px] text-mint-700 font-medium truncate flex items-center gap-1">
              {isVerified ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-mint-600 shrink-0" /> Verified Candidate
                </>
              ) : (
                <>
                  <User className="w-3 h-3 text-mint-600 shrink-0" /> Job Seeker
                </>
              )}
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Job Seeker Portal
          </p>
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== '/seeker/dashboard' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-mint-500 text-white shadow-sm shadow-mint-500/20'
                    : 'text-slate-600 hover:text-dark hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-border space-y-2">
        <Link
          href="/roles"
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Switch Role / Sign Out
        </Link>
      </div>
    </aside>
  );
}
