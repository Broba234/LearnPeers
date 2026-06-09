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
// Inlined from @excalidraw/excalidraw to avoid a static import that pulls in
// browser-fs-access at module-evaluation time and crashes with file.split errors.
const getSceneVersion = (elements: any[]): number =>
  elements.reduce((acc: number, el: any) => acc + (el.version ?? 0), 0);
import '@livekit/components-styles';
import dynamic from 'next/dynamic';
// Using 'any' for imperative API type to avoid version export mismatches
// Excalidraw CSS will be added after install
import { supabase } from '@/lib/supabaseClient';
import { startScreenShare, stopScreenShare, isScreenSharing, showSuccess, BrowserCompatibility } from '@/lib/screenShare';

interface LiveKitRoomProps {
  roomName: string;
  userIdentity: string;
  userName: string;
  userRole: 'tutor' | 'student';
  onDisconnect?: () => void;
  isOpen: boolean;
}

const LiveKitRoom: React.FC<LiveKitRoomProps> = ({
  roomName,
  userIdentity,
  userName,
  userRole,
  onDisconnect,
  isOpen,
}) => {
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://eclero-livekit.livekit.cloud';

  useEffect(() => {
    if (!isOpen || !roomName || !userIdentity) return;

    const getToken = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomName, user: userIdentity }),
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
    <div className="fixed inset-0 z-50 bg-gray-800 text-white">
      <LKRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        onDisconnected={onDisconnect}
        style={{ height: '100vh' }}
        data-lk-theme="default"
      >
        <MainContent onDisconnect={onDisconnect} userRole={userRole} userName={userName} />
        <RoomAudioRenderer />
      </LKRoom>
    </div>
  );
};

/**
 * Merge remote elements with local elements by ID.
 * For elements that exist in both, the one with the higher version wins.
 * This prevents full-scene replacement from destroying concurrent local edits.
 */
function mergeWithRemoteElements(localElements: any[], remoteElements: any[]): any[] {
  const elementsMap = new Map<string, any>();

  for (const el of localElements) {
    if (el?.id) elementsMap.set(el.id, el);
  }

  for (const el of remoteElements) {
    if (!el?.id) continue;
    const existing = elementsMap.get(el.id);
    if (!existing || (el.version ?? 0) >= (existing.version ?? 0)) {
      elementsMap.set(el.id, el);
    }
  }

  return Array.from(elementsMap.values());
}

