'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Bell,
  CheckCheck,
  Trash2,
  Clock,
  ExternalLink,
  Briefcase,
  Sparkles,
  GraduationCap,
  Info,
  CheckCircle2,
  UserCheck,
  FileCheck,
} from 'lucide-react';

interface NotificationBellProps {
  portal?: 'seeker' | 'employer' | 'admin';
  className?: string;
}

export function NotificationBell({ portal, className = '' }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let channel: any = null;

    async function initNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Determine portal from profile if not passed
      let currentPortal = portal;
      if (!currentPortal) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (prof?.role === 'employer') currentPortal = 'employer';
        else if (prof?.role === 'admin') currentPortal = 'admin';
        else currentPortal = 'seeker';
      }

      // Fetch user notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (notifs && notifs.length > 0) {
        setNotifications(notifs);
      } else {
        // Starter contextual notification
        const welcome = {
          user_id: user.id,
          type: currentPortal === 'employer' ? 'employer_welcome' : currentPortal === 'admin' ? 'admin_welcome' : 'seeker_welcome',
          title:
            currentPortal === 'employer'
              ? 'Welcome to WorkMatch Recruiter!'
              : currentPortal === 'admin'
              ? 'System Command Active'
              : 'Welcome to WorkMatch!',
          message:
            currentPortal === 'employer'
              ? 'Post open roles and review matched candidate profiles with contact info.'
              : currentPortal === 'admin'
              ? 'Real-time database metrics and document review queues are online.'
              : 'Upload your diploma for verified badge and view top matching jobs.',
          link:
            currentPortal === 'employer'
              ? '/employer/jobs/create'
              : currentPortal === 'admin'
              ? '/admin/documents'
              : '/seeker/find-jobs',
          is_read: false,
          created_at: new Date().toISOString(),
        };

        const { data: created } = await supabase
          .from('notifications')
          .insert(welcome)
          .select()
          .maybeSingle();

        if (created) {
          setNotifications([created]);
        }
      }
      setLoading(false);

      // Realtime subscription
      const channelName = `live_notifs_${user.id}_${Date.now()}`;
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
    }

    initNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [portal]);

  const markAsRead = async (notifId: string, link?: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );

    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);

    if (link) {
      setIsOpen(false);
      router.push(link);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
  };

  const clearAllNotifications = async () => {
    if (!userId) return;
    setNotifications([]);
    await supabase.from('notifications').delete().eq('user_id', userId);
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
      case 'status':
      case 'status_update':
      case 'contacted':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'match':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case 'document':
      case 'diploma':
      case 'verified':
        return <GraduationCap className="w-4 h-4 text-emerald-700" />;
      default:
        return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl transition-all ${
          isOpen
            ? 'bg-emerald-50 text-emerald-700'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
        title="Notifications"
        aria-label="Toggle notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-3xl bg-white shadow-2xl border border-slate-200/90 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
              {unreadCount > 0 ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  All caught up
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
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
                <p className="text-xs text-slate-400 font-medium">No notifications right now.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id, notif.link)}
                  className={`py-3 px-2.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 my-1 ${
                    !notif.is_read
                      ? 'bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-100'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      !notif.is_read
                        ? 'bg-white border-emerald-200'
                        : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.link && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-1">
                        <span>View details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
