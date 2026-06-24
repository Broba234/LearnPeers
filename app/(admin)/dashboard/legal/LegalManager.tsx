"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Send,
  Archive,
  Users,
  X,
  Eye,
  Loader2,
} from "lucide-react";

interface LegalDoc {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  status: "draft" | "published" | "archived";
  requires_acceptance: boolean;
  requires_reacceptance: boolean;
  effective_date: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  acceptanceCount: number;
}

interface Acceptance {
  accepted_at: string;
  ip_address: string | null;
  method: string | null;
  Profiles: { name: string | null; email: string | null; role: string | null } | null;
}

const PRESET_TYPES: { value: string; label: string }[] = [
  { value: "terms_of_service", label: "Terms of Service" },
  { value: "privacy_policy", label: "Privacy Policy" },
];

function typeLabel(type: string) {
  const preset = PRESET_TYPES.find((t) => t.value === type);
  if (preset) return preset.label;
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  archived: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

interface EditorState {
  // When `id` is set we're editing an existing draft; otherwise creating new.
  id: string | null;
  type: string;
  typeLocked: boolean; // true when versioning an existing type
  title: string;
  content: string;
  summary: string;
  requires_acceptance: boolean;
  requires_reacceptance: boolean;
  effective_date: string;
  /** Set when opening the modal purely to read a published/archived version. */
  readonly?: boolean;
  version?: number;
}

const proseClasses =
  "legal-prose text-sm leading-relaxed text-gray-700 dark:text-gray-300 [&_a]:text-brand-600 [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-900 dark:[&_h2]:text-white [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:mb-1 [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 first:[&_h2]:mt-0";

export default function LegalManager() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const [acceptancesFor, setAcceptancesFor] = useState<LegalDoc | null>(null);
  const [acceptances, setAcceptances] = useState<Acceptance[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/legal");
      if (!res.ok) throw new Error("Failed to load legal documents");
      const data = await res.json();
      setDocs(data.documents as LegalDoc[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Group documents by type, versions already sorted desc by the API.
  const groups = useMemo(() => {
    const map = new Map<string, LegalDoc[]>();
    for (const d of docs) {
      const arr = map.get(d.type) ?? [];
      arr.push(d);
      map.set(d.type, arr);
    }
    return [...map.entries()];
  }, [docs]);

  const openNewDocument = () =>
    setEditor({
      id: null,
      type: "",
      typeLocked: false,
      title: "",
      content: "",
      summary: "",
      requires_acceptance: true,
      requires_reacceptance: true,
      effective_date: "",
    });

  // Clone the latest version of a type into a new draft.
  const openNewVersion = (latest: LegalDoc) =>
    setEditor({
      id: null,
      type: latest.type,
      typeLocked: true,
      title: latest.title,
      content: latest.content,
      summary: "",
      requires_acceptance: latest.requires_acceptance,
      requires_reacceptance: latest.requires_reacceptance,
      effective_date: "",
    });

  const openEditDraft = (d: LegalDoc) =>
    setEditor({
      id: d.id,
      type: d.type,
      typeLocked: true,
      title: d.title,
      content: d.content,
      summary: d.summary ?? "",
      requires_acceptance: d.requires_acceptance,
      requires_reacceptance: d.requires_reacceptance,
      effective_date: d.effective_date ? d.effective_date.slice(0, 10) : "",
    });

  const saveEditor = useCallback(async () => {
    if (!editor) return;
    if (!editor.title.trim() || !editor.content.trim() || (!editor.id && !editor.type.trim())) {
      toast.error("Type, title and content are all required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: editor.type,
        title: editor.title,
        content: editor.content,
        summary: editor.summary || null,
        requires_acceptance: editor.requires_acceptance,
        requires_reacceptance: editor.requires_reacceptance,
        effective_date: editor.effective_date || null,
      };
      const res = editor.id
        ? await fetch(`/api/admin/legal/${editor.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/legal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(editor.id ? "Draft saved" : "Draft created");
      setEditor(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [editor, load]);

  const act = useCallback(
    async (d: LegalDoc, action: "publish" | "archive") => {
      const verb = action === "publish" ? "publish" : "archive";
      const note =
        action === "publish"
          ? d.requires_acceptance
            ? d.requires_reacceptance
              ? "This will go live and require all users to accept it on next sign-in."
              : "This will go live. Existing users who accepted an earlier version are grandfathered."
            : "This will go live (no acceptance required)."
          : "This version will be archived.";
      if (!window.confirm(`${verb[0].toUpperCase() + verb.slice(1)} v${d.version} of ${typeLabel(d.type)}?\n\n${note}`)) return;
      try {
        const res = await fetch(`/api/admin/legal/${d.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `${verb} failed`);
        toast.success(action === "publish" ? "Published" : "Archived");
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `${verb} failed`);
      }
    },
    [load]
  );

  const deleteDraft = useCallback(
    async (d: LegalDoc) => {
      if (!window.confirm(`Delete draft v${d.version} of ${typeLabel(d.type)}? This can't be undone.`)) return;
      try {
        const res = await fetch(`/api/admin/legal/${d.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Delete failed");
        toast.success("Draft deleted");
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    },
    [load]
  );

  const openAcceptances = useCallback(async (d: LegalDoc) => {
    setAcceptancesFor(d);
    setAcceptances(null);
    try {
      const res = await fetch(`/api/admin/legal/${d.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAcceptances(data.acceptances as Acceptance[]);
    } catch {
      setAcceptances([]);
    }
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Each publish creates a new immutable version. Publishing Terms of Service prompts every user to re-sign on
          their next visit.
        </p>
        <button
          onClick={openNewDocument}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New document
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {loading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>}

      {!loading && groups.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No documents yet. Create one to get started.
        </div>
      )}

      <div className="space-y-6">
        {groups.map(([type, versions]) => {
          const latest = versions[0]; // highest version
          return (
            <div
              key={type}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{typeLabel(type)}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-mono">{type}</span> · {versions.length} version
                      {versions.length === 1 ? "" : "s"}
                      {latest.requires_acceptance ? " · acceptance required" : " · informational"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openNewVersion(latest)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Plus className="h-3.5 w-3.5" /> New version
                </button>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {versions.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">v{d.version}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[d.status]}`}>
                          {d.status}
                        </span>
                        {!d.requires_reacceptance && d.requires_acceptance && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            grandfathered
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {d.title}
                        {d.summary ? ` — ${d.summary}` : ""}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-400">
                        {d.status === "published" ? `Effective ${fmtDate(d.effective_date)} · ` : ""}
                        Updated {fmtDate(d.updated_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditor({ ...toReadonly(d) })}
                        title="View"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {d.acceptanceCount > 0 && (
                        <button
                          onClick={() => openAcceptances(d)}
                          title="View acceptances"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Users className="h-4 w-4" /> {d.acceptanceCount}
                        </button>
                      )}
                      {d.status === "draft" && (
                        <>
                          <button
                            onClick={() => openEditDraft(d)}
                            title="Edit draft"
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => act(d, "publish")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            <Send className="h-3.5 w-3.5" /> Publish
                          </button>
                          <button
                            onClick={() => deleteDraft(d)}
                            title="Delete draft"
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {d.status === "published" && (
                        <button
                          onClick={() => act(d, "archive")}
                          title="Archive"
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor / viewer modal */}
      {editor && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setEditor(null)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {editor.readonly
                  ? `${typeLabel(editor.type)} · v${editor.version}`
                  : editor.id
                  ? "Edit draft"
                  : editor.typeLocked
                  ? `New version of ${typeLabel(editor.type)}`
                  : "New document"}
              </h3>
              <div className="flex items-center gap-2">
                {!editor.readonly && (
                  <button
                    onClick={() => setPreviewing((p) => !p)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {previewing ? "Edit" : "Preview"}
                  </button>
                )}
                <button
                  onClick={() => setEditor(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {editor.readonly || previewing ? (
                <div
                  className={proseClasses}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editor.content) }}
                />
              ) : (
                <div className="space-y-4">
                  {!editor.typeLocked && (
                    <Field label="Document type (slug)">
                      <input
                        list="legal-type-presets"
                        value={editor.type}
                        onChange={(e) => setEditor({ ...editor, type: e.target.value })}
                        placeholder="terms_of_service"
                        className={inputCls}
                      />
                      <datalist id="legal-type-presets">
                        {PRESET_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </datalist>
                    </Field>
                  )}
                  <Field label="Title">
                    <input
                      value={editor.title}
                      onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                      placeholder="LearnPeers Terms of Service"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="What changed (summary, optional)">
                    <input
                      value={editor.summary}
                      onChange={(e) => setEditor({ ...editor, summary: e.target.value })}
                      placeholder="Clarified session liability and refunds."
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Content (HTML)">
                    <textarea
                      value={editor.content}
                      onChange={(e) => setEditor({ ...editor, content: e.target.value })}
                      rows={16}
                      className={`${inputCls} font-mono text-xs`}
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Effective date (optional)">
                      <input
                        type="date"
                        value={editor.effective_date}
                        onChange={(e) => setEditor({ ...editor, effective_date: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={editor.requires_acceptance}
                      onChange={(e) => setEditor({ ...editor, requires_acceptance: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>
                      <span className="font-medium">Require users to accept this document</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        Users are gated until they sign it. Leave off for informational documents (e.g. Privacy Policy).
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={editor.requires_reacceptance}
                      disabled={!editor.requires_acceptance}
                      onChange={(e) => setEditor({ ...editor, requires_reacceptance: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-40"
                    />
                    <span>
                      <span className="font-medium">Require everyone to re-accept on publish</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        Uncheck to grandfather in existing accounts — users who accepted a previous version won&apos;t
                        be re-prompted.
                      </span>
                    </span>
                  </label>
                </div>
              )}
            </div>

            {!editor.readonly && (
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
                <button
                  onClick={() => setEditor(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditor}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editor.id ? "Save draft" : "Create draft"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Acceptances audit modal */}
      {acceptancesFor && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAcceptancesFor(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Acceptances · {typeLabel(acceptancesFor.type)} v{acceptancesFor.version}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {acceptancesFor.acceptanceCount} total{acceptances && acceptances.length < acceptancesFor.acceptanceCount ? ` · showing latest ${acceptances.length}` : ""}
                </p>
              </div>
              <button
                onClick={() => setAcceptancesFor(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {acceptances === null ? (
                <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
              ) : acceptances.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No acceptances recorded.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-2 font-medium">User</th>
                      <th className="px-5 py-2 font-medium">When</th>
                      <th className="px-5 py-2 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {acceptances.map((a, i) => (
                      <tr key={i}>
                        <td className="px-5 py-2">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {a.Profiles?.name || a.Profiles?.email || "—"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {a.Profiles?.email}
                            {a.Profiles?.role ? ` · ${a.Profiles.role}` : ""}
                          </div>
                        </td>
                        <td className="px-5 py-2 text-gray-600 dark:text-gray-300">{fmtDateTime(a.accepted_at)}</td>
                        <td className="px-5 py-2 font-mono text-xs text-gray-500">{a.ip_address || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

// Read-only viewer reuses the editor modal with a `readonly` flag + version label.
function toReadonly(d: LegalDoc): EditorState & { readonly: true; version: number } {
  return {
    id: d.id,
    type: d.type,
    typeLocked: true,
    title: d.title,
    content: d.content,
    summary: d.summary ?? "",
    requires_acceptance: d.requires_acceptance,
    requires_reacceptance: d.requires_reacceptance,
    effective_date: d.effective_date ? d.effective_date.slice(0, 10) : "",
    readonly: true,
    version: d.version,
  };
}
