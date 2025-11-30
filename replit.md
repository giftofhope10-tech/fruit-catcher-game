# Fruit Catcher Game 🍎🍊

## Overview
A professional, addictive Fruit Catcher game built with HTML5 Canvas. Features power-ups, combos, sound effects, weather animations, and challenging difficulty levels. Mobile-friendly and can be installed on Android as a PWA (Progressive Web App).

## How to Play
1. Click **"PLAY!"** button to start the game
2. **Select Difficulty** - Choose EASY, MEDIUM, or HARD before starting
3. **Move the basket** - Use touch or mouse to move basket left-right
4. **Catch fruits** - Different fruits give different points (10-40 points)
5. **Build combos** - Catch consecutive fruits for combo bonuses
6. **Catch power-ups** - Special items give you abilities
7. **Avoid bombs** - Only bombs take your lives (fire/skull just reduce score)

## Difficulty Levels
- **EASY** - 5 lives, slower speed, fewer bombs
- **MEDIUM** - 3 lives, medium speed, moderate bombs
- **HARD** - 2 lives, fast speed, more bombs

## Power-Ups
- ⭐ **Star** - 2x points for 5 seconds
- 💎 **Diamond** - 3x points for 4 seconds  
- ❄️ **Freeze** - Slow motion for 3 seconds
- 🧲 **Magnet** - Nearby fruits attract for 4 seconds
- 🛡️ **Shield** - Protection from 1 bomb
- 🌟 **Golden** - Mega bonus points

## Bad Items
- 💣 **Bomb** - -30 points, 1 life lost
- 🔥 **Fire** - -25 points (no life lost)
- 💀 **Skull** - -50 points (no life lost)

## Features
- 🍎 12 different fruits with varying point values
- 💥 6 special power-up items
- 💣 3 types of bad items
- 🎵 Sound effects (catch, combo, bomb, level up)
- 📳 Vibration on bomb catch (mobile)
- 🎶 Background music on home screen
- ✨ Particle effects and floating text
- 📈 Progressive difficulty - speed increases with levels
- 🔥 Combo system with bonus multipliers
- 💾 High score saved in browser
- 📱 Mobile touch controls
- 🌐 Offline PWA support
- 🌙 Day/night cycle animation
- 🌧️ Rain and lightning effects
- 🎨 Beautiful animated backgrounds
- 🔊 Toggle music and sound on/off

## Technical Details
- **Frontend**: HTML5 Canvas, CSS3, Vanilla JavaScript
- **Audio**: Web Audio API for sound effects and music
- **Vibration**: Vibration API for haptic feedback
- **Server**: Node.js HTTP server
- **Port**: 5000
- **PWA**: Service Worker for offline caching

## Files Structure
- `index.html` - Main HTML file
- `style.css` - Styling with animations
- `game.js` - Complete game logic
- `server.js` - Node.js server
- `manifest.json` - PWA manifest
- `sw.js` - Service Worker
- `icon-*.svg` - App icons
- `privacy.html` - Privacy Policy page
- `terms.html` - Terms of Service page

## Play Store Ready
- Privacy Policy page included
- Terms of Service page included
- PWA installable on Android
- Offline support
- All ages appropriate

## Android Installation
1. Open game in Chrome browser
2. Click menu and select "Add to Home Screen" or "Install App"
3. Game will be installed on your phone's home screen
4. Can play offline!

## Recent Changes
- November 30, 2025: Complete game with power-ups, combos, sound effects, vibration, background music, weather animations (day/night, rain, lightning), difficulty levels (Easy/Medium/Hard), Privacy Policy and Terms pages
