import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";


export async function PUT() {
  try {
    // Marks the CALLER's own setup complete — identity from the session.
    const { user, res } = await requireUser();
    if (res) return res;
      // Update the main profile
      const updatedProfile = await prisma.profiles.update({
        where: { id: user.id },
        data: {
          profile_setup: true,
        },
      });

    return new Response(JSON.stringify(updatedProfile), { status: 200 });
  } catch (error: any) {
    console.error('[PROFILE_UPDATE] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
    }), { status: 500 });
  }
}