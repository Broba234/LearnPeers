import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the LearnPeers iPad app.
 *
 * The native iOS shell does NOT bundle a copy of the web app. Instead it
 * loads the live production site from `server.url`, so anything shipped to
 * learnpeers.com appears in the app automatically with no rebuild.
 *
 * `webDir` still has to point at a real folder (Capacitor copies it into the
 * native bundle), so we ship a tiny offline fallback page there.
 */
const config: CapacitorConfig = {
  appId: 'com.learnpeers.app',
  appName: 'LearnPeers',
  webDir: 'mobile/www',
  server: {
    url: 'https://learnpeers.com',
    cleartext: false,
  },
  ios: {
    // 'always' keeps web content clear of the status bar / home indicator.
    // Switch to 'never' once safe-area CSS is added for a full-bleed look.
    contentInset: 'always',
  },
};

export default config;
