-- Migration 05: Notifications Realtime & DB Trigger for Application Status

-- 1. Add tables to supabase_realtime publication
-- This enables realtime subscriptions for these tables.
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'applications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'interviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.interviews;
  END IF;
END $$;

-- 2. Create trigger function for application status changes
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_job_title TEXT;
BEGIN
  -- Only trigger if the status has changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Get the job title for the notification message
    SELECT title INTO v_job_title FROM public.jobs WHERE id = NEW.job_id;

    -- Insert notification for the applicant
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      is_read,
      created_at
    ) VALUES (
      NEW.applicant_id,
      'application',
      'Application Status Updated',
      'Your application for ' || v_job_title || ' has been moved to the ' || NEW.status || ' stage.',
      '/seeker/applications',
      false,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to applications table
DROP TRIGGER IF EXISTS on_application_status_change ON public.applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status_change();
