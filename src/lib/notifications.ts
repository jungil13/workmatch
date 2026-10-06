import { supabase } from '@/lib/supabase/client';

export interface SendNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export async function sendNotification({
  userId,
  type,
  title,
  message,
  link,
}: SendNotificationParams) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link: link || null,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('sendNotification warning:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('sendNotification error:', err);
    return null;
  }
}
