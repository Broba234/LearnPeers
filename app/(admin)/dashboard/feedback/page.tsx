"use client";
import { useState, useEffect } from "react";

interface Feedback {
  id: string;
  message: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  page: string | null;
  is_read: boolean;
  created_at: string;
  Profiles?: { name: string | null; email: string | null; role: string | null } | null;
}

export default function FeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "signed-in" | "anonymous">("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/feedback");
        if (!res.ok) throw new Error("Failed to fetch feedback");
        setItems(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load feedback");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const displayName = (f: Feedback) =>
    f.Profiles?.name || f.name || (f.user_id ? "Account user" : "Anonymous");
  const displayEmail = (f: Feedback) => f.Profiles?.email || f.email || null;

  const filtered = items.filter((f) => {
    const matchesSearch =
      searchTerm === "" ||
      f.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (displayEmail(f) || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      displayName(f).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "signed-in" && f.user_id) ||
      (filter === "anonymous" && !f.user_id);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Beta Feedback
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Messages submitted from the in-app feedback widget.
            </p>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total: {filtered.length}
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
            {error}
          </div>
        )}
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-300">
            Loading feedback…
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search message, name, or email…"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All</option>
            <option value="signed-in">Signed-in users</option>
            <option value="anonymous">Anonymous</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.length > 0 ? (
            filtered.map((f) => (
              <div
                key={f.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-medium">
                      {displayName(f).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {displayName(f)}
                        </span>
                        {f.user_id ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                            {f.Profiles?.role || "user"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            anonymous
                          </span>
                        )}
                      </div>
                      {displayEmail(f) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {displayEmail(f)}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-xs text-gray-400">
                    {formatDate(f.created_at)}
                  </span>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {f.message}
                </p>

                {f.page && (
                  <div className="mt-3 text-xs text-gray-400">
                    on <span className="font-mono">{f.page}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            !loading && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center text-gray-500 dark:text-gray-400">
                No feedback yet.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
