# LiveKit Screen-Share API & Component Structure Audit

## Current Setup Overview

### LiveKit Dependencies
- **@livekit/components-react**: ^2.9.13
- **@livekit/components-styles**: ^1.1.6  
- **livekit-client**: ^2.15.2
- **livekit-server-sdk**: ^2.13.1

### Current Component Architecture

#### 1. Main LiveKitRoom Component (`components/LiveKitRoom.tsx`)

**Current Video Rendering Structure:**
```tsx
// Current imports
import {
  LiveKitRoom as LKRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  TrackReference,
  useDataChannel,
  useRoomContext,
} from '@livekit/components-react';

// VideoSidebar component (lines 210-222)
function VideoSidebar() {
  const tracks = useTracks();
  const videoTracks = tracks.filter((track) => track.publication.kind === 'video');
  return (
    <div className="space-y-4">
      {videoTracks.map((trackRef: TrackReference) => (
        <div key={trackRef.publication.trackSid} className="rounded-lg overflow-hidden">
          <VideoTrack trackRef={trackRef} />
        </div>
      ))}
    </div>
  );
}
```

**Current Authentication:**
- Room access token with `canPublish: true` and `canSubscribe: true`
- No specific screen share permissions currently configured

## Available LiveKit Screen-Share APIs

### 1. Core APIs from `livekit-client`

#### Track Sources
```typescript
Track.Source.ScreenShare = "screen_share"
Track.Source.ScreenShareAudio = "screen_share_audio"
```

#### LocalParticipant Methods
```typescript
// Primary screen share method
room.localParticipant.setScreenShareEnabled(
  enabled: boolean,
  options?: ScreenShareCaptureOptions,
  publishOptions?: TrackPublishOptions
): Promise<LocalTrackPublication | undefined>
```

#### ScreenShareCaptureOptions Interface
```typescript
interface ScreenShareCaptureOptions {
  audio?: boolean;
  selfBrowserSurface?: 'include' | 'exclude';
  surfaceSwitching?: 'include' | 'exclude';
  systemAudio?: 'include' | 'exclude';
}
```

### 2. React Components & Hooks from `@livekit/components-react`

#### Available Hooks
```typescript
// Get local participant state including screen share
useLocalParticipant(): {
  isMicrophoneEnabled: boolean;
  isScreenShareEnabled: boolean;  // ✅ Available
  isCameraEnabled: boolean;
  microphoneTrack: TrackPublication | undefined;
  cameraTrack: TrackPublication | undefined;
  // ... other properties
}

// Track toggle functionality
useTrackToggle({
  source: Track.Source.ScreenShare,  // ✅ Supported
  onChange?: (enabled: boolean) => void;
  initialState?: boolean;
  captureOptions?: ScreenShareCaptureOptions;
  publishOptions?: TrackPublishOptions;
})

// Get tracks by source
useTracks([Track.Source.ScreenShare]): TrackReference[]
useTracks([Track.Source.ScreenShareAudio]): TrackReference[]
```

#### Available Components
```typescript
// Track toggle button
<TrackToggle 
  source={Track.Source.ScreenShare}
  showIcon={true}
/>

// Icons
<ScreenShareIcon />
<ScreenShareStopIcon />

// Auto screen share on room join
<LiveKitRoom
  screen={true | ScreenShareCaptureOptions}
  // ... other props
>
```

#### Built-in Control Bar Support
```typescript
<ControlBar
  controls={{
    screenShare: true,  // ✅ Built-in screen share toggle
    // ... other controls
  }}
/>
```

### 3. Track Filtering & Rendering

#### Current VideoSidebar Enhancement Options
```typescript
// Option 1: Filter existing tracks for screen shares
const videoTracks = tracks.filter(track => 
  track.publication.kind === 'video' && 
  track.publication.source === Track.Source.Camera
);
const screenShareTracks = tracks.filter(track => 
  track.publication.source === Track.Source.ScreenShare
);

// Option 2: Use source-specific hooks
const cameraTracks = useTracks([Track.Source.Camera]);
const screenShareTracks = useTracks([Track.Source.ScreenShare]);
```

