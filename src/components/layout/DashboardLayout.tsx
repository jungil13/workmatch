'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SeekerSidebar } from './SeekerSidebar';
import { EmployerSidebar } from './EmployerSidebar';
import { AdminSidebar } from './AdminSidebar';
import { NotificationBell } from './NotificationBell';
import { supabase } from '@/lib/supabase/client';
import { AppLogo } from '@/components/ui/AppLogo';
import { LogoutModal } from '@/components/ui/LogoutModal';
import {
  Menu,
  X,
  LogOut,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  portal: 'seeker' | 'employer' | 'admin';
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({
  children,
  portal,
  title,
  subtitle,
  actions,
}: DashboardLayoutProps) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // 1. Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const meta = user.user_metadata;
      const fallbackName = meta?.first_name || meta?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User';
      const fallbackLastName = meta?.last_name || meta?.full_name?.split(' ').slice(1).join(' ') || '';
      const fallbackAvatar = meta?.avatar_url || meta?.picture || null;

      // Role security check: prevent portal mismatch (e.g. employer on seeker portal or vice versa)
      if (profile?.role) {
        if (profile.role === 'employer' && portal === 'seeker') {
          router.replace('/employer/dashboard');
          return;
        }
        if (profile.role === 'job_seeker' && portal === 'employer') {
          router.replace('/seeker/dashboard');
          return;
        }
        if (profile.role !== 'admin' && portal === 'admin') {
          router.replace(profile.role === 'employer' ? '/employer/dashboard' : '/seeker/dashboard');
          return;
        }
      }

      setUserProfile(
        profile
          ? { ...profile, avatar_url: profile.avatar_url || fallbackAvatar }
          : {
              first_name: fallbackName,
              last_name: fallbackLastName,
              avatar_url: fallbackAvatar,
              role: portal === 'employer' ? 'employer' : portal === 'admin' ? 'admin' : 'job_seeker',
            }
      );
    });
  }, [portal]);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-mint-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-mint-50 border border-mint-200 flex items-center justify-center p-1 shadow-sm">
                <AppLogo className="w-6 h-6" color="#059669" />
              </div>
              <span className="text-lg font-black tracking-tight text-dark hidden sm:inline">
                Work<span className="text-mint-600">Match</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Realtime Notifications Dropdown */}
            <NotificationBell portal={portal} />

            {/* Profile Avatar & Sign Out */}
            <div className="flex items-center gap-3 pl-3 border-l border-border">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.first_name || 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-mint-200 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-mint-100 text-mint-800 font-bold text-xs flex items-center justify-center border border-mint-200 shrink-0">
                  {userProfile?.first_name ? userProfile.first_name[0] : 'U'}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-dark leading-tight">
                  {userProfile?.first_name} {userProfile?.last_name || ''}
                </p>
                <p className="text-[10px] text-muted capitalize">
                  {userProfile?.role ? userProfile.role.replace('_', ' ') : portal}
                </p>
              </div>
              <button
                onClick={() => setLogoutModalOpen(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden border-r border-border scrollbar-hide">
          {portal === 'seeker' && <SeekerSidebar />}
          {portal === 'employer' && <EmployerSidebar />}
          {portal === 'admin' && <AdminSidebar />}
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative w-64 bg-white z-50">
              {portal === 'seeker' && <SeekerSidebar />}
              {portal === 'employer' && <EmployerSidebar />}
              {portal === 'admin' && <AdminSidebar />}
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {(title || actions) && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {title && <h1 className="text-2xl font-bold tracking-tight text-dark">{title}</h1>}
                {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Reusable Logout Confirmation Modal */}
      <LogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
      />
    </div>
  );
}
