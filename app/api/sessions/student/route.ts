import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/api-auth';

export async function GET() {
  try {
    // Only the caller's own sessions — student id is the authenticated user.
    const { user, res } = await requireUser();
    if (res) return res;

    const supabase = createSupabaseAdminClient();

    // Fetch sessions where user is the student
    const { data: sessions, error: fetchError } = await supabase
      .from('Sessions')
      .select(`
        *,
        tutor:tutor_id (
          id,
          name,
          avatar,
          bio,
          hourlyRate
        )
      `)
      .eq('student_id', user.id)
      // awaiting_payment = abandoned/in-flight checkout draft, not a booking.
      .neq('status', 'awaiting_payment')
      .order('created_at', { ascending: false });

    if (fetchError) { 
      return NextResponse.json({ 
        error: 'Failed to fetch sessions', 
        details: fetchError.message,
        code: fetchError.code 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true, 
      sessions: sessions || []
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 