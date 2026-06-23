import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { notifySessionStatusChanged } from '@/lib/notifications';
import { getAuthedUser } from '@/lib/api-auth';
import { startSessionRecording, stopSessionRecording } from '@/lib/recording';

export async function PATCH(request: NextRequest) {
  try {
    // Identity from the session cookie, not the request body.
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = user.id;

    // Create server-side Supabase client with service role key
    const supabase = createSupabaseAdminClient();

    const { sessionId, status } = await request.json();

    // Validate input
    if (!sessionId || !status) {
      return NextResponse.json({ error: 'Missing sessionId or status' }, { status: 400 });
    }

    const validStatuses = ['pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // First, verify that the user is authorized to update this session
    const { data: session, error: fetchError } = await supabase
      .from('Sessions')
      .select('tutor_id, student_id')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // User must be either the tutor or student for this session
    if (session.tutor_id !== userId && session.student_id !== userId) {
      return NextResponse.json({ error: 'Not authorized to update this session' }, { status: 403 });
    }

    // Update the session status
    const updateData: any = { status };
    
    // Set timestamps based on status
    if (status === 'accepted') {
      // When accepting, we could set started_at to now or leave it for when session actually starts
      // updateData.started_at = new Date().toISOString();
    } else if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.ended_at = new Date().toISOString();
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('Sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Session update error:', updateError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    // Recording lifecycle (non-fatal, no-ops unless recording storage is set).
    // Only the tutor side drives egress so we don't double-start.
    if (session.tutor_id === userId) {
      if (status === 'in_progress') {
        startSessionRecording(sessionId).catch((e) =>
          console.error('[recording] start error:', e)
        );
      } else if (status === 'completed' || status === 'cancelled') {
        stopSessionRecording(sessionId).catch((e) =>
          console.error('[recording] stop error:', e)
        );
      }
    }

    // Send notification for the status change
    // Look up names for the notification text
    const { data: tutorProfile } = await supabase
      .from('Profiles')
      .select('name')
      .eq('id', session.tutor_id)
      .single();

    const { data: studentProfile } = await supabase
      .from('Profiles')
      .select('name')
      .eq('id', session.student_id)
      .single();

    await notifySessionStatusChanged(supabase, {
      sessionId,
      status,
      tutorId: session.tutor_id,
      studentId: session.student_id,
      actorUserId: userId,
      tutorName: tutorProfile?.name || 'Your tutor',
      studentName: studentProfile?.name || 'A student',
    });

    return NextResponse.json({
      success: true,
      session: updatedSession
    });
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 