'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AppLogo } from '@/components/ui/AppLogo';
import { LogoutModal } from '@/components/ui/LogoutModal';
import { supabase } from '@/lib/supabase/client';
import {
  Search,
  Building2,
  Star,
  Sparkles,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  User,
  ChevronDown,
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
        const firstName = userProfile?.first_name || meta?.first_name || currentUser.email?.split('@')[0] || 'User';
        const lastName = userProfile?.last_name || meta?.last_name || '';
        const role = userProfile?.role || meta?.role || 'job_seeker';

        setProfile({
          first_name: firstName,
          last_name: lastName,
          role,
        });
      }
      setLoading(false);
    });
  }, []);

  const navLinks = [
    { name: 'Find Jobs', href: '/jobs', icon: Search },
    { name: 'Companies', href: '/companies', icon: Building2 },
    { name: 'Company Reviews', href: '/reviews', icon: Star },
    { name: 'How It Works', href: '/about', icon: Sparkles },
  ];

  const getDashboardHref = () => {
    if (!profile) return '/seeker/dashboard';
    if (profile.role === 'admin') return '/admin';
    if (profile.role === 'employer') return '/employer/dashboard';
    return '/seeker/dashboard';
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-mint-50 border border-mint-200 flex items-center justify-center p-1 shadow-sm group-hover:scale-105 transition-transform">
                <AppLogo className="w-7 h-7" color="#059669" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-dark flex items-center gap-0.5">
                  Work<span className="text-mint-600">Match</span>
                </span>
                <span className="hidden sm:block text-[10px] font-semibold text-muted tracking-wider uppercase -mt-1">
                  Skill & Location Matching
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'text-mint-700 bg-mint-50 font-semibold'
                        : 'text-slate-600 hover:text-dark hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-mint-600' : 'text-slate-400'}`} />
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* Auth State / Profile Controls */}
            <div className="hidden sm:flex items-center gap-3">
              {loading ? (
                <div className="w-20 h-8 bg-slate-100 animate-pulse rounded-xl" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <Link href={getDashboardHref()}>
                    <Button variant="primary" size="sm" className="shadow-sm flex items-center gap-1.5">
                      <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                    </Button>
                  </Link>

                  <div className="flex items-center gap-2.5 pl-3 border-l border-border">
                    <div className="w-8 h-8 rounded-full bg-mint-100 text-mint-800 font-bold text-xs flex items-center justify-center border border-mint-200">
                      {profile?.first_name ? profile.first_name[0] : 'U'}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-dark leading-tight line-clamp-1">
                        {profile?.first_name} {profile?.last_name || ''}
                      </p>
                      <p className="text-[10px] text-muted capitalize">
                        {profile?.role?.replace('_', ' ') || 'User'}
                      </p>
                    </div>
                    <button
                      onClick={() => setLogoutModalOpen(true)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                      title="Log Out"
                      aria-label="Log out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Link href="/roles">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/roles">
                    <Button variant="primary" size="sm" className="shadow-sm">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-border px-4 pt-2 pb-5 space-y-3 animate-slide-up">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-mint-50 hover:text-mint-700"
                >
                  <Icon className="w-4 h-4 text-mint-500" />
                  {link.name}
                </Link>
              );
            })}

            <div className="pt-3 border-t border-border">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-mint-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {profile?.first_name ? profile.first_name[0] : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-dark">{profile?.first_name} {profile?.last_name}</p>
                      <p className="text-[11px] text-muted capitalize">{profile?.role?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <Link href={getDashboardHref()} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full justify-center">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setLogoutModalOpen(true);
                    }}
                    className="w-full justify-center text-rose-600 hover:bg-rose-50 border-rose-200"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/roles" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/roles" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full justify-center">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Reusable Logout Modal */}
      <LogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
      />
    </>
  );
}
