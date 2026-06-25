# LearnPeers iPad app

The iPad app is a **Capacitor** native shell that loads the live web app from
`https://learnpeers.com`. There is no second codebase: anything shipped to the
website appears in the app automatically. Native capabilities (push, camera,
Apple Pencil, App Store presence) are added as plugins on top of the shell.

## Files

- `capacitor.config.ts` — app id, name, and the `server.url` the shell loads.
- `mobile/www/index.html` — tiny offline fallback page (Capacitor requires a
  local `webDir`; the real app is loaded remotely).
- `ios/` — the generated native Xcode project (created by `npx cap add ios`).

## One-time prerequisite (must be installed by a developer)

**Full Xcode** — install from the Mac App Store (~7GB), then point the
toolchain at it:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

Capacitor 7 uses Swift Package Manager for plugins, so **CocoaPods is not
required** for the base setup. (Only install it — `brew install cocoapods` — if
you later add a Cordova-based plugin that needs it.)

## Finish the native project

The `ios/` project is already generated. After Xcode is installed:

```bash
npx cap sync ios    # resolves Swift packages + syncs config
npx cap open ios    # opens the project in Xcode
```

In Xcode, pick an iPad simulator (or a connected iPad) and press Run.

## Day-to-day

- Web changes need **no rebuild** — they ship via learnpeers.com.
- Native config changes (plugins, Info.plist, icons) → `npx cap sync ios`.

## Roadmap (native bolt-ons, in priority order)

1. **Push notifications** (`@capacitor/push-notifications` + APNs) — also the
   strongest defense against App Store guideline 4.2 ("just a website").
2. **Camera / mic permissions** in `Info.plist`
   (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`) — required for
   LiveKit video and for photographing homework. **Test on a real iPad early.**
3. **OAuth** — route Supabase/Google login through `@capacitor/browser`
   (ASWebAuthenticationSession), not the embedded webview.
4. **iPad polish** — landscape, safe-area insets, Split View / Stage Manager.
5. **Drawing** — only if Excalidraw-in-webview Pencil latency is insufficient,
   replace just the canvas with a native PencilKit surface.

## App Store notes

- **Stripe is likely fine**: live person-to-person tutoring is exempt from the
  In-App Purchase requirement. Avoid framing purchases as digital goods
  (credit packs, content subscriptions), which can trigger IAP (30%).
- Add the Capacitor origin to the app's CSP `connect-src` if requests break.
