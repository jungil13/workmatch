export interface SendNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export async function sendNotification(params: SendNotificationParams) {
  if (!params.userId) return null;

  try {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('sendNotification error:', err);
    return null;
  }
}
