import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Create server-side Supabase client with service role key
    const supabase = createSupabaseAdminClient();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'StudentId parameter is required' }, { status: 400 });
    }


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
      .eq('student_id', studentId)
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