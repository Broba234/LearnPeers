import { SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { sendTutorRequestEmail } from '@/lib/email';

/** Resolve which address(es) a tutor's email notifications go to. */
function resolveNotifyRecipients(
  target: string,
  accountEmail: string,
  schoolEmail: string | null
): string[] {
  const account = accountEmail ? [accountEmail] : [];
  if (target === 'school') return schoolEmail ? [schoolEmail] : account;
  if (target === 'both')
    return Array.from(new Set([accountEmail, schoolEmail].filter(Boolean) as string[]));
  return account; // 'account' (default)
}

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  sessionId?: string;
  actorId?: string;
}

export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
) {
  const { error } = await supabase.from('Notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    session_id: params.sessionId || null,
    actor_id: params.actorId || null,
  });

  if (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function notifySessionCreated(
  supabase: SupabaseClient,
  {
    tutorId,
    studentId,
    studentName,
    topic,
    sessionId,
  }: {
    tutorId: string;
    studentId: string;
    studentName: string;
    topic?: string;
    sessionId: string;
  }
) {
  await createNotification(supabase, {
    userId: tutorId,
    type: 'session_requested',
    title: 'New Session Request',
    body: `${studentName} requested a ${topic || 'tutoring'} session.`,
    sessionId,
    actorId: studentId,
  });

  // Also email the tutor, routed by their notification preferences. Non-fatal:
  // an email hiccup must never break the request/notification flow.
  try {
    const tutor = await prisma.profiles.findUnique({
      where: { id: tutorId },
      select: {
        email: true,
        name: true,
        notify_email_enabled: true,
        notify_email_target: true,
        ProfileInstitutions: {
          where: { kind: 'current_university', status: 'verified' },
          select: { verified_email: true },
          take: 1,
        },
      },
    });
    if (tutor?.notify_email_enabled && tutor.email) {
      const schoolEmail = tutor.ProfileInstitutions[0]?.verified_email ?? null;
      const to = resolveNotifyRecipients(tutor.notify_email_target, tutor.email, schoolEmail);
      await sendTutorRequestEmail(to, {
        tutorName: tutor.name ? String(tutor.name).trim().split(/\s+/)[0] : undefined,
        studentName,
        topic,
      });
    }
  } catch (e) {
    console.error('Failed to email tutor about session request:', e);
  }
}

export async function notifySessionStatusChanged(
  supabase: SupabaseClient,
  {
    sessionId,
    status,
    tutorId,
    studentId,
    actorUserId,
    tutorName,
    studentName,
  }: {
    sessionId: string;
    status: string;
    tutorId: string;
    studentId: string;
    actorUserId: string;
    tutorName: string;
    studentName: string;
  }
) {
  const isTutorAction = actorUserId === tutorId;

  switch (status) {
    case 'accepted':
      // Notify the student that tutor accepted
      await createNotification(supabase, {
        userId: studentId,
        type: 'session_accepted',
        title: 'Session Accepted',
        body: `${tutorName} accepted your session request.`,
        sessionId,
        actorId: tutorId,
      });
      break;

    case 'declined':
      await createNotification(supabase, {
        userId: studentId,
        type: 'session_declined',
        title: 'Session Declined',
        body: `${tutorName} declined your session request.`,
        sessionId,
        actorId: tutorId,
      });
      break;

    case 'in_progress':
      // Notify the other party that session started
      await createNotification(supabase, {
        userId: isTutorAction ? studentId : tutorId,
        type: 'session_started',
        title: 'Session Started',
        body: `Your session with ${isTutorAction ? tutorName : studentName} has started.`,
        sessionId,
        actorId: actorUserId,
      });
      break;

    case 'completed':
      // Notify student that session is completed
      await createNotification(supabase, {
        userId: studentId,
        type: 'session_completed',
        title: 'Session Completed',
        body: `Your session with ${tutorName} has been completed.`,
        sessionId,
        actorId: tutorId,
      });
      break;

    case 'cancelled':
      await createNotification(supabase, {
        userId: isTutorAction ? studentId : tutorId,
        type: 'session_cancelled',
        title: 'Session Cancelled',
        body: `${isTutorAction ? tutorName : studentName} cancelled the session.`,
        sessionId,
        actorId: actorUserId,
      });
      break;
  }
}
