'use client';

import { toast } from 'sonner';
import React, { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom as LKRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  TrackReference,
  useDataChannel,
  useRoomContext,
} from '@livekit/components-react';
import { Track, type DataPublishOptions } from 'livekit-client';
import '@livekit/components-styles';
import dynamic from 'next/dynamic';
// Using 'any' for imperative API type to avoid version export mismatches
// Excalidraw CSS will be added after install
import { supabase } from '@/lib/supabase/client';
import { startScreenShare, stopScreenShare, isScreenSharing, showSuccess, BrowserCompatibility } from '@/lib/screenShare';
import { getSceneVersion, mergeWithRemoteElements } from '@/components/livekit/utils';
import { PointerOverlay } from '@/components/livekit/PointerOverlay';
import { FloatingVideos } from '@/components/livekit/FloatingVideos';
import { ScreenView } from '@/components/livekit/ScreenView';
import { FileViewer } from '@/components/livekit/FileViewer';
import { FileShelf } from '@/components/livekit/FileShelf';
import {
  Pencil,
  Video,
  VideoOff,
  FileText,
  Monitor,
  Mic,
  MicOff,
  ScreenShare,
  Upload,
  PhoneOff,
  Clock,
  Presentation,
  Folder,
} from 'lucide-react';

interface LiveKitRoomProps {
  roomName: string;
  userIdentity: string;
  userName: string;
  userRole: 'tutor' | 'student';
  onDisconnect?: () => void;
  isOpen: boolean;
  topic?: string;
}

const LiveKitRoom: React.FC<LiveKitRoomProps> = ({
  roomName,
  userIdentity,
  userName,
  userRole,
  onDisconnect,
  isOpen,
  topic,
}) => {
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  useEffect(() => {
    if (!isOpen || !roomName || !userIdentity) return;

    if (!serverUrl) {
      setIsLoading(false);
      setError('Connection Error: NEXT_PUBLIC_LIVEKIT_URL is not configured.');
      return;
    }

    const getToken = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomName, user: userIdentity, name: userName }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get token: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get token';
        setError(`Connection Error: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    getToken();
  }, [roomName, userIdentity, isOpen]);

  if (!isOpen) return null;
  if (isLoading) return <div className="fixed inset-0 z-50 bg-black flex items-center justify-center"><div>Connecting...</div></div>;
  if (error) return <div className="fixed inset-0 z-50 bg-black flex items-center justify-center"><div>{error}</div></div>;
  if (!token) return <div className="fixed inset-0 z-50 bg-black flex items-center justify-center"><div>Preparing session...</div></div>;

  return (
    <div className="fixed inset-0 z-50 bg-canvas text-ink-900">
      <LKRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        onDisconnected={onDisconnect}
        style={{ height: '100vh' }}
        data-lk-theme="default"
      >
        <MainContent onDisconnect={onDisconnect} userRole={userRole} userName={userName} topic={topic} />
        <RoomAudioRenderer />
      </LKRoom>
    </div>
  );
};

// ── Session-shell chrome (presentational, module-scope so they don't remount) ──

function RailButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
        active ? 'bg-brand-600 text-white' : 'text-ink-400 hover:bg-muted hover:text-ink-900'
      }`}
    >
      {icon}
    </button>
  );
}

function CtrlButton({
  icon,
  label,
  onClick,
  disabled,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger' | 'active';
}) {
  const tones: Record<string, string> = {
    default: 'bg-muted text-ink-700 hover:bg-ink-100',
    active: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      {icon}
    </button>
  );
}

// Isolated so the per-second tick re-renders only the clock, never the
// heavy room tree (Excalidraw, video tiles).
function SessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <span className="tabular-nums">
      {mm}:{ss}
    </span>
  );
}

// Dedicated "Camera view": participants front-and-centre instead of floating.
function CameraStage() {
  const tracks = useTracks([Track.Source.Camera]);
  const cams = tracks.filter((t) => t.publication?.kind === 'video');
  return (
    <div className="flex h-full w-full flex-wrap items-center justify-center gap-4 p-6">
      {cams.length === 0 && <p className="text-sm text-ink-400">Waiting for video…</p>}
      {cams.map((t) => (
        <div
          key={t.publication.trackSid}
          className="relative aspect-video w-[46%] max-w-2xl overflow-hidden rounded-2xl bg-ink-900 shadow-lg ring-1 ring-ink-900/10"
        >
          <VideoTrack trackRef={t} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <span className="absolute bottom-2 left-2 rounded-md bg-ink-900/60 px-2 py-1 text-xs text-white">
            {t.participant.name || t.participant.identity}
          </span>
        </div>
      ))}
    </div>
  );
}