## Recommended Implementation Approach

### 1. Required Imports
```typescript
// Add to existing imports in LiveKitRoom.tsx
import {
  // ... existing imports
  useLocalParticipant,
  useTrackToggle,
  TrackToggle,
  ScreenShareIcon,
  ScreenShareStopIcon,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
```

### 2. Screen Share Toggle Component
```typescript
function ScreenShareButton() {
  const { toggle, enabled, pending } = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: {
      audio: true,  // Include system audio
      selfBrowserSurface: 'exclude'  // Don't show browser tab option
    }
  });

  return (
    <button 
      onClick={() => toggle()}
      disabled={pending}
      className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
    >
      {enabled ? <ScreenShareStopIcon /> : <ScreenShareIcon />}
      {enabled ? 'Stop Sharing' : 'Share Screen'}
    </button>
  );
}
```

### 3. Enhanced VideoSidebar
```typescript
function VideoSidebar() {
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  
  return (
    <div className="space-y-4">
      {/* Camera tracks */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Participants</h3>
        {cameraTracks.map((trackRef) => (
          <div key={trackRef.publication.trackSid} className="rounded-lg overflow-hidden">
            <VideoTrack trackRef={trackRef} />
          </div>
        ))}
      </div>
      
      {/* Screen share tracks - render larger */}
      {screenShareTracks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Screen Share</h3>
          {screenShareTracks.map((trackRef) => (
            <div key={trackRef.publication.trackSid} className="rounded-lg overflow-hidden">
              <VideoTrack trackRef={trackRef} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4. Role-Based Considerations

#### For Both Tutor and Student Roles:
- **Screen Share Permission**: Both roles should have `canPublish: true` (already configured)
- **UI Consistency**: Use same screen share toggle component for both roles
- **Track Handling**: Both can view screen shares from others in the same way

#### Potential Role Differences:
```typescript
function ScreenShareControls({ userRole }: { userRole: 'tutor' | 'student' }) {
  const { isScreenShareEnabled } = useLocalParticipant();
  
  // Could add role-specific behavior if needed
  const canInitiateScreenShare = userRole === 'tutor' || true; // Both can share
  
  if (!canInitiateScreenShare) {
    return null;
  }
  
  return <ScreenShareButton />;
}
```

### 5. Main View Enhancement
Consider rendering screen shares in the main content area when active:
```typescript
function MainContent({ onDisconnect, userRole }) {
  const [activeView, setActiveView] = useState('whiteboard');
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  
  // Auto-switch to screen share view when someone starts sharing
  useEffect(() => {
    if (screenShareTracks.length > 0 && activeView !== 'screenshare') {
      setActiveView('screenshare');
    }
  }, [screenShareTracks.length]);
  
  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          {activeView === 'whiteboard' && <CollaborativeWhiteboard />}
          {activeView === 'file' && sharedFile && <FileViewer file={sharedFile} />}
          {activeView === 'screenshare' && screenShareTracks.length > 0 && (
            <div className="w-full h-full">
              <VideoTrack trackRef={screenShareTracks[0]} />
            </div>
          )}
        </div>
      </div>
      {/* Enhanced sidebar with screen share controls */}
    </div>
  );
}
```

## Implementation Priority

1. **Phase 1**: Add screen share toggle button to sidebar
2. **Phase 2**: Enhance VideoSidebar to separate camera and screen share tracks  
3. **Phase 3**: Add main view screen share display
4. **Phase 4**: Add role-specific enhancements if needed

## Key Technical Notes

- **No additional dependencies needed** - all APIs available in current LiveKit versions
- **Consistent with existing patterns** - uses same hooks and components as current video implementation
- **Cross-browser compatible** - LiveKit handles browser differences for screen capture
- **Audio included** - Can capture system audio along with screen share
- **Automatic cleanup** - Tracks automatically cleaned up when participants disconnect

## Current Component Files to Modify

1. `components/LiveKitRoom.tsx` - Add screen share controls and enhanced track handling
2. No new files required - all functionality can be added to existing component structure
