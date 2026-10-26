-- Migration 11: Add interview_type column to interviews table
-- This supports the new interview scheduling feature where employers
-- can specify whether the interview is online or on-site.

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS interview_type TEXT NOT NULL DEFAULT 'online'
    CHECK (interview_type IN ('online', 'onsite'));
