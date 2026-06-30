import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/api-auth';

export async function PATCH(request: NextRequest) {
  try {
    // Only the caller's own notifications — user id from the session, never the
    // request body. Any notificationId is still scoped to user_id below.
    const { user, res } = await requireUser();
    if (res) return res;
    const userId = user.id;

    const supabase = createSupabaseAdminClient();

    const { notificationId } = await request.json().catch(() => ({}));

    if (notificationId) {
      // Mark a single notification as read
      const { error } = await supabase
        .from('Notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
      }
    } else {
      // Mark all notifications as read for the user
      const { error } = await supabase
        .from('Notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