function MainContent({ onDisconnect, userRole, userName }: { onDisconnect?: () => void; userRole: 'tutor' | 'student'; userName: string }) {
  const [activeView, setActiveView] = useState('whiteboard');
  const [sharedFile, setSharedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const excalidrawRef = React.useRef<any | null>(null);
  const pendingSceneRef = React.useRef<{ elements: any[]; files?: any } | null>(null);
  const requestedSceneRef = React.useRef(false);
  const [isExcalidrawReady, setIsExcalidrawReady] = useState(false);
  const lastRemoteApplyVersionRef = React.useRef(0);

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
        } else if (message.type === 'session_end') {
          console.log('Session end signal received, disconnecting from room.');
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
        
        // Log screen share activity
        console.log(`Screen share detected from ${mostRecentShare.participantIdentity}. Total active shares: ${screenShareTracks.length}`);
        if (screenShareTracks.length > 1) {
          const participantNames = screenShareTracks.map(t => t.participantIdentity).join(', ');
          console.log(`Multiple screen shares active: ${participantNames}. Displaying most recent.`);
        }
      } else {
        setIsScreenSharing(false);
        setScreenTrackRef(null);
        setAllScreenShares([]);
        console.log('No active screen shares detected');
      }
    };

    // Listen to track events
    const handleLocalTrackPublished = (publication: any) => {
      if (publication.source === Track.Source.ScreenShare) {
        console.log('Local screen share published');
        updateScreenShareState();
      }
    };

    const handleTrackUnpublished = (publication: any) => {
      if (publication.source === Track.Source.ScreenShare) {
        console.log('Screen share unpublished');
        updateScreenShareState();
      }
    };

    const handleTrackSubscribed = (track: any, publication: any) => {
      if (publication.source === Track.Source.ScreenShare) {
        console.log('Screen share subscribed');
        updateScreenShareState();
      }
    };

    const handleTrackUnsubscribed = (track: any, publication: any) => {
      if (publication.source === Track.Source.ScreenShare) {
        console.log('Screen share unsubscribed');
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

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadAndShareFile(file);
  };

  // Screen sharing handlers
  const handleStartScreenShare = async () => {
    const success = await startScreenShare(room);
    if (success) {
      // Update local state if needed - the event listeners will handle this
      console.log('Screen share initiated successfully');
    }
  };

  const handleStopScreenShare = async () => {
    const success = await stopScreenShare(room);
    if (success) {
      // Update local state if needed - the event listeners will handle this
      console.log('Screen share stopped successfully');
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
    <div className="relative h-full w-full">
      {/* Whiteboard/file/screen content within a smaller bezel */}
      <div
        className="absolute rounded-3xl overflow-hidden bg-white shadow-2xl z-0"
        style={{ top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }}
      >
        {activeView === 'whiteboard' && (
          <div
            className="w-full h-full relative"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <ExcalidrawWhiteboard
              sendData={sendDataSafe}
              excalidrawRef={excalidrawRef}
              onReady={() => setIsExcalidrawReady(true)}
              lastRemoteApplyVersionRef={lastRemoteApplyVersionRef}
            />
            <PointerOverlay
              excalidrawRef={excalidrawRef}
              pointers={remotePointers}
            />
          </div>
        )}
        {activeView === 'file' && sharedFile && (
          <FileViewer
            file={sharedFile}
            onClose={() => {
              setActiveView('whiteboard');
              setSharedFile(null);
              sendDataSafe(new TextEncoder().encode(JSON.stringify({ type: 'file_close' })));
            }}
          />
        )}
        {activeView === 'screen' && screenTrackRef && <ScreenView trackRef={screenTrackRef} />}
      </div>

      {/* Data channel debug */}
      {/* <div className="absolute top-4 left-4 rounded-xl bg-black/40 text-white text-xs px-3 py-2 backdrop-blur shadow-lg">
        <div>Data sent: {dataStats.sent}</div>
        <div>Data received: {dataStats.received}</div>
        {dataStats.lastType && <div>Last type: {dataStats.lastType}</div>}
        {dataStats.lastFrom && <div>Last from: {dataStats.lastFrom}</div>}
        {dataStats.lastError && <div className="text-red-300">Send error: {dataStats.lastError}</div>}
      </div> */}

      {/* Top-right view toggles */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {sharedFile && (
          <button
            onClick={() => setActiveView('file')}
            aria-label="File"
            title="File"
            className={`p-2.5 rounded-2xl backdrop-blur shadow-lg border transition-colors ${activeView==='file' ? 'bg-blue-600/90 text-white border-blue-300' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </button>
        )}
        {screenTrackRef && (
          <button
            onClick={() => setActiveView('screen')}
            aria-label="Screen"
            title="Screen"
            className={`p-2.5 rounded-2xl backdrop-blur shadow-lg border transition-colors ${activeView==='screen' ? 'bg-blue-600/90 text-white border-blue-300' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <path d="M8 21h8m-4-4v4" />
            </svg>
          </button>
        )}
      </div>

      {/* Right-side floating cams */}
      <FloatingVideos allScreenShares={allScreenShares} screenTrackRef={screenTrackRef} onSelectScreenShare={setScreenTrackRef} />

      {/* Bottom center toolbar */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-3">
        {/* Mic toggle */}
        <button
          onClick={handleToggleMic}
          aria-label={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
          title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
          className={`p-2.5 rounded-2xl border backdrop-blur shadow-lg ${isMicEnabled ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'bg-red-600/90 text-white border-red-300 hover:bg-red-600'}`}
        >
          {isMicEnabled ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
        {/* Camera toggle */}
        <button
          onClick={handleToggleCamera}
          aria-label={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          className={`p-2.5 rounded-2xl border backdrop-blur shadow-lg ${isCameraEnabled ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'bg-red-600/90 text-white border-red-300 hover:bg-red-600'}`}
        >
          {isCameraEnabled ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M7 7H4a2 2 0 0 0-2 2v9.17M16 7h2a2 2 0 0 1 2 2v7.17" />
              <line x1="16" y1="12" x2="23" y2="7" />
              <line x1="23" y1="17" x2="16" y2="12" />
            </svg>
          )}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          aria-label="Share file"
          title="Share file"
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur shadow-lg disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 16v6m-4-2h8" />
            <path d="M21.44 11.05A5 5 0 0 0 17 7h-1.26A8 8 0 1 0 12 21" />
          </svg>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <button 
          onClick={isScreenSharing ? handleStopScreenShare : handleStartScreenShare} 
          disabled={isSending || !compatibilityStatus.isSupported}
          aria-label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          title={compatibilityStatus.isSupported ? (isScreenSharing ? 'Stop sharing' : 'Share screen') : (compatibilityStatus.reason || 'Screen sharing is not supported.')}
          className={`p-2.5 rounded-2xl border backdrop-blur shadow-lg disabled:opacity-50 ${isScreenSharing ? 'bg-red-600/90 text-white border-red-300 hover:bg-red-600' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
        >
          {isScreenSharing ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <path d="M8 21h8m-4-4v4" />
            </svg>
          )}
        </button>
        {onDisconnect && (
          <button
            onClick={handleEndOrLeaveSession}
            aria-label={userRole === 'tutor' ? 'End session for everyone' : 'Leave session'}
            title={userRole === 'tutor' ? 'End session for everyone' : 'Leave session'}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
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
      return () => (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Whiteboard failed to load</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      );
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
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
}: {
  sendData: (data: Uint8Array) => Promise<void>;
  excalidrawRef: React.MutableRefObject<any | null>;
  onReady?: () => void;
  lastRemoteApplyVersionRef: React.MutableRefObject<number>;
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
    (elements: any[], _appState: any, _filesFromCallback: any) => {
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

          // 1) Send elements WITHOUT files — this message stays small and
          //    always succeeds even when the scene contains large images.
          const elementMessage = {
            type: 'excalidraw_update',
            payload: { elements: allElements },
          };
          await sendData(new TextEncoder().encode(JSON.stringify(elementMessage)));

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
    [sendData, sanitizeFilesForSending, lastRemoteApplyVersionRef],
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

// Simple deterministic color helper for remote pointer indicators
function getColorForIdentity(identity: string): string {
  const colors = ['#f97316', '#22c55e', '#3b82f6', '#e11d48', '#a855f7', '#14b8a6'];
  let hash = 0;
  for (let i = 0; i < identity.length; i += 1) {
    hash = (hash * 31 + identity.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

interface PointerOverlayProps {
  excalidrawRef: React.MutableRefObject<any | null>;
  pointers: Record<string, { x: number; y: number; updatedAt: number }>;
}

function PointerOverlay({ excalidrawRef, pointers }: PointerOverlayProps) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 50);
    return () => window.clearInterval(id);
  }, []);

  const api = excalidrawRef.current;
  const appState = api?.getAppState?.();
  if (!appState) return null;

  const scrollX = appState.scrollX ?? 0;
  const scrollY = appState.scrollY ?? 0;
  const zoomValue =
    typeof appState.zoom === 'number'
      ? appState.zoom
      : appState.zoom?.value ?? 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {Object.entries(pointers).map(([identity, pointer]) => {
        // Hide stale pointers
        if (now - pointer.updatedAt > 5000) return null;

        const screenX = (pointer.x + scrollX) * zoomValue;
        const screenY = (pointer.y + scrollY) * zoomValue;
        const color = getColorForIdentity(identity);

        return (
          <div
            key={identity}
            className="absolute"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full border-2 bg-white shadow"
              style={{ borderColor: color }}
            />
            <div className="mt-1 px-1.5 py-0.5 rounded text-[10px] leading-none bg-black/70 text-white whitespace-nowrap">
              {identity}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface FloatingVideosProps {
  allScreenShares: Array<TrackReference & { timestamp: number; participantIdentity: string }>;
  screenTrackRef: TrackReference | null;
  onSelectScreenShare: (trackRef: TrackReference) => void;
}

function FloatingVideos({ allScreenShares, screenTrackRef, onSelectScreenShare }: FloatingVideosProps) {
  const tracks = useTracks();
  const videoTracks = tracks.filter((track) => track.publication.kind === 'video');

  const [positions, setPositions] = React.useState<Record<string, { x: number; y: number }>>({});
  const [hidden, setHidden] = React.useState<Record<string, boolean>>({});
  const dragRef = React.useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const pos = positions[id] || { x: window.innerWidth - 220, y: window.innerHeight / 2 - 80 };
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const nx = drag.origX + (e.clientX - drag.startX);
    const ny = drag.origY + (e.clientY - drag.startY);
    setPositions((prev) => ({ ...prev, [drag.id]: { x: nx, y: ny } }));
  };

  const onMouseUp = () => {
    dragRef.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  React.useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const isParticipantSharingScreen = (participantIdentity: string) =>
    allScreenShares.some(share => share.participantIdentity === participantIdentity);

  const getParticipantScreenShare = (participantIdentity: string) =>
    allScreenShares.find(share => share.participantIdentity === participantIdentity);

  const absoluteTiles = videoTracks.filter((t) => positions[t.publication.trackSid]);
  const dockedTiles = videoTracks.filter((t) => !positions[t.publication.trackSid]);

  return (
    <>
      {/* Absolute (undocked) tiles */}
      {absoluteTiles.map((trackRef: TrackReference) => {
        const id = trackRef.publication.trackSid;
        if (hidden[id]) return null;
        const pos = positions[id]!;
        const participantIdentity = trackRef.participant.identity || 'unknown';
        const sharing = isParticipantSharingScreen(participantIdentity);
        const participantShare = getParticipantScreenShare(participantIdentity);
        const isActive = screenTrackRef?.publication.trackSid === participantShare?.publication.trackSid;
        return (
          <div key={id} className="pointer-events-auto fixed z-50" style={{ left: pos.x, top: pos.y, width: 180, height: 132 }}>
            <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/20 bg-white/5 backdrop-blur shadow-2xl">
              <VideoTrack trackRef={trackRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* Drag handle */}
              <div onMouseDown={(e) => onMouseDown(e, id)} className="absolute top-0 left-0 right-0 h-6 bg-black/20 cursor-move" />
              {/* Hide button */}
              <button onClick={() => setHidden((h) => ({ ...h, [id]: true }))} className="absolute top-1 right-1 p-1 bg-black/40 rounded-md text-white" title="Hide">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
              {/* Label */}
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-[10px] text-white">{trackRef.participant.name || participantIdentity}</div>
              {/* Screen share indicator + switch */}
              {sharing && (
                <button onClick={() => participantShare && onSelectScreenShare(participantShare)} className={`absolute top-1 left-1 px-2 py-1 rounded-md text-[10px] font-semibold shadow ${isActive ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`} title={isActive ? 'Viewing screen' : `View ${participantIdentity}'s screen`}>
                  {isActive ? 'LIVE' : 'SCREEN'}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Docked column on right for remaining tiles */}
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
        {dockedTiles.map((trackRef: TrackReference) => {
          const id = trackRef.publication.trackSid;
          if (hidden[id]) return null;
          const participantIdentity = trackRef.participant.identity || 'unknown';
          const sharing = isParticipantSharingScreen(participantIdentity);
          const participantShare = getParticipantScreenShare(participantIdentity);
          const isActive = screenTrackRef?.publication.trackSid === participantShare?.publication.trackSid;
          return (
            <div key={id} className="relative pointer-events-auto w-[180px] h-[132px] rounded-2xl overflow-hidden border border-white/20 bg-white/5 backdrop-blur shadow-2xl">
              <VideoTrack trackRef={trackRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* Drag handle to undock */}
              <div onMouseDown={(e) => onMouseDown(e, id)} className="absolute top-0 left-0 right-0 h-6 bg-black/20 cursor-move" title="Drag to undock" />
              {/* Hide button */}
              <button onClick={() => setHidden((h) => ({ ...h, [id]: true }))} className="absolute top-1 right-1 p-1 bg-black/40 rounded-md text-white" title="Hide">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
              {/* Label */}
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-[10px] text-white">{trackRef.participant.name || participantIdentity}</div>
              {/* Screen share indicator + switch */}
              {sharing && (
                <button onClick={() => participantShare && onSelectScreenShare(participantShare)} className={`absolute top-1 left-1 px-2 py-1 rounded-md text-[10px] font-semibold shadow ${isActive ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`} title={isActive ? 'Viewing screen' : `View ${participantIdentity}'s screen`}>
                  {isActive ? 'LIVE' : 'SCREEN'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Restore hidden cams button */}
      {Object.values(hidden).some(Boolean) && (
        <button
          onClick={() => setHidden({})}
          className="pointer-events-auto fixed right-4 bottom-4 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur shadow-2xl z-50"
          title="Show hidden cams"
          aria-label="Show hidden cams"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}
    </>
  );
}

function ScreenView({ trackRef }: { trackRef: TrackReference }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <VideoTrack 
        trackRef={trackRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain' 
        }} 
      />
    </div>
  );
}

function FileViewer({
  file,
  onClose,
}: {
  file: { url: string; name: string; type: string };
  onClose?: () => void;
}) {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const [imageStatus, setImageStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    setImageStatus('loading');
    setRetryCount(0);
  }, [file.url]);

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-gray-700">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close file view"
          title="Close file view"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      {isImage ? (
        <>
          {imageStatus === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              <span className="ml-3 text-white text-sm">Loading image...</span>
            </div>
          )}
          {imageStatus === 'error' && (
            <div className="text-center text-white">
              <p className="text-lg font-semibold mb-2">Failed to load image</p>
              <p className="text-gray-300 text-sm mb-4">{file.name}</p>
              {retryCount < 3 && (
                <button
                  onClick={() => {
                    setRetryCount((c) => c + 1);
                    setImageStatus('loading');
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                >
                  Retry
                </button>
              )}
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 inline-block"
              >
                Open in new tab
              </a>
            </div>
          )}
          <img
            src={retryCount > 0 ? `${file.url}${file.url.includes('?') ? '&' : '?'}retry=${retryCount}` : file.url}
            alt={file.name}
            crossOrigin="anonymous"
            className={`max-w-full max-h-full object-contain ${imageStatus !== 'loaded' ? 'hidden' : ''}`}
            onLoad={() => setImageStatus('loaded')}
            onError={() => setImageStatus('error')}
          />
        </>
      ) : isPdf ? (
        <iframe
          src={file.url}
          title={file.name}
          className="w-full h-full border-0"
          allow="fullscreen"
        />
      ) : (
        <div className="text-center text-white">
          <h3 className="text-2xl font-bold">{file.name}</h3>
          <p className="text-gray-300 mt-2">
            File type not supported for preview
          </p>
          <a
            href={file.url}
            download={file.name}
            className="text-blue-300 hover:underline mt-4 inline-block"
          >
            Download File
          </a>
        </div>
      )}
    </div>
  );
}

export default LiveKitRoom; 
