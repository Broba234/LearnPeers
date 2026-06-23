'use client';

import React from 'react';
import { VideoTrack, useTracks, TrackReference } from '@livekit/components-react';

interface FloatingVideosProps {
  allScreenShares: Array<TrackReference & { timestamp: number; participantIdentity: string }>;
  screenTrackRef: TrackReference | null;
  onSelectScreenShare: (trackRef: TrackReference) => void;
}

export function FloatingVideos({ allScreenShares, screenTrackRef, onSelectScreenShare }: FloatingVideosProps) {
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
                <button onClick={() => participantShare && onSelectScreenShare(participantShare)} className={`absolute top-1 left-1 px-2 py-1 rounded-md text-[10px] font-semibold shadow ${isActive ? 'bg-green-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-500'}`} title={isActive ? 'Viewing screen' : `View ${participantIdentity}'s screen`}>
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
                <button onClick={() => participantShare && onSelectScreenShare(participantShare)} className={`absolute top-1 left-1 px-2 py-1 rounded-md text-[10px] font-semibold shadow ${isActive ? 'bg-green-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-500'}`} title={isActive ? 'Viewing screen' : `View ${participantIdentity}'s screen`}>
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
