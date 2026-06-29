import { Room, Track } from 'livekit-client';
import { toast } from '@/lib/toast';

/**
 * Safari browser information interface
 */
interface SafariInfo {
  isSafari: boolean;
  version: number | null;
  isSupported: boolean;
}

/**
 * Browser compatibility status interface
 */
interface CompatibilityStatus {
  isSupported: boolean;
  reason?: string;
  isMobile: boolean;
  safariInfo: SafariInfo;
}

/**
 * Browser compatibility detection utilities
 */
export const BrowserCompatibility = {
  /**
   * Check if the current browser supports getDisplayMedia API
   */
  isGetDisplayMediaSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  },

  /**
   * Check if we're running on a mobile device
   */
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  /**
   * Check Safari version and compatibility
   */
  getSafariInfo(): SafariInfo {
    const userAgent = navigator.userAgent;
    const isSafari = /Safari/.test(userAgent) && !/Chrome|Chromium/.test(userAgent);
    
    if (!isSafari) {
      return { isSafari: false, version: null, isSupported: true };
    }

    // Extract Safari version
    const versionMatch = userAgent.match(/Version\/(\d+)/);
    const version = versionMatch ? parseInt(versionMatch[1], 10) : null;
    const isSupported = version ? version >= 16 : false;

    return { isSafari, version, isSupported };
  },

  /**
   * Get comprehensive browser compatibility status
   */
  getCompatibilityStatus(): CompatibilityStatus {
    const isMobile = this.isMobile();
    const safariInfo = this.getSafariInfo();
    const hasGetDisplayMedia = this.isGetDisplayMediaSupported();

    // Mobile browsers generally don't support screen sharing
    if (isMobile) {
      return {
        isSupported: false,
        reason: 'Screen sharing is not supported on mobile devices',
        isMobile,
        safariInfo
      };
    }

    // Safari < 16 doesn't support screen sharing
    if (safariInfo.isSafari && !safariInfo.isSupported) {
      return {
        isSupported: false,
        reason: `Screen sharing requires Safari 16 or later. You're using Safari ${safariInfo.version || 'unknown version'}`,
        isMobile,
        safariInfo
      };
    }

    // Check if getDisplayMedia is available
    if (!hasGetDisplayMedia) {
      return {
        isSupported: false,
        reason: 'This browser does not support screen sharing (missing getDisplayMedia API)',
        isMobile,
        safariInfo
      };
    }

    return {
      isSupported: true,
      isMobile,
      safariInfo
    };
  }
};

export interface ScreenShareError {
  type: 'permission_denied' | 'not_supported' | 'not_found' | 'unknown' | 'no_room';
  message: string;
}

export const showError = (error: ScreenShareError) => {
  toast.error(error.message, 'Screen Share Error');
};

export const showSuccess = (message: string) => {
  toast.success(message, 'Screen Share');
};

/**
 * Starts screen sharing using the recommended LiveKit SDK method.
 * @param room - The LiveKit Room instance
 * @returns Promise that resolves to true if successful, false otherwise
 */
export const startScreenShare = async (room: Room | null): Promise<boolean> => {
  try {
    if (!room) {
      throw new Error('No active room connection found');
    }

    // Check browser compatibility using our custom method
    const compatibilityStatus = BrowserCompatibility.getCompatibilityStatus();
    if (!compatibilityStatus.isSupported) {
        throw new Error(compatibilityStatus.reason || 'Screen sharing is not supported in this browser.');
    }

    // This is the recommended way to start screen sharing
    await room.localParticipant.setScreenShareEnabled(true);

    showSuccess('Screen sharing started successfully!');
    return true;

  } catch (error: any) {
    let screenShareError: ScreenShareError;

    // Handle specific getDisplayMedia errors
    switch (error.name) {
      case 'NotAllowedError':
        screenShareError = {
          type: 'permission_denied',
          message: 'Screen sharing permission was denied. Please allow screen sharing in your browser and try again.'
        };
        break;
      
      case 'NotFoundError':
        screenShareError = {
          type: 'not_found',
          message: 'No screen or window was selected for sharing. Please select a screen or window to share.'
        };
        break;
      
      case 'NotSupportedError':
        screenShareError = {
          type: 'not_supported',
          message: 'Screen sharing is not supported in this browser or context. Please use a compatible browser.'
        };
        break;
      
      default:
        // Handle other error messages that might indicate permission issues
        if (error.message?.includes('Permission denied') || error.message?.includes('permission')) {
          screenShareError = {
            type: 'permission_denied',
            message: 'Screen sharing permission was denied. Please allow screen sharing and try again.'
          };
        } else if (error.message?.includes('not supported') || error.message?.includes('unsupported')) {
          screenShareError = {
            type: 'not_supported',
            message: 'Screen sharing is not supported in this browser or environment.'
          };
        } else {
          screenShareError = {
            type: 'unknown',
            message: error.message || 'An unknown error occurred while starting screen share. Please try again.'
          };
        }
    }

    console.error('Failed to start screen share:', error);
    showError(screenShareError);
    return false;
  }
};

/**
 * Stops screen sharing gracefully.
 * @param room - The LiveKit Room instance
 * @returns Promise that resolves to true if successful, false otherwise
 */
export const stopScreenShare = async (room: Room | null): Promise<boolean> => {
  try {
    if (!room) {
      throw new Error('No active room connection found');
    }

    if (!room.localParticipant.isScreenShareEnabled) {
        return true; // No share was active, so it's a success
    }

    await room.localParticipant.setScreenShareEnabled(false);

    showSuccess('Screen sharing stopped successfully!');
    return true;

  } catch (error: any) {
    const screenShareError: ScreenShareError = {
      type: 'unknown',
      message: error.message || 'An unknown error occurred while stopping screen share'
    };

    console.error('Failed to stop screen share:', error);
    showError(screenShareError);
    return false;
  }
};

/**
 * Checks if screen sharing is currently active.
 * @param room - The LiveKit Room instance
 * @returns boolean indicating if screen sharing is active
 */
export const isScreenSharing = (room: Room | null): boolean => {
  if (!room) return false;
  return room.localParticipant.isScreenShareEnabled;
};