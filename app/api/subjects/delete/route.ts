import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/admin-access';

export async function DELETE(req: NextRequest) {
  try {
    // Admin-only: deletes from the global subject catalog.
    const { res } = await requireAdminApi('subjects');
    if (res) return res;

    const { subjectId } = await req.json();

    // Check if subject exists
    const existingSubject = await prisma.subjects.findUnique({
      where: { id: subjectId }
    });

    if (!existingSubject) {
      return new Response(
        JSON.stringify({ 
          error: 'Subject not found' 
        }), 
        { status: 404 }
      );
    }

    // Delete the subject
    await prisma.subjects.delete({
      where: { id: subjectId }
    });

    return new Response(
      JSON.stringify({ 
        message: 'Subject deleted successfully',
        deletedSubject: existingSubject
      }), 
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[SUBJECTS_DELETE] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
      }),
      { status: 500 }
    );
  }
}