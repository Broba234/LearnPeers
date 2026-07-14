import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { notifySessionCreated } from '@/lib/notifications';
import { getAuthedUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    // Identity from the session cookie, not the request body.
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const studentId = user.id;

    // Create server-side Supabase client with service role key
    const supabase = createSupabaseAdminClient();

    const { tutorId, topic, notes, start_time, duration, date, amount, subjectId } = await request.json();

    if (!tutorId) {
      return NextResponse.json({ error: 'Missing tutorId' }, { status: 400 });
    }

    // Reject sessions scheduled in the past
    if (date && start_time) {
      const sessionStart = new Date(`${date}T${start_time}`);
      if (sessionStart < new Date()) {
        return NextResponse.json({ error: 'Cannot book a session in the past' }, { status: 400 });
      }
    }


    // Insert new Session
    const { data, error } = await supabase
      .from('Sessions')
      .insert({
        tutor_id: tutorId,
        student_id: studentId,
        subject_id: subjectId || null,
        start_time: start_time,
        duration: duration,
        topic: topic || null,
        notes: notes || null,
        date: date,
        amount: amount,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[SESSION_CREATE]', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Look up student name for the notification
    const { data: studentProfile } = await supabase
      .from('Profiles')
      .select('name')
      .eq('id', studentId)
      .single();

    await notifySessionCreated(supabase, {
      tutorId,
      studentId,
      studentName: studentProfile?.name || 'A student',
      topic: topic || undefined,
      sessionId: data.id,
    });

    return NextResponse.json({
      success: true,
      session: data
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
