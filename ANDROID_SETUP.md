# Fruit Catcher - Android App Setup Guide

## Overview
This guide explains how to build the Fruit Catcher game as an Android app for Google Play Store.

## Current Status
✅ Web game setup complete
✅ Capacitor configuration added
✅ Android project structure ready
⏳ Signing certificate needed
⏳ Play Store registration needed

## Building for Play Store

### Step 1: Install Android Dependencies
```bash
npm install
npm run cap:sync
npm run cap:build
```

### Step 2: Generate Signing Certificate
```bash
cd android/app
keytool -genkey -v -keystore keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias fruit-catcher
cd ../..
```

### Step 3: Build Release AAB
```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 4: Upload to Play Store
1. Register at [Google Play Console](https://play.google.com/console)
2. Create new app: "Fruit Catcher"
3. Upload AAB file
4. Add:
   - Screenshots (minimum 2)
   - App description
   - Privacy policy
   - Content rating
5. Submit for review

## App Specifications
- **Package ID**: com.fruitcatcher.game
- **Min Android Version**: 7.0 (API 24)
- **Target Android Version**: 14 (API 34)
- **Screen Orientation**: Portrait
- **Offline Support**: Yes (Service Worker)
- **Permissions**: Internet, Network State

## Features Included
✅ Full offline gameplay
✅ High score persistence
✅ AdMob test ads
✅ PWA capabilities
✅ Multi-language support ready
✅ All difficulty levels (Easy, Medium, Hard)

## Troubleshooting

### Capacitor Sync Issues
```bash
npm run cap:sync
```

### Clear Gradle Cache
```bash
cd android && ./gradlew clean && cd ..
```

### Build Errors
Check Java version: `java -version` (requires JDK 11+)

## Security Notes
- Keystore file (keystore.jks) should NOT be committed to git
- Use strong password for keystore
- Keep signing key safe for app updates
- Never share keystore with unauthorized users

## Testing
Before uploading to Play Store:
1. Build APK and test on actual devices
2. Test offline functionality
3. Verify leaderboard works when online
4. Check ad display
5. Test all difficulty levels
