'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Profile, UserStatus } from '@/types/database';
import { Search, Users } from 'lucide-react';

export default function AdminUsersPage() {
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setAllUsers(data ?? []);
    setLoading(false);
  }

  const filteredUsers = allUsers.filter((u) => {
    const matchSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleToggleStatus = async (userId: string, currentStatus: string, email: string) => {
    const nextStatus: UserStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await supabase.from('profiles').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', userId);
    await supabase.from('audit_logs').insert({
      action: `Admin changed user status to ${nextStatus}`,
      entity_type: 'profile',
      entity_id: userId,
      metadata: { email },
      created_at: new Date().toISOString(),
    });
    fetchUsers();
  };

  return (
    <DashboardLayout
      portal="admin"
      title="User Management"
      subtitle="Inspect candidate accounts, employers, roles, and platform permissions."
    >
      <div className="space-y-6 max-w-7xl">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-border p-4 md:p-6 shadow-soft grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Search users by name or email..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-dark focus:border-mint-500 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="job_seeker">Job Seekers</option>
              <option value="employer">Employers</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-soft">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-dark">No users found</h3>
              <p className="text-xs text-muted">Registered job seekers, employers, and admins will appear in this list.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-border text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-6">User / Account</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Joined Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-mint-100 text-mint-800 font-bold flex items-center justify-center shrink-0">
                            {user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}
                          </div>
                          <div>
                            <p className="font-bold text-dark text-sm">{user.first_name} {user.last_name}</p>
                            <p className="text-muted text-[11px]">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="capitalize font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {user.role?.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {user.status === 'active' ? (
                          <span className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full font-bold border border-rose-200">
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-slate-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Button
                          variant={user.status === 'active' ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleStatus(user.id, user.status, user.email)}
                          className="h-8 text-xs font-bold"
                        >
                          {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
