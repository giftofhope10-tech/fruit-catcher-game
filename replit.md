# Fruit Catcher Game

## Overview
A fun, mobile-friendly fruit catching game built with HTML5 Canvas and JavaScript. Players control a basket to catch falling fruits, avoid bombs, and collect power-ups to achieve high scores.

## Recent Changes (April 2026)
### v1.4.1 — Banner Ad Race Condition Fix & Production Cleanup
- Fixed banner ad not showing: race condition where `notifyJsReady()` triggered JS `showBanner()` before `onBannerLoaded` fired, causing `setupBanner()` to destroy the loading banner in a loop
- `showBanner()` JsBridge now waits silently if banner is still loading; `onBannerLoaded` auto-shows when `mBannerVisible=true`
- Removed all debug code (AD LOG panel, adDebug JS object, [BANNER-DEBUG] log statements, notifyJsBannerEvent bridge)
- `TEST_MODE = false` — production Unity Ads
- Bumped versionCode 26 → 27, versionName 1.4.0 → 1.4.1
- Updated service worker cache to fruit-catcher-v24

### v1.4.0 — Full Audit & Professional Play Store Polish
- Bumped version to v1.4.0 across package.json, service worker (fruit-catcher-v14), Android (versionCode 26, versionName 1.4.0)
- Removed stale Google AdMob section from Privacy Policy — app uses Unity Ads only
- Removed unused `express` dependency from package.json
- Added Google Play In-App Review (ReviewManager) — prompts user after 5th and 20th game
- Added double-back-to-exit with "Press back again to exit" toast — standard Android UX
- Added `android:screenOrientation="portrait"` to lock portrait on all devices
- Added `android:windowSoftInputMode="adjustNothing"` — prevents layout shifts
- Added `<uses-feature android:name="android.hardware.touchscreen" required="false"/>` — Play Store visibility
- Added `colors.xml` — fixes broken colorPrimary/colorAccent/colorPrimaryDark references
- Upgraded `styles.xml` to DayNight theme with dark status/nav bars, fullscreen splash
- Updated `splash.xml` to dark game-themed background (#0D0D1A)
- Updated adaptive icon background to dark blue (#1A1A2E)
- Removed `android:allowBackup="true"` → `false` — prevents user data backup leaks
- Removed `android:supportsRtl="true"` → `false` — game layout is direction-independent
- Removed cleartext and allowMixedContent from capacitor.config.json — Unity Ads uses HTTPS
- Set `exitOnBackButton: false` in capacitor.config — double-back handled natively
- Added Google Play Review ProGuard rules
- Added `onGameCompleted()` JS bridge method — triggers review flow from game.js endGame()
- Added onPause/onResume BannerView lifecycle handling
- Reduced notifyJsReady retries from 5 to 3

### v1.3.0 — Production Cleanup
- Removed all fruit/item glow circles — cleaner look, slightly faster rendering
- Removed all ad debug code (JS panel, native TextView overlay, `getDebugInfo()` bridge method)
- `TEST_MODE = false` — production Unity Ads serving real fills
- Deleted `attached_assets/` screenshots from repo
- Banner ad confirmed working end-to-end in test mode before going production

### Performance Optimizations
- Removed `ctx.shadowBlur` everywhere — replaced with cheap offset text shadow (5-10x faster)
- Cached sky gradient — only recreated on weather change or canvas resize
- Cached sunlight shaft gradient — only recreated on canvas resize
- Batched grass blades, rain drops, and vine strokes into single path+stroke calls
- Removed `ctx.save()`/`ctx.restore()` per firefly in night mode
- Gradient cache invalidated on `resizeCanvas()`

### Earlier April 2026
- Fixed "Back to Game" button positioning on policy pages — safe-area-inset-top for notched devices
- Fixed Unity Ads banner — attached to root decor view, correct visibility/padding logic
- Updated Terms of Service — all AdMob references replaced with Unity Ads
- Secured keystore credentials in `android/keystore.properties` (gitignored)
- Removed dead AdMob CSS classes and meta-data; renamed adMob → unityAds
- Fixed Google Play Store AD_ID permission in AndroidManifest

## Project Structure
```
/
├── server.js              # Node.js static file server (port 5000)
├── public/
│   ├── index.html         # Main game HTML with AdMob integration
│   ├── privacy.html       # Privacy policy page
│   ├── terms.html         # Terms of service page
│   └── assets/
│       ├── game.js        # Main game logic (Canvas, audio, ads, leaderboard)
│       ├── style.css      # Responsive styles with CSS variables
│       ├── sw.js          # Service worker for PWA support
│       ├── manifest.json  # PWA manifest
│       ├── icon-192.png   # App icon (small)
│       └── icon-512.png   # App icon (large)
└── replit.md              # Project documentation
```

## Key Features
- **Difficulty Levels**: Easy, Medium, Hard with varying speeds and lives
- **Power-ups**: 2x Points, 3x Points, Slow Motion, Magnet, Shield, Mega Bonus
- **Dynamic Weather**: Clear skies, rain with lightning, night mode
- **Combo System**: Chain catches for bonus points
- **Leaderboard**: Top 50 players with local storage persistence
- **PWA Support**: Installable with service worker

## Technical Details
- **Canvas**: Full viewport using devicePixelRatio for high-DPI displays, alpha:false for performance
- **Touch Controls**: Responsive touch/mouse basket movement (0.55 interpolation)
- **Audio**: Web Audio API for sound effects and background music
- **Storage**: localStorage for high scores, leaderboard, and ad tracking
- **Android Target**: API 35 (Play Store 2025 compliant)

## Running the Game
The game runs on port 5000 via the Node.js server. Simply start the workflow and the game will be accessible in the webview.

## Android App for Play Store (v1.0.0)
The game is now set up as an Android app for Google Play Store!

### Quick Build Guide
1. Generate signing key: `keytool -genkey -v -keystore android/app/keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias fruit-catcher`
2. Build AAB: `cd android && ./gradlew bundleRelease && cd ..`
3. Upload AAB to Google Play Console

### App Details
- **Package ID**: com.fruitcatcher.game
- **Min Android**: 7.0 (API 24)
- **Target Android**: 15 (API 35) - Play Store 2025 compliant
- **Compile SDK**: 35
- **Screen**: Portrait only
- **Offline**: Fully supported
- **Security**: Network security config with cleartext disabled

See `ANDROID_SETUP.md` for detailed instructions.

## Mobile Responsiveness
- Uses CSS clamp() for fluid typography
- Safe area insets for notched devices
- Touch-friendly buttons and controls
- Swiper positioned to avoid accidental touches during gameplay
