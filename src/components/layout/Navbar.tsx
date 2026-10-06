'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LogoutModal } from '@/components/ui/LogoutModal';
import { NotificationBell } from './NotificationBell';
import { supabase } from '@/lib/supabase/client';
import {
  Menu,
  X,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: currentUser } }) => {
      if (currentUser) {
        setUser(currentUser);
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        const meta = currentUser.user_metadata;
        const firstName =
          userProfile?.first_name ||
          meta?.first_name ||
          currentUser.email?.split('@')[0] ||
          'User';
        const lastName = userProfile?.last_name || meta?.last_name || '';
        const role = userProfile?.role || meta?.role || 'job_seeker';
        const avatarUrl = userProfile?.avatar_url || meta?.avatar_url || meta?.picture || null;

        setProfile({
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
          role,
        });
      }
      setLoading(false);
    });
  }, []);

  const navLinks = [
    { name: 'Find Jobs', href: '/jobs' },
    { name: 'Company Reviews', href: '/reviews' },
    { name: 'Upload Diploma', href: '/seeker/diploma' },
    { name: 'AI Matches', href: '/seeker/scanner', badge: 5 },
  ];

  const getDashboardHref = () => {
    if (!profile) return '/seeker/dashboard';
    if (profile.role === 'admin') return '/admin';
    if (profile.role === 'employer') return '/employer/dashboard';
    return '/seeker/dashboard';
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="14" x="2" y="7" rx="3" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Work<span className="text-emerald-600">Match</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'text-emerald-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{link.name}</span>
                    {link.badge !== undefined && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-2.5">
              {loading ? (
                <div className="w-20 h-8 bg-slate-100 animate-pulse rounded-full" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <NotificationBell />

                  <Link href={getDashboardHref()}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="rounded-full shadow-xs flex items-center gap-1.5 text-xs font-bold px-4"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                    </Button>
                  </Link>

                  <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.first_name || 'User'}
                        className="w-7 h-7 rounded-full object-cover border border-emerald-200 shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                        {profile?.first_name ? profile.first_name[0] : 'U'}
                      </div>
                    )}
                    <button
                      onClick={() => setLogoutModalOpen(true)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Log Out"
                      aria-label="Log out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/sign-in"
                    className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/roles"
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 text-xs shadow-xs transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu & Notification Button */}
            <div className="flex md:hidden items-center gap-1.5">
              {user && <NotificationBell />}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-dark hover:bg-slate-100"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-md">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                      isActive
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{link.name}</span>
                    {link.badge !== undefined && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-slate-100 flex gap-2">
              {user ? (
                <Link
                  href={getDashboardHref()}
                  className="w-full text-center rounded-full bg-emerald-600 text-white font-bold py-2 text-xs"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/sign-in"
                    className="flex-1 text-center rounded-full border border-slate-300 text-slate-700 font-semibold py-2 text-xs"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/roles"
                    className="flex-1 text-center rounded-full bg-emerald-600 text-white font-bold py-2 text-xs"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Logout Modal */}
      <LogoutModal isOpen={logoutModalOpen} onClose={() => setLogoutModalOpen(false)} />
    </>
  );
}
