/**
 * WorkMatch — Supabase Query Helpers
 */

import { supabase } from '@/lib/supabase/client';
import type {
  Profile,
  JobSeekerProfile,
  Company,
  Job,
  Application,
  ApplicationStatus,
  Document,
  CompanyReview,
  AuditLog,
  Report,
  UserSettings,
  VerificationStatus,
} from '@/types/database';

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function getSession() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ─── PROFILES ────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data: data as Profile | null, error };
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: (data ?? []) as Profile[], error };
}

// ─── JOB SEEKER PROFILES ─────────────────────────────────────────────────────

export async function getSeekerProfile(userId: string) {
  const { data, error } = await supabase
    .from('job_seeker_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data: data as JobSeekerProfile | null, error };
}

export async function upsertSeekerProfile(userId: string, profile: Partial<JobSeekerProfile>) {
  const { data, error } = await supabase
    .from('job_seeker_profiles')
    .upsert({ ...profile, user_id: userId, updated_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error };
}

// ─── JOBS ────────────────────────────────────────────────────────────────────

export async function getJobs(filters?: {
  keyword?: string;
  city?: string;
  work_arrangement?: string;
  experience_level?: string;
  status?: string;
}) {
  let query = supabase
    .from('jobs')
    .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  } else {
    query = query.eq('status', 'published');
  }
  if (filters?.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters?.work_arrangement) query = query.eq('work_arrangement', filters.work_arrangement);
  if (filters?.experience_level) query = query.eq('experience_level', filters.experience_level);
  if (filters?.keyword) {
    query = query.or(`title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as Job[], error };
}

export async function getJobById(id: string) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
    .eq('id', id)
    .single();
  return { data: data as Job | null, error };
}
