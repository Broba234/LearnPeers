'use client';

import { VideoTrack, TrackReference } from '@livekit/components-react';

export function ScreenView({ trackRef }: { trackRef: TrackReference }) {
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
