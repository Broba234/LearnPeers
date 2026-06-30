import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/api-auth';

export async function GET() {
  try {
    // Only the caller's own sessions — tutor id is the authenticated user.
    const { user, res } = await requireUser();
    if (res) return res;

    const supabase = createSupabaseAdminClient();

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
      .eq('tutor_id', user.id)
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