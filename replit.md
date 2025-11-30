# Fruit Catcher Game

## Overview
A fun, mobile-friendly fruit catching game built with HTML5 Canvas and JavaScript. Players control a basket to catch falling fruits, avoid bombs, and collect power-ups to achieve high scores.

## Recent Changes (November 2025)
- Made game fullscreen with devicePixelRatio support for crisp display
- Basket positioned 60px from bottom for comfortable gameplay
- Made home screen fully mobile responsive with clamp() font sizes
- Moved Privacy/Terms links to bottom of start screen
- Fixed "PLAY NOW!" button visibility with proper padding
- Added leaderboard showing Top 50 players (visible when online)
- Added AdMob test ads on game open and game over
- Volume and pause buttons positioned 20px from bottom with safe-area support

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
│       ├── icon-192.svg   # App icon (small)
│       └── icon-512.svg   # App icon (large)
└── replit.md              # Project documentation
```

## Key Features
- **Difficulty Levels**: Easy, Medium, Hard with varying speeds and lives
- **Power-ups**: 2x Points, 3x Points, Slow Motion, Magnet, Shield, Mega Bonus
- **Dynamic Weather**: Clear skies, rain with lightning, night mode
- **Combo System**: Chain catches for bonus points
- **Leaderboard**: Top 50 players with local storage persistence
- **AdMob Integration**: Test ads on app open and game over
- **PWA Support**: Installable with service worker

## Technical Details
- **Canvas**: Full viewport using devicePixelRatio for high-DPI displays
- **Touch Controls**: Responsive touch/mouse basket movement
- **Audio**: Web Audio API for sound effects and background music
- **Storage**: localStorage for high scores and leaderboard
- **Ads**: Google AdSense test units (ca-app-pub-3940256099942544)

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
- **Target Android**: 14 (API 34)
- **Screen**: Portrait only
- **Offline**: Fully supported

See `ANDROID_SETUP.md` for detailed instructions.

## Mobile Responsiveness
- Uses CSS clamp() for fluid typography
- Safe area insets for notched devices
- Touch-friendly buttons and controls
- Swiper positioned to avoid accidental touches during gameplay
