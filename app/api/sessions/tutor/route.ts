import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Create server-side Supabase client with service role key
    const supabase = createSupabaseAdminClient();

    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get('tutorId');

    if (!tutorId) {
      return NextResponse.json({ error: 'TutorId parameter is required' }, { status: 400 });
    }


    // Fetch sessions where user is the tutor
    const { data: sessions, error: fetchError } = await supabase
      .from('Sessions')
      .select(`
        *,
        student:student_id (
          id,
          name,
          avatar,
          bio
        )
      `)
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Tutor sessions fetch error:', fetchError);
      console.error('Full error details:', JSON.stringify(fetchError, null, 2));
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
    console.error('Server error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 