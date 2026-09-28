-- Migration 06: Urgent Hiring & Openings / Hires Count Support

-- Add hires_count and is_urgent to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS hires_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;

-- Add is_urgent to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;

-- Add index on is_urgent for fast filtering
CREATE INDEX IF NOT EXISTS idx_jobs_is_urgent ON public.jobs(is_urgent);
CREATE INDEX IF NOT EXISTS idx_companies_is_urgent ON public.companies(is_urgent);
