'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SeekerSidebar } from './SeekerSidebar';
import { EmployerSidebar } from './EmployerSidebar';
import { AdminSidebar } from './AdminSidebar';
import { supabase } from '@/lib/supabase/client';
import { AppLogo } from '@/components/ui/AppLogo';
import { LogoutModal } from '@/components/ui/LogoutModal';
import {
  Bell,
  Sparkles,
  Menu,
  X,
  LogOut,
  CheckCheck,
  Briefcase,
  GraduationCap,
  Info,
  Clock,
  ExternalLink,
  Trash2,
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: any = null;

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
      setUserProfile(
        profile || {
          first_name: fallbackName,
          last_name: fallbackLastName,
          role: portal === 'employer' ? 'employer' : portal === 'admin' ? 'admin' : 'job_seeker',
        }
      );

      // 2. Fetch initial notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notifs && notifs.length > 0) {
        setNotifications(notifs);
      } else {
        // Create an initial onboarding notification if none exist yet
        const welcomeNotif = {
          user_id: user.id,
          type: portal === 'employer' ? 'employer_welcome' : portal === 'admin' ? 'admin_welcome' : 'seeker_welcome',
          title:
            portal === 'employer'
              ? 'Welcome to WorkMatch Recruiter!'
              : portal === 'admin'
              ? 'System Command Active'
              : 'Welcome to WorkMatch!',
          message:
            portal === 'employer'
              ? 'Start posting jobs and reviewing AI-matched candidates.'
              : portal === 'admin'
              ? 'Real-time database and document queues are synchronized.'
              : 'Complete your profile and upload your diploma for verified status.',
          link:
            portal === 'employer'
              ? '/employer/jobs/create'
              : portal === 'admin'
              ? '/admin/documents'
              : '/seeker/profile/edit',
          is_read: false,
          created_at: new Date().toISOString(),
        };

        const { data: createdNotif } = await supabase
          .from('notifications')
          .insert(welcomeNotif)
          .select()
          .maybeSingle();

        if (createdNotif) {
          setNotifications([createdNotif]);
        }
      }

      // 3. Subscribe to Realtime notifications for this specific user
      const channelName = `notifs_${user.id}_${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new;
            setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const deleted = payload.old;
            setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [portal]);

  // Click outside to close notification popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const markAsRead = async (notifId: string, link?: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId);

    if (link) {
      setNotifOpen(false);
      router.push(link);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
  };

  const clearAllNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setNotifications([]);
    await supabase.from('notifications').delete().eq('user_id', user.id);
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date().getTime();
      const past = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - past) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'application':
      case 'applicant':
        return <Briefcase className="w-4 h-4 text-emerald-600" />;
      case 'match':
        return <Sparkles className="w-4 h-4 text-mint-600" />;
      case 'document':
      case 'diploma':
        return <GraduationCap className="w-4 h-4 text-indigo-600" />;
      default:
        return <Info className="w-4 h-4 text-mint-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2.5 rounded-xl transition-all ${
                  notifOpen
                    ? 'bg-mint-50 text-mint-700'
                    : 'text-slate-600 hover:text-dark hover:bg-slate-100'
                }`}
                title="Notifications"
                aria-label="Toggle notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-mint-500 text-white text-[10px] font-black flex items-center justify-center shadow-sm animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white shadow-2xl border border-border p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-dark">Notifications</h4>
                      {unreadCount > 0 ? (
                        <span className="text-[10px] font-bold text-mint-800 bg-mint-50 px-2 py-0.5 rounded-full border border-mint-200">
                          {unreadCount} new
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          All read
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[11px] font-bold text-mint-700 hover:text-mint-800 flex items-center gap-1 hover:underline transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                          title="Clear all notifications"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto mt-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs text-muted">No notifications right now.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id, notif.link)}
                          className={`py-3 px-2.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 my-1 ${
                            !notif.is_read
                              ? 'bg-mint-50/70 hover:bg-mint-50 border border-mint-100'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                              !notif.is_read
                                ? 'bg-white border-mint-200'
                                : 'bg-slate-100 border-slate-200'
                            }`}
                          >
                            {getNotifIcon(notif.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p
                                className={`text-xs truncate ${
                                  !notif.is_read ? 'font-bold text-dark' : 'font-medium text-slate-700'
                                }`}
                              >
                                {notif.title}
                              </p>
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0">
                                <Clock className="w-2.5 h-2.5" />
                                {formatRelativeTime(notif.created_at)}
                              </span>
                            </div>

                            <p className="text-[11px] text-muted line-clamp-2 mt-0.5">
                              {notif.message}
                            </p>

                            {notif.link && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-mint-700 mt-1">
                                <span>View details</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>

                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-mint-500 shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar & Sign Out */}
            <div className="flex items-center gap-3 pl-3 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-mint-100 text-mint-800 font-bold text-xs flex items-center justify-center border border-mint-200">
                {userProfile?.first_name ? userProfile.first_name[0] : 'U'}
              </div>
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
        <div className="hidden lg:block">
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
