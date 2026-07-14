import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { isTutorLive } from "@/lib/presence";
import { createNotification } from "@/lib/notifications";

// A pending request only rings on the tutor side while it's fresh (see
// /api/sessions/incoming MAX_AGE_MS). Keep these in sync: a stale pending
// request can no longer be accepted, so we must not reuse it.
const PENDING_TTL_MS = 5 * 60 * 1000;

/**
 * Student taps "Connect Now" on a live tutor. Creates an on-demand (is_instant)
 * session request with no upfront payment friction — the tutor accepts and both
 * drop straight into the room. Payment for instant sessions is settled
 * after-the-fact (or waived while payments aren't wired up).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const studentId = user.id;

    const { tutorId, subjectId, topic } = await request.json();
    if (!tutorId) {
      return NextResponse.json({ error: "Missing tutorId" }, { status: 400 });
    }
    if (tutorId === studentId) {
      return NextResponse.json({ error: "You cannot connect with yourself" }, { status: 400 });
    }

    // The tutor must actually be live right now.
    const tutor = await prisma.profiles.findUnique({
      where: { id: tutorId },
      select: { id: true, name: true, isAvailableNow: true, last_active_at: true },
    });
    if (!tutor) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }
    if (!isTutorLive(tutor.isAvailableNow, tutor.last_active_at)) {
      return NextResponse.json(
        { error: "This tutor just went offline. Try another available tutor.", code: "TUTOR_OFFLINE" },
        { status: 409 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Reuse an existing live request between these two if one is already pending,
    // so a double-tap doesn't spam the tutor with duplicates. A session already
    // accepted/in_progress is always safe to rejoin; a *pending* one is only
    // reusable while it's still fresh enough for the tutor to be ringing on it.
    const { data: existing } = await supabase
      .from("Sessions")
      .select("id, status, created_at")
      .eq("tutor_id", tutorId)
      .eq("student_id", studentId)
      .eq("is_instant", true)
      .in("status", ["pending", "accepted", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const isStalePending =
        existing.status === "pending" &&
        Date.now() - new Date(existing.created_at).getTime() > PENDING_TTL_MS;
      if (!isStalePending) {
        return NextResponse.json({ success: true, sessionId: existing.id, status: existing.status, reused: true });
      }
      // The tutor's ring has long since dropped this request — retire it so a
      // fresh one can be created instead of leaving the student waiting forever.
      await supabase.from("Sessions").update({ status: "cancelled" }).eq("id", existing.id);
    }

    // Price the instant session at the tutor's 30-min rate for the record (best
    // effort — instant connect never blocks on payment).
    let amount: number | null = null;
    if (subjectId) {
      const pos = await prisma.profilesOnSubjects.findUnique({
        where: { profile_id_subject_id: { profile_id: tutorId, subject_id: subjectId } },
        select: { price_1: true },
      });
      amount = pos?.price_1 ?? null;
    }

    const now = new Date();
    const { data: session, error } = await supabase
      .from("Sessions")
      .insert({
        tutor_id: tutorId,
        student_id: studentId,
        subject_id: subjectId || null,
        topic: topic || "Live session",
        date: now.toISOString().split("T")[0],
        start_time: now.toTimeString().slice(0, 8),
        duration: 0.5,
        amount,
        status: "pending",
        is_instant: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[INSTANT_REQUEST_CREATE]", error);
      return NextResponse.json(
        { error: "Failed to create request" },
        { status: 500 }
      );
    }

    const { data: studentProfile } = await supabase
      .from("Profiles")
      .select("name")
      .eq("id", studentId)
      .single();

    await createNotification(supabase, {
      userId: tutorId,
      type: "instant_request",
      title: "⚡ Live session request",
      body: `${studentProfile?.name || "A student"} wants to connect right now${topic ? ` · ${topic}` : ""}.`,
      sessionId: session.id,
      actorId: studentId,
    });

    return NextResponse.json({ success: true, sessionId: session.id, status: "pending" });
  } catch (err) {
    console.error("[instant-request] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
