-- Migration 07: Job Views & Click Tracking Support
-- Tracks candidate visits and clicks with atomic increments and activity logs

-- 1. Ensure views column has default 0 on jobs table
ALTER TABLE public.jobs 
    ALTER COLUMN views SET DEFAULT 0;

-- 2. Create job_views table for recording candidate visits and clicks
CREATE TABLE IF NOT EXISTS public.job_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'card_click', -- 'card_click', 'view_details', 'apply_click', 'stalker_view', 'page_view'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast counts and lookups
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON public.job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewer_id ON public.job_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_job_views_created_at ON public.job_views(created_at DESC);

-- 3. RLS Policies for job_views
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert job views" ON public.job_views;
DROP POLICY IF EXISTS "Public can view job views" ON public.job_views;

CREATE POLICY "Public can insert job views" ON public.job_views 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view job views" ON public.job_views 
    FOR SELECT USING (true);

-- 4. Atomic stored procedure to increment job views
CREATE OR REPLACE FUNCTION public.increment_job_view(job_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_views INTEGER;
BEGIN
    UPDATE public.jobs
    SET views = COALESCE(views, 0) + 1,
        updated_at = NOW()
    WHERE id = job_id
    RETURNING views INTO new_views;

    RETURN COALESCE(new_views, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission to anon, authenticated and service_role
GRANT EXECUTE ON FUNCTION public.increment_job_view(UUID) TO anon, authenticated, service_role;
