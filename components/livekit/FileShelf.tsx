'use client';

import React from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  FileImage,
  File as FileIcon,
  Eye,
  Share2,
  Loader2,
} from 'lucide-react';

export interface SessionFile {
  id: string;
  name: string;
  type: string | null;
  size: number | null;
  url: string | null;
  storage_path: string;
  shared: boolean;
  created_at: string;
}

function iconFor(type: string | null, name: string) {
  const t = (type || '').toLowerCase();
  if (t.startsWith('image/')) return <FileImage className="h-5 w-5 text-emerald-600" />;
  if (t === 'application/pdf' || name.toLowerCase().endsWith('.pdf'))
    return <FileText className="h-5 w-5 text-red-500" />;
  return <FileIcon className="h-5 w-5 text-brand-600" />;
}

function prettySize(n: number | null) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const sanitize = (name: string) =>
  name.replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').slice(0, 200) || `file-${Date.now()}`;

export function FileShelf({
  sessionId,
  onOpenPrivate,
  onShare,
}: {
  sessionId: string;
  onOpenPrivate: (file: { url: string; name: string; type: string }) => void;
  onShare: (file: { url: string; name: string; type: string }) => void;
}) {
  const [files, setFiles] = React.useState<SessionFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/files?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const { files } = await res.json();
        setFiles(files || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `session-files/${sessionId}/${Date.now()}-${sanitize(file.name)}`;
      const { error: upErr } = await supabase.storage.from('eclero-storage').upload(path, file);
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from('eclero-storage').getPublicUrl(path);
      const res = await fetch('/api/sessions/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          name: file.name,
          type: file.type,
          size: file.size,
          url: publicUrl,
          storagePath: path,
        }),
      });
      if (!res.ok) throw new Error('record failed');
      await refresh();
    } catch (e: any) {
      toast.error(`Upload failed: ${e?.message || 'unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-ink-900">Session files</h2>
          <p className="text-sm text-ink-400">Share with your peer, or open just for yourself.</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-ink-900/10 bg-surface">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-ink-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-ink-400">
            <Upload className="h-6 w-6" />
            <p className="text-sm">No files yet — upload a PDF, image, or document.</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-900/5">
            {files.map((f) => {
              const file = { url: f.url || '', name: f.name, type: f.type || '' };
              return (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {iconFor(f.type, f.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{f.name}</p>
                    <p className="text-xs text-ink-400">{prettySize(f.size)}</p>
                  </div>
                  <button
                    onClick={() => file.url && onOpenPrivate(file)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-muted"
                    title="Open privately (only you)"
                  >
                    <Eye className="h-4 w-4" /> Open
                  </button>
                  <button
                    onClick={() => file.url && onShare(file)}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                    title="Show to both of you"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