function MainContent({ onDisconnect, userRole, userName, topic }: { onDisconnect?: () => void; userRole: 'tutor' | 'student'; userName: string; topic?: string }) {
  const [activeView, setActiveView] = useState('whiteboard');
  // A file opened just for the local user (the file drive's "open privately"),
  // rendered as an overlay and never broadcast to the peer.
  const [privateFile, setPrivateFile] = useState<{ url: string; name: string; type: string } | null>(null);

  // Present / follow mode: when someone is presenting, their viewport (pan +
  // zoom) is mirrored to the other participant — a lightweight "slideshow".
  // presenterIdentity === null means nobody is presenting.
  const [presenterIdentity, setPresenterIdentity] = useState<string | null>(null);
  const isPresentingRef = React.useRef(false);
  const lastViewportSentRef = React.useRef(0);
  const [sharedFile, setSharedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const excalidrawRef = React.useRef<any | null>(null);
  const pendingSceneRef = React.useRef<{ elements: any[]; files?: any } | null>(null);
  const requestedSceneRef = React.useRef(false);
  const [isExcalidrawReady, setIsExcalidrawReady] = useState(false);
  const lastRemoteApplyVersionRef = React.useRef(0);
  // Per-element last-known version (id -> version), shared between the
  // broadcaster and the remote-apply path. We send only elements whose
  // version advanced past this map, which keeps each update tiny no matter
  // how large the board grows. Recording remote-applied versions here also
  // stops a receiver from echoing the sender's elements back — without it the
  // delta would collapse back into a full-scene rebroadcast.
  const sentElementVersionsRef = React.useRef<Map<string, number>>(new Map());

  // Screen sharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenTrackRef, setScreenTrackRef] = useState<TrackReference | null>(null);
  const [allScreenShares, setAllScreenShares] = useState<Array<TrackReference & { timestamp: number; participantIdentity: string }>>([]);
  const [dataStats, setDataStats] = useState<{
    sent: number;
    received: number;
    lastType: string;
    lastFrom: string;
    lastError: string;
  }>({ sent: 0, received: 0, lastType: '', lastFrom: '', lastError: '' });

  // Remote pointer/cursor positions on the whiteboard
  const [remotePointers, setRemotePointers] = useState<
    Record<string, { x: number; y: number; updatedAt: number }>
  >({});

  // Compatibility status
  const compatibilityStatus = BrowserCompatibility.getCompatibilityStatus();

  // Get room context for event listeners
  const room = useRoomContext();

  // Mic and camera toggle state
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  // Set display name on the local participant once connected
  useEffect(() => {
    if (room?.localParticipant && userName) {
      room.localParticipant.setName(userName);
    }
  }, [room, userName]);

  const handleToggleMic = async () => {
    if (!room) return;
    const next = !isMicEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setIsMicEnabled(next);
  };

  const handleToggleCamera = async () => {
    if (!room) return;
    const next = !isCameraEnabled;
    await room.localParticipant.setCameraEnabled(next);
    setIsCameraEnabled(next);
  };

  const applyExcalidrawScene = useCallback(
    (scene: { elements: any[]; files?: any } | null | undefined) => {
      if (!scene || !scene.elements) return;
      const api = excalidrawRef.current;
      if (api?.updateScene) {
        // Merge remote elements with local elements by ID instead of
        // replacing the whole scene, so concurrent local edits survive.
        const localElements = api.getSceneElements?.() || [];
        const merged = mergeWithRemoteElements(localElements, scene.elements);
        api.updateScene({ elements: merged });

        // Record the scene version AFTER applying remote update.
        // onChange will compare against this to suppress echoes — this
        // works regardless of whether onChange fires sync or async.
        lastRemoteApplyVersionRef.current = getSceneVersion(merged as any);

        // Remember the versions we just applied so our own onChange does not
        // re-broadcast these remote elements back to their sender.
        for (const el of scene.elements) {
          if (!el?.id) continue;
          const prev = sentElementVersionsRef.current.get(el.id) ?? -1;
          if ((el.version ?? 0) > prev) {
            sentElementVersionsRef.current.set(el.id, el.version ?? 0);
          }
        }

        // Files must be added via addFiles — updateScene ignores them.
        if (scene.files && Object.keys(scene.files).length > 0) {
          try {
            api.addFiles?.(Object.values(scene.files));
          } catch (e) {
            console.error('Error adding remote files:', e);
          }
        }
      } else {
        pendingSceneRef.current = scene;
      }
    },
    [],
  );

  const getCleanElements = useCallback((elements: any[] | null | undefined) => {
    if (!elements) return [];
    return elements.filter((el: any) => !el.isDeleted);
  }, []);

  // Store the latest data message handler in a ref so useDataChannel gets a
  // stable callback identity.  This prevents send/isSending from being
  // recreated on every render (which would cascade through sendDataSafe and
  // into ExcalidrawWhiteboard's onChange).
  const onDataMessageRef = React.useRef<(msg: any) => void>(() => {});

  const stableOnDataMessage = useCallback((msg: any) => {
    onDataMessageRef.current(msg);
  }, []);

  const { send: sendData, isSending }: { send: (data: Uint8Array, options?: DataPublishOptions) => Promise<void>; isSending: boolean } = useDataChannel(
    'eclero-collaboration',
    stableOnDataMessage,
  );

  const sendDataSafe = useCallback(
    async (payload: Uint8Array, options: DataPublishOptions = { reliable: true }) => {
      // Don't attempt to send if the room is disconnected
      if (room?.state !== 'connected') return;

      const MAX_RETRIES = 1;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          await sendData(payload, options);
          setDataStats((prev) => ({ ...prev, sent: prev.sent + 1, lastError: '' }));
          return;
        } catch (error) {
          const msg = error instanceof Error ? error.message : '';
          // Stop retrying if the connection is closed
          if (msg.includes('closed') || msg.includes('disconnected') || room?.state !== 'connected') return;
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 50));
            continue;
          }
          console.error('Data channel send error (after retry):', error);
          setDataStats((prev) => ({
            ...prev,
            lastError: msg || 'Unknown send error',
          }));
        }
      }
    },
    [sendData, room],
  );

  // Keep the data message handler ref up-to-date with the latest closures.
  // By the time any network message arrives (always async), this ref will
  // hold the correct handler with access to current sendDataSafe, etc.
  useEffect(() => {
    onDataMessageRef.current = (msg: any) => {
      try {
        const message = JSON.parse(new TextDecoder().decode(msg.payload));
        setDataStats((prev) => ({
          ...prev,
          received: prev.received + 1,
          lastType: message?.type || 'unknown',
          lastFrom: msg?.from?.identity || 'unknown',
        }));

        if (message.type === 'file_share') {
          setSharedFile(message.payload);
          setActiveView('file');
        } else if (message.type === 'file_close') {
          setSharedFile(null);
          setActiveView('whiteboard');
        } else if (message.type === 'excalidraw_update') {
          try {
            const { elements = [], files } = message.payload || {};
            applyExcalidrawScene({ elements, files });
          } catch (error) {
            console.error('Error applying excalidraw update:', error);
          }
        } else if (message.type === 'excalidraw_request') {
          try {
            const api = excalidrawRef.current;
            const elements = api?.getSceneElements?.() || [];

            const stateResponse = {
              type: 'excalidraw_state',
              payload: { elements },
            };
            sendDataSafe(new TextEncoder().encode(JSON.stringify(stateResponse)))
              .then(() => {
                const rawFiles = api?.getFiles?.() || {};
                if (Object.keys(rawFiles).length === 0) return;
                const safeFiles: Record<string, any> = {};
                Object.entries(rawFiles as Record<string, any>).forEach(([id, file]) => {
                  if (!file) return;
                  safeFiles[id] = {
                    id,
                    dataURL: (file as any).dataURL,
                    mimeType: (file as any).mimeType,
                    created: (file as any).created,
                    lastRetrieved: (file as any).lastRetrieved,
                  };
                });
                const fileResponse = {
                  type: 'excalidraw_files',
                  payload: { files: safeFiles },
                };
                return sendDataSafe(new TextEncoder().encode(JSON.stringify(fileResponse)));
              })
              .catch((err) => console.error('Error sending state/files response:', err));
          } catch (error) {
            console.error('Error responding to excalidraw state request:', error);
          }
        } else if (message.type === 'excalidraw_files') {
          try {
            const { files } = message.payload || {};
            if (files && Object.keys(files).length > 0) {
              excalidrawRef.current?.addFiles?.(Object.values(files));
            }
          } catch (error) {
            console.error('Error adding received files:', error);
          }
        } else if (message.type === 'excalidraw_state') {
          try {
            const { elements = [], files } = message.payload || {};
            applyExcalidrawScene({ elements, files });
          } catch (error) {
            console.error('Error applying excalidraw state:', error);
          }
        } else if (message.type === 'pointer_update') {
          const fromIdentity = msg?.from?.identity || 'unknown';
          const { x, y } = message.payload || {};
          if (typeof x === 'number' && typeof y === 'number' && fromIdentity) {
            setRemotePointers((prev) => ({
              ...prev,
              [fromIdentity]: { x, y, updatedAt: Date.now() },
            }));
          }
        } else if (message.type === 'present_start') {
          // The other participant started presenting — follow them, on the board.
          setPresenterIdentity(msg?.from?.identity || 'remote');
          setActiveView('whiteboard');
        } else if (message.type === 'present_stop') {
          setPresenterIdentity(null);
        } else if (message.type === 'viewport_follow') {
          // Only the presenter broadcasts these, so if we receive one we're a
          // follower: mirror their pan/zoom. Element state is untouched, so this
          // won't trigger an echo through the delta broadcaster.
          const { scrollX, scrollY, zoom } = message.payload || {};
          const api = excalidrawRef.current;
          if (api?.updateScene && typeof scrollX === 'number' && typeof scrollY === 'number') {
            api.updateScene({ appState: { scrollX, scrollY, zoom: { value: zoom || 1 } } });
          }
        } else if (message.type === 'session_end') {
          try {
            room?.disconnect();
          } catch (disconnectError) {
            console.error('Error disconnecting room after session_end:', disconnectError);
          }
        }
      } catch (e) {
        console.error('MainContent: Error parsing message:', e);
      }
    };
  }, [applyExcalidrawScene, sendDataSafe, room]);

  // Keep a ref of whether *we* are the presenter so the viewport broadcaster
  // (called from Excalidraw's onChange) reads the current value without
  // re-creating callbacks on every present toggle.
  useEffect(() => {
    isPresentingRef.current =
      !!presenterIdentity && presenterIdentity === room?.localParticipant?.identity;
  }, [presenterIdentity, room]);

  // Broadcast our viewport (throttled) while presenting. Passed to the
  // whiteboard, which calls it from onChange with the current pan/zoom.
  const broadcastViewport = useCallback(
    (vp: { scrollX: number; scrollY: number; zoom: number }) => {
      if (!isPresentingRef.current) return;
      const now = Date.now();
      if (now - lastViewportSentRef.current < 80) return;
      lastViewportSentRef.current = now;
      sendDataSafe(
        new TextEncoder().encode(JSON.stringify({ type: 'viewport_follow', payload: vp })),
        { reliable: false },
      );
    },
    [sendDataSafe],
  );

  const startPresenting = useCallback(() => {
    const id = room?.localParticipant?.identity;
    if (!id) return;
    setPresenterIdentity(id);
    isPresentingRef.current = true;
    sendDataSafe(new TextEncoder().encode(JSON.stringify({ type: 'present_start' })));
    // Push our current viewport so the follower snaps to it immediately.
    const ap = excalidrawRef.current?.getAppState?.();
    if (ap) {
      sendDataSafe(
        new TextEncoder().encode(
          JSON.stringify({
            type: 'viewport_follow',
            payload: { scrollX: ap.scrollX, scrollY: ap.scrollY, zoom: ap.zoom?.value ?? 1 },
          }),
        ),
      );
    }
  }, [room, sendDataSafe]);

  const stopPresenting = useCallback(() => {
    setPresenterIdentity(null);
    isPresentingRef.current = false;
    sendDataSafe(new TextEncoder().encode(JSON.stringify({ type: 'present_stop' })));
  }, [sendDataSafe]);

  // Share a (already-uploaded) drive file so both participants see it.
  const shareFile = useCallback(
    (file: { url: string; name: string; type: string }) => {
      sendDataSafe(new TextEncoder().encode(JSON.stringify({ type: 'file_share', payload: file })));
      setSharedFile(file);
      setActiveView('file');
    },
    [sendDataSafe],
  );

  const localIdentity = room?.localParticipant?.identity;
  const isPresenting = !!presenterIdentity && presenterIdentity === localIdentity;
  const isFollowing = !!presenterIdentity && !isPresenting;

  // Whiteboard persistence — survives refresh/reconnect and remains as study
  // notes afterwards. sessionId is encoded in the LiveKit room name.
  const sessionId = room?.name?.replace(/^session-/, '') || '';
  const lastSavedVersionRef = React.useRef(-1);

  // Restore the saved board once Excalidraw is ready, but only if the local
  // board is still empty (don't clobber a peer's live state).
  useEffect(() => {
    if (!isExcalidrawReady || !sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/whiteboard?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok || cancelled) return;
        const { scene } = await res.json();
        const api = excalidrawRef.current;
        const localEmpty = (api?.getSceneElements?.() || []).length === 0;
        if (scene?.elements?.length && localEmpty) {
          applyExcalidrawScene(scene);
          lastSavedVersionRef.current = getSceneVersion(scene.elements);
        }
      } catch {
        /* best-effort restore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isExcalidrawReady, sessionId, applyExcalidrawScene]);

  // Autosave the board (only when it actually changed) and once more on leave.
  useEffect(() => {
    if (!sessionId) return;
    const save = async () => {
      const api = excalidrawRef.current;
      if (!api?.getSceneElements) return;
      const elements = api.getSceneElements();
      const version = getSceneVersion(elements);
      if (version === lastSavedVersionRef.current) return;
      lastSavedVersionRef.current = version;
      try {
        const files = api.getFiles?.() || {};
        await fetch('/api/sessions/whiteboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, scene: { elements, files } }),
        });
      } catch {
        /* best-effort save */
      }
    };
    const interval = window.setInterval(save, 8000);
    return () => {
      window.clearInterval(interval);
      save();
    };
  }, [sessionId]);

  // Periodically prune stale remote pointers so we don't leak memory
  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemotePointers((prev) => {
        const now = Date.now();
        const entries = Object.entries(prev).filter(
          ([, value]) => now - value.updatedAt < 8000,
        );
        if (entries.length === Object.keys(prev).length) return prev;
        return Object.fromEntries(entries);
      });
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  // Screen sharing event listeners
  useEffect(() => {
    if (!room) return;

    const updateScreenShareState = () => {
      // Get current screen share tracks with enhanced metadata
      const currentTime = Date.now();
      const allParticipants = [
        ...Array.from(room.remoteParticipants.values()),
        room.localParticipant
      ];
      const screenShareTracks = allParticipants
        .flatMap((participant) => {
          const screenShareTrack = participant.getTrackPublication(Track.Source.ScreenShare);
          if (screenShareTrack?.track) {
            const trackRef = {
              publication: screenShareTrack,
              participant,
              source: Track.Source.ScreenShare,
              timestamp: currentTime,
              participantIdentity: participant.identity || 'unknown'
            } as TrackReference & { timestamp: number; participantIdentity: string };
            return [trackRef];
          }
          return [];
        });

      // Update all screen shares state
      setAllScreenShares(prev => {
        const existing = prev.filter(share => 
          screenShareTracks.some(current => 
            current.publication.trackSid === share.publication.trackSid
          )
        );
        
        const newShares = screenShareTracks.filter(current => 
          !existing.some(exist => 
            exist.publication.trackSid === current.publication.trackSid
          )
        );
        
        return [...existing, ...newShares].sort((a, b) => b.timestamp - a.timestamp);
      });

      // Update primary screen share state
      if (screenShareTracks.length > 0) {
        setIsScreenSharing(true);
        // Prioritize the most recent screen share
        const mostRecentShare = screenShareTracks.reduce((latest, current) => {
          const currentTimestamp = current.timestamp; // Use timestamp from the current object
          const latestTimestamp = latest.timestamp;   // Use timestamp from latest object
          return currentTimestamp > latestTimestamp ? current : latest;
        });
        setScreenTrackRef(mostRecentShare);
      } else {
        setIsScreenSharing(false);
        setScreenTrackRef(null);
        setAllScreenShares([]);
      }
    };

    // Listen to track events
    const handleLocalTrackPublished = (publication: any) => {
      if (publication.source === Track.Source.ScreenShare) {
        updateScreenShareState();
      }
    };

    const handleTrackUnpublished = (publication: any) => {
      if (publication.source === Track.Source.ScreenShare) {
        updateScreenShareState();
      }
    };

    const handleTrackSubscribed = (track: any, publication: any) => {
      if (publication.source === Track.Source.ScreenShare) {
        updateScreenShareState();
      }
    };

    const handleTrackUnsubscribed = (track: any, publication: any) => {
      if (publication.source === Track.Source.ScreenShare) {
        updateScreenShareState();
      }
    };

    // Add event listeners
    room.on('localTrackPublished', handleLocalTrackPublished);
    room.on('trackUnpublished', handleTrackUnpublished);
    room.on('trackSubscribed', handleTrackSubscribed);
    room.on('trackUnsubscribed', handleTrackUnsubscribed);

    // Initial state update
    updateScreenShareState();

    // Cleanup
    return () => {
      room.off('localTrackPublished', handleLocalTrackPublished);
      room.off('trackUnpublished', handleTrackUnpublished);
      room.off('trackSubscribed', handleTrackSubscribed);
      room.off('trackUnsubscribed', handleTrackUnsubscribed);
    };
  }, [room]);

  // Request the current whiteboard state once connected (helps late joiners)
  useEffect(() => {
    if (!room) return;

    const requestScene = async () => {
      if (requestedSceneRef.current) return;
      requestedSceneRef.current = true;
      
      // Wait a random delay to avoid request collisions
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      
      try {
        const message = { 
          type: 'excalidraw_request',
          requestId: Date.now() + Math.random().toString(36).substr(2, 9)
        };
        await sendDataSafe(new TextEncoder().encode(JSON.stringify(message)));
      } catch (error) {
        console.error('Error requesting excalidraw state:', error);
        requestedSceneRef.current = false; // Allow retry on error
      }
    };

    const handleConnectionState = (state: string) => {
      if (state === 'connected') {
        requestScene();
      }
    };

    room.on('connectionStateChanged', handleConnectionState);
    if (room.state === 'connected') {
      requestScene();
    }

    return () => {
      room.off('connectionStateChanged', handleConnectionState);
    };
  }, [room, sendDataSafe]);

  useEffect(() => {
    if (isExcalidrawReady && pendingSceneRef.current) {
      applyExcalidrawScene(pendingSceneRef.current);
      pendingSceneRef.current = null;
    }
  }, [isExcalidrawReady, applyExcalidrawScene]);

  // Set activeView to 'screen' with highest priority when screenTrackRef exists
  useEffect(() => {
    if (screenTrackRef) {
      setActiveView('screen');
    }
  }, [screenTrackRef]);

  const uploadAndShareFile = async (file: File) => {
    try {
      // Sanitize filename: replace non-alphanumeric, non-hyphen, non-underscore with hyphen
      const sanitizeFileName = (fileName: string): string => {
        // Remove path traversal attempts
        const basename = fileName.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
        
        // Remove non-ASCII characters and problematic characters
        const sanitized = basename.replace(/[^\w\u00C0-\u00FF\-_. ]/g, '-');
        
        // Trim length (max 255 chars for most filesystems)
        const trimmed = sanitized.substring(0, 255);
        
        // Remove Windows reserved names
        const windowsReserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 
                                'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 
                                'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        
        const nameWithoutExt = trimmed.split('.').slice(0, -1).join('.');
        if (windowsReserved.includes(nameWithoutExt.toUpperCase())) {
          return `file-${Date.now()}-${trimmed}`;
        }
        
        return trimmed;
      };
      const safeName = sanitizeFileName(file.name);
      const filePath = `session-files/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('eclero-storage')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('eclero-storage')
        .getPublicUrl(filePath);

      // Record in the session file drive so it also appears in the shelf.
      fetch('/api/sessions/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          name: file.name,
          type: file.type,
          size: file.size,
          url: publicUrl,
          storagePath: filePath,
          shared: true,
        }),
      }).catch(() => {});

      // Non-blocking validation — warn the sender if the URL isn't accessible
      // (e.g. Supabase bucket not set to public) but still share the file.
      try {
        const checkResponse = await fetch(publicUrl, { method: 'HEAD', mode: 'cors' });
        if (!checkResponse.ok) {
          console.warn(`File URL returned ${checkResponse.status}. The storage bucket may not be public.`);
          toast.error('File uploaded but may not be viewable. Please check that your storage bucket is set to public.');
        }
      } catch (corsErr) {
        console.warn('Could not validate file URL (CORS or network issue):', corsErr);
      }

      const message = {
        type: 'file_share',
        payload: { url: publicUrl, name: file.name, type: file.type },
      };
      await sendDataSafe(new TextEncoder().encode(JSON.stringify(message)));
      
      setSharedFile(message.payload);
      setActiveView('file');

    } catch (error: any) {
      console.error('Error uploading file:', error.message || error);
      toast.error(`Failed to upload file: ${error.message || 'Unknown error'}. Please check your Supabase storage configuration and try again.`);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAndShareFile(file);
  };

  const fileToDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  // Embed an image directly on the whiteboard so it can be annotated. The new
  // element (version 1) + its file ride the existing delta/file sync to the
  // peer. Returns false if Excalidraw isn't ready → caller shares instead.
  const embedImageOnCanvas = async (
    dataURL: string,
    mimeType: string,
    yOffset = 0,
  ): Promise<boolean> => {
    const api = excalidrawRef.current;
    if (!api?.updateScene || !api?.addFiles) return false;
    try {
      const img = new Image();
      img.src = dataURL;
      await img.decode().catch(() => {});
      let w = img.naturalWidth || 400;
      let h = img.naturalHeight || 300;
      const max = 640;
      if (w > max || h > max) {
        const r = Math.min(max / w, max / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      const fileId = crypto.randomUUID?.() || `f${Date.now()}${Math.random()}`;
      api.addFiles([{ id: fileId, dataURL, mimeType, created: Date.now() }]);
      const ap = api.getAppState?.() || {};
      const x = -(ap.scrollX || 0) + 120;
      const y = -(ap.scrollY || 0) + 120 + yOffset;
      const el = {
        id: crypto.randomUUID?.() || `img${Date.now()}${Math.random()}`,
        type: 'image',
        x, y, width: w, height: h, angle: 0,
        strokeColor: 'transparent', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 1, opacity: 100,
        groupIds: [], frameId: null, roundness: null,
        seed: Math.floor(Math.random() * 1e9), version: 1, versionNonce: Math.floor(Math.random() * 1e9),
        isDeleted: false, boundElements: null, updated: Date.now(), link: null, locked: false,
        status: 'saved', fileId, scale: [1, 1],
      };
      api.updateScene({ elements: [...(api.getSceneElements?.() || []), el] });
      return true;
    } catch (e) {
      console.error('embedImageOnCanvas failed:', e);
      return false;
    }
  };

  // Rasterize a PDF's pages and stack them on the board for annotation.
  const embedPdfOnCanvas = async (file: File): Promise<boolean> => {
    try {
      const pdfjs: any = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const data = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data }).promise;
      const pages = Math.min(pdf.numPages, 10);
      let offsetY = 0;
      let any = false;
      for (let p = 1; p <= pages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const ok = await embedImageOnCanvas(canvas.toDataURL('image/png'), 'image/png', offsetY);
        any = any || ok;
        offsetY += 640 * (viewport.height / viewport.width) + 24;
      }
      return any;
    } catch (e) {
      console.error('embedPdfOnCanvas failed:', e);
      return false;
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    // Images & PDFs go ON the canvas to annotate; everything else is shared.
    if (isImage) {
      const dataURL = await fileToDataURL(file);
      if (await embedImageOnCanvas(dataURL, file.type)) return;
    } else if (isPdf) {
      if (await embedPdfOnCanvas(file)) return;
    }
    await uploadAndShareFile(file);
  };

  // Screen sharing handlers
  const handleStartScreenShare = async () => {
    const success = await startScreenShare(room);
    if (success) {
      // Update local state if needed - the event listeners will handle this
    }
  };

  const handleStopScreenShare = async () => {
    const success = await stopScreenShare(room);
    if (success) {
      // Update local state if needed - the event listeners will handle this
    }
  };

  const handleEndOrLeaveSession = async () => {
    try {
      // If tutor ends the session, notify all participants to disconnect.
      if (userRole === 'tutor') {
        const message = {
          type: 'session_end',
        };
        await sendDataSafe(new TextEncoder().encode(JSON.stringify(message)));
      }
    } catch (e) {
      console.error('Error broadcasting session_end message:', e);
    } finally {
      try {
        room?.disconnect();
      } catch (disconnectError) {
        console.error('Error disconnecting room on end/leave:', disconnectError);
      }
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-canvas text-ink-900">
      {/* Top bar */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-ink-900/10 bg-surface px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-sm font-medium text-white">
            L
          </div>
          <span className="text-sm font-medium text-ink-900">LearnPeers</span>
          {topic && (
            <>
              <span className="text-ink-300">·</span>
              <span className="truncate text-sm text-ink-500">{topic}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> rec
          </span>
          <span className="flex items-center gap-1.5 text-sm text-ink-600">
            <Clock className="h-4 w-4" />
            <SessionTimer />
          </span>
          {onDisconnect && (
            <button
              onClick={handleEndOrLeaveSession}
              aria-label={userRole === 'tutor' ? 'End session for everyone' : 'Leave session'}
              title={userRole === 'tutor' ? 'End session for everyone' : 'Leave session'}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              <PhoneOff className="h-4 w-4" />
              {userRole === 'tutor' ? 'End session' : 'Leave'}
            </button>
          )}
        </div>
      </header>

      {/* Body: view rail + stage */}
      <div className="relative flex min-h-0 flex-1">
        <nav className="z-20 flex w-16 shrink-0 flex-col items-center gap-1 border-r border-ink-900/10 bg-surface py-3">
          <RailButton
            icon={<Pencil className="h-5 w-5" />}
            label="Whiteboard"
            active={activeView === 'whiteboard'}
            onClick={() => setActiveView('whiteboard')}
          />
          <RailButton
            icon={<Video className="h-5 w-5" />}
            label="Camera view"
            active={activeView === 'camera'}
            onClick={() => setActiveView('camera')}
          />
          <RailButton
            icon={<Presentation className="h-5 w-5" />}
            label={
              isPresenting ? 'Stop presenting' : isFollowing ? 'Following presenter' : 'Present'
            }
            active={!!presenterIdentity}
            onClick={() => {
              if (isPresenting) {
                stopPresenting();
              } else if (!presenterIdentity) {
                setActiveView('whiteboard');
                startPresenting();
              }
              // If the other party is presenting, the button is just an
              // indicator — you're already following them.
            }}
          />
          <RailButton
            icon={<Folder className="h-5 w-5" />}
            label="Files"
            active={activeView === 'files'}
            onClick={() => setActiveView('files')}
          />
          {sharedFile && (
            <RailButton
              icon={<FileText className="h-5 w-5" />}
              label="Shared file"
              active={activeView === 'file'}
              onClick={() => setActiveView('file')}
            />
          )}
          {screenTrackRef && (
            <RailButton
              icon={<Monitor className="h-5 w-5" />}
              label="Screen share"
              active={activeView === 'screen'}
              onClick={() => setActiveView('screen')}
            />
          )}
        </nav>

        <main className="relative min-w-0 flex-1 bg-canvas">
          {/* Whiteboard stays mounted across view switches so the Excalidraw
              scene and in-flight edits survive — we just hide it. */}
          <div
            className={`absolute inset-0 ${activeView === 'whiteboard' ? '' : 'invisible pointer-events-none'}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <ExcalidrawWhiteboard
              sendData={sendDataSafe}
              excalidrawRef={excalidrawRef}
              onReady={() => setIsExcalidrawReady(true)}
              lastRemoteApplyVersionRef={lastRemoteApplyVersionRef}
              sentElementVersionsRef={sentElementVersionsRef}
              onViewport={broadcastViewport}
            />
            <PointerOverlay excalidrawRef={excalidrawRef} pointers={remotePointers} />

            {/* Present-mode banner */}
            {presenterIdentity && (
              <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
                <span
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm ${
                    isPresenting ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'
                  }`}
                >
                  <Presentation className="h-3.5 w-3.5" />
                  {isPresenting ? "You're presenting" : 'Following the presenter'}
                </span>
              </div>
            )}
          </div>

          {activeView === 'camera' && (
            <div className="absolute inset-0">
              <CameraStage />
            </div>
          )}
          {activeView === 'files' && (
            <div className="absolute inset-0">
              <FileShelf sessionId={sessionId} onOpenPrivate={setPrivateFile} onShare={shareFile} />
            </div>
          )}
          {activeView === 'file' && sharedFile && (
            <div className="absolute inset-0">
              <FileViewer
                file={sharedFile}
                onClose={() => {
                  setActiveView('whiteboard');
                  setSharedFile(null);
                  sendDataSafe(new TextEncoder().encode(JSON.stringify({ type: 'file_close' })));
                }}
              />
            </div>
          )}

          {/* Private file viewer — only the local user sees this (no broadcast) */}
          {privateFile && (
            <div className="absolute inset-0 z-30">
              <FileViewer file={privateFile} onClose={() => setPrivateFile(null)} />
            </div>
          )}
          {activeView === 'screen' && screenTrackRef && (
            <div className="absolute inset-0">
              <ScreenView trackRef={screenTrackRef} />
            </div>
          )}

          {/* Floating cameras — always visible except in dedicated camera view */}
          {activeView !== 'camera' && (
            <FloatingVideos
              allScreenShares={allScreenShares}
              screenTrackRef={screenTrackRef}
              onSelectScreenShare={setScreenTrackRef}
            />
          )}
        </main>
      </div>

      {/* Control bar */}
      <footer className="z-20 flex h-16 shrink-0 items-center justify-center gap-2.5 border-t border-ink-900/10 bg-surface">
        <CtrlButton
          icon={isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          label={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
          tone={isMicEnabled ? 'default' : 'danger'}
          onClick={handleToggleMic}
        />
        <CtrlButton
          icon={isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          label={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          tone={isCameraEnabled ? 'default' : 'danger'}
          onClick={handleToggleCamera}
        />
        <CtrlButton
          icon={<ScreenShare className="h-5 w-5" />}
          label={
            compatibilityStatus.isSupported
              ? isScreenSharing
                ? 'Stop sharing'
                : 'Share screen'
              : compatibilityStatus.reason || 'Screen sharing is not supported.'
          }
          tone={isScreenSharing ? 'active' : 'default'}
          disabled={isSending || !compatibilityStatus.isSupported}
          onClick={isScreenSharing ? handleStopScreenShare : handleStartScreenShare}
        />
        <CtrlButton
          icon={<Upload className="h-5 w-5" />}
          label="Share a file"
          disabled={isSending}
          onClick={() => fileInputRef.current?.click()}
        />
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </footer>
    </div>
  );
}

const Excalidraw = dynamic(
  async () => {
    try {
      const mod = await import('@excalidraw/excalidraw');
      return mod.Excalidraw;
    } catch (e) {
      console.error('Excalidraw dynamic import failed:', e);
      // Return a fallback component
      return function ExcalidrawLoadFailed() {
        return (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Whiteboard failed to load</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
            >
              Retry
            </button>
          </div>
        </div>
        );
      };
    }
  },
  {
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-white">Loading whiteboard...</div>
  }
);

// Error boundary for Excalidraw
class ExcalidrawErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Excalidraw error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Failed to load whiteboard</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ExcalidrawWhiteboard({
  sendData,
  excalidrawRef,
  onReady,
  lastRemoteApplyVersionRef,
  sentElementVersionsRef,
  onViewport,
}: {
  sendData: (data: Uint8Array) => Promise<void>;
  excalidrawRef: React.MutableRefObject<any | null>;
  onReady?: () => void;
  lastRemoteApplyVersionRef: React.MutableRefObject<number>;
  sentElementVersionsRef: React.MutableRefObject<Map<string, number>>;
  onViewport?: (vp: { scrollX: number; scrollY: number; zoom: number }) => void;
}) {
  const lastSentVersion = React.useRef(0);
  const debounceRef = React.useRef<number | null>(null);
  const lastPointerSentAtRef = React.useRef(0);

  // CSS is already loaded via /public/excalidraw.css in layout.tsx

  const sanitizeFilesForSending = React.useCallback((files: any) => {
    const safeFiles: Record<string, any> = {};
    if (!files) return safeFiles;
    Object.entries(files as Record<string, any>).forEach(([id, file]) => {
      if (!file) return;
      safeFiles[id] = {
        id,
        dataURL: file.dataURL,
        mimeType: file.mimeType,
        created: file.created,
        lastRetrieved: file.lastRetrieved,
      };
    });
    return safeFiles;
  }, []);

  // Track which file IDs have already been sent so we don't resend
  // multi-MB base64 data on every keystroke.
  const sentFileIdsRef = React.useRef(new Set<string>());

  const onChange = React.useCallback(
    (elements: any[], appState: any, _filesFromCallback: any) => {
      // Presenter viewport mirroring — cheap, the parent throttles + gates it.
      if (appState && onViewport) {
        onViewport({
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          zoom: appState.zoom?.value ?? 1,
        });
      }

      // Debounce + only send if changed
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        try {
          const allElements = elements || [];
          const version = getSceneVersion(allElements as any);

          // Skip if version hasn't advanced past our last send
          if (version <= lastSentVersion.current) return;

          // Skip if this version matches what we just applied from remote.
          // This suppresses echoes regardless of whether onChange fires
          // synchronously or asynchronously after updateScene.
          if (version <= lastRemoteApplyVersionRef.current) return;

          lastSentVersion.current = version;

          // Send only the elements whose version advanced since we last sent
          // them. Deletions ride along automatically: Excalidraw keeps deleted
          // elements in the scene with isDeleted=true and a bumped version, so
          // they land here like any other change. The receiver merges deltas by
          // version via mergeWithRemoteElements, so a small delta and a full
          // scene produce the same result — but the delta stays tiny as the
          // board grows, which is the whole point.
          const sentVersions = sentElementVersionsRef.current;
          const changed: any[] = [];
          for (const el of allElements) {
            if (!el?.id) continue;
            const prev = sentVersions.get(el.id) ?? -1;
            if ((el.version ?? 0) > prev) changed.push(el);
          }
          if (changed.length === 0) return;

          // 1) Send changed elements WITHOUT files — this message stays small
          //    and always succeeds even when the scene contains large images.
          const elementMessage = {
            type: 'excalidraw_update',
            payload: { elements: changed },
          };
          await sendData(new TextEncoder().encode(JSON.stringify(elementMessage)));
          for (const el of changed) sentVersions.set(el.id, el.version ?? 0);

          // 2) Send NEW files in a separate message so a large image
          //    doesn't block element delivery.  Already-sent files are
          //    skipped to avoid resending MB of data on every stroke.
          const api = excalidrawRef.current;
          const rawFiles = api?.getFiles?.() || {};
          const newFileIds = Object.keys(rawFiles).filter(
            (id) => !sentFileIdsRef.current.has(id),
          );

          if (newFileIds.length > 0) {
            const newFiles = sanitizeFilesForSending(
              Object.fromEntries(newFileIds.map((id) => [id, rawFiles[id]])),
            );
            const fileMessage = {
              type: 'excalidraw_files',
              payload: { files: newFiles },
            };
            try {
              await sendData(new TextEncoder().encode(JSON.stringify(fileMessage)));
              for (const id of newFileIds) sentFileIdsRef.current.add(id);
            } catch (fileErr) {
              // Don't mark as sent so we retry on the next change
              console.error('Error sending file data (will retry):', fileErr);
            }
          }
        } catch (e) {
          console.error('Error broadcasting excalidraw update:', e);
        }
      }, 120);
    },
    [sendData, sanitizeFilesForSending, lastRemoteApplyVersionRef, sentElementVersionsRef, onViewport],
  );

  const handlePointerUpdate = React.useCallback(
    (payload: any) => {
      try {
        const pointer = payload?.pointer;
        if (!pointer) return;
        const now = Date.now();
        // Throttle pointer updates to avoid spamming the data channel
        if (now - lastPointerSentAtRef.current < 50) return;
        lastPointerSentAtRef.current = now;

        const message = {
          type: 'pointer_update',
          payload: {
            x: pointer.x,
            y: pointer.y,
          },
        };
        sendData(new TextEncoder().encode(JSON.stringify(message)));
      } catch (e) {
        console.error('Error broadcasting pointer update:', e);
      }
    },
    [sendData],
  );

  return (
    <ExcalidrawErrorBoundary>
      <div className="w-full h-full bg-white">
        <Excalidraw
          excalidrawAPI={(api: any) => {
            excalidrawRef.current = api;
            onReady?.();
          }}
          onChange={(elements: readonly any[], appState: any, files: any) =>
            onChange(elements as any[], appState, files)
          }
          onPointerUpdate={handlePointerUpdate}
          isCollaborating={true}
          theme="light"
          UIOptions={{ dockedSidebarBreakpoint: 0 }}
        />
      </div>
    </ExcalidrawErrorBoundary>
  );
}

export default LiveKitRoom; 
