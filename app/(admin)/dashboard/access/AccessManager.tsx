"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface Seat {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  isOwner: boolean;
  pages: string[];
}

interface PageMeta {
  key: string;
  label: string;
  group: string;
  blurb: string;
}

const GROUP_LABELS: Record<string, string> = {
  analytics: "Analytics",
  operations: "Operations",
};

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

export default function AccessManager({
  initialSeats,
  pages,
  selfId,
}: {
  initialSeats: Seat[];
  pages: PageMeta[];
  selfId: string;
}) {
  const router = useRouter();
  const [seats, setSeats] = useState<Seat[]>(initialSeats);
  const [drafts, setDrafts] = useState<Record<string, string[]>>(
    Object.fromEntries(initialSeats.map((s) => [s.id, s.pages]))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPages, setNewPages] = useState<string[]>([]);

  const grouped = useMemo(() => {
    const g: Record<string, PageMeta[]> = {};
    for (const p of pages) (g[p.group] ??= []).push(p);
    return g;
  }, [pages]);

  const flash = (kind: "error" | "success", text: string) => {
    setBanner({ kind, text });
    if (kind === "success") setTimeout(() => setBanner(null), 3000);
  };

  const toggleDraft = (seatId: string, key: string) => {
    setDrafts((d) => {
      const cur = new Set(d[seatId] ?? []);
      cur.has(key) ? cur.delete(key) : cur.add(key);
      return { ...d, [seatId]: [...cur] };
    });
  };

  const saveSeat = async (seat: Seat) => {
    setBusy(seat.id);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/seats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: seat.id, pages: drafts[seat.id] ?? [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSeats((ss) => ss.map((s) => (s.id === seat.id ? { ...s, pages: data.seat.admin_pages } : s)));
      flash("success", `Updated ${seat.name || seat.email}'s access`);
      router.refresh();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setBusy(null);
    }
  };

  const revokeSeat = async (seat: Seat) => {
    if (!confirm(`Revoke all admin access for ${seat.name || seat.email}?`)) return;
    setBusy(seat.id);
    try {
      const res = await fetch(`/api/admin/seats?id=${encodeURIComponent(seat.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke");
      setSeats((ss) => ss.filter((s) => s.id !== seat.id));
      flash("success", `Revoked ${seat.name || seat.email}`);
      router.refresh();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setBusy(null);
    }
  };

  const addSeat = async () => {
    if (!newEmail.trim()) return;
    setBusy("__add__");
    setBanner(null);
    try {
      const res = await fetch("/api/admin/seats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), pages: newPages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add seat");
      const seat: Seat = {
        id: data.seat.id,
        name: data.seat.name,
        email: data.seat.email,
        avatar: data.seat.avatar,
        isOwner: data.seat.is_owner,
        pages: data.seat.admin_pages,
      };
      setSeats((ss) => [...ss.filter((s) => s.id !== seat.id), seat]);
      setDrafts((d) => ({ ...d, [seat.id]: seat.pages }));
      setNewEmail("");
      setNewPages([]);
      flash("success", `Granted a seat to ${seat.email}`);
      router.refresh();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            banner.kind === "error"
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Add a seat */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Add a seat</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-4">
          The person must already have a LearnPeers account. Grant them an admin seat and choose what they can see.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="exec@yourcompany.com"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
          <button
            onClick={addSeat}
            disabled={busy === "__add__" || !newEmail.trim()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {busy === "__add__" ? "Adding…" : "Add seat"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {pages.map((p) => {
            const on = newPages.includes(p.key);
            return (
              <button
                key={p.key}
                onClick={() => setNewPages((np) => (on ? np.filter((k) => k !== p.key) : [...np, p.key]))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  on
                    ? "bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                {on ? "✓ " : ""}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Seats */}
      <div className="space-y-4">
        {seats.map((seat) => {
          const draft = drafts[seat.id] ?? seat.pages;
          const dirty = !seat.isOwner && !sameSet(draft, seat.pages);
          const isSelf = seat.id === selfId;
          return (
            <div key={seat.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {seat.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={seat.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-300 font-semibold">
                      {(seat.name?.[0] || seat.email[0]).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{seat.name || seat.email}</p>
                      {seat.isOwner && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 px-1.5 py-0.5 rounded">Owner</span>
                      )}
                      {isSelf && !seat.isOwner && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded">You</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{seat.email}</p>
                  </div>
                </div>
                {!seat.isOwner && !isSelf && (
                  <div className="flex items-center gap-2">
                    {dirty && (
                      <button
                        onClick={() => saveSeat(seat)}
                        disabled={busy === seat.id}
                        className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
                      >
                        {busy === seat.id ? "Saving…" : "Save changes"}
                      </button>
                    )}
                    <button
                      onClick={() => revokeSeat(seat)}
                      disabled={busy === seat.id}
                      className="px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-semibold"
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </div>

              {seat.isOwner ? (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Full access to every page, including this one.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {Object.entries(grouped).map(([group, ps]) => (
                    <div key={group}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                        {GROUP_LABELS[group] ?? group}
                      </p>
                      <div className="space-y-2">
                        {ps.map((p) => (
                          <label key={p.key} className={`flex items-start gap-2.5 ${isSelf ? "opacity-60" : "cursor-pointer"}`}>
                            <input
                              type="checkbox"
                              checked={draft.includes(p.key)}
                              disabled={isSelf}
                              onChange={() => toggleDraft(seat.id, p.key)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span>
                              <span className="block text-sm text-gray-800 dark:text-gray-200">{p.label}</span>
                              <span className="block text-xs text-gray-400 dark:text-gray-500">{p.blurb}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
