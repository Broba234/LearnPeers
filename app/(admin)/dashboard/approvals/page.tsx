"use client";
import { useState, useEffect, useCallback } from "react";

interface ApprovalRequest {
  id: string;
  tutor: { id: string; name: string | null; email: string | null; avatar: string | null } | null;
  subject: { code: string | null; name: string | null; grade: number | null; category: string | null } | null;
  grade_value: string | null;
  grade_scale: string | null;
  grade_label: string | null;
  mastery: number | null;
  priced: boolean;
  proof_url: string | null;
  submitted_at: string;
}

export default function CourseApprovalsPage() {
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/course-approvals");
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      setItems(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection (shown to the tutor):") || undefined;
      if (reason === undefined) return; // cancelled
    }
    setBusy(id);
    try {
      const res = await fetch("/api/admin/course-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_asset_id: id, action, reason }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Action failed");
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const filtered = items.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (r.tutor?.name || "").toLowerCase().includes(q) ||
      (r.tutor?.email || "").toLowerCase().includes(q) ||
      (r.subject?.code || "").toLowerCase().includes(q) ||
      (r.subject?.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Course Verifications</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Tutors requesting the right to tutor a course. Review the uploaded transcript, then approve or reject.
            </p>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Pending: {filtered.length}</span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
            {error}
          </div>
        )}
        {loading && (
          <div className="mb-6 p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg text-brand-800 dark:text-brand-300">
            Loading requests…
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tutor or course…"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        <div className="space-y-3">
          {filtered.length > 0 ? (
            filtered.map((r) => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-300 font-medium flex-shrink-0">
                      {(r.tutor?.name || "T").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{r.tutor?.name || "Tutor"}</span>
                        <span className="rounded-md bg-gray-900 px-2 py-0.5 text-[11px] font-bold text-white">{r.subject?.code || "—"}</span>
                        {r.subject?.grade && <span className="text-[11px] text-gray-400">Grade {r.subject.grade}</span>}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{r.subject?.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{r.tutor?.email}</span>
                        <span>·</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Claimed grade: {r.grade_label}{r.mastery != null ? ` (${r.mastery}% mastery)` : ""}</span>
                        {r.priced && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">priced — will go live on approval</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.proof_url ? (
                      <a
                        href={r.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        View transcript
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">No document</span>
                    )}
                    <button
                      onClick={() => act(r.id, "reject")}
                      disabled={busy === r.id}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => act(r.id, "approve")}
                      disabled={busy === r.id}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === r.id ? "…" : "Approve"}
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-400">Submitted {formatDate(r.submitted_at)}</div>
              </div>
            ))
          ) : (
            !loading && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center text-gray-500 dark:text-gray-400">
                No pending verification requests.
              </div>
            )
          )}
        </div>
      </div>
  );
}
