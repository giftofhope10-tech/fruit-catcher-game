// ─── Canvas roundRect polyfill (for older Android WebViews) ──────────────────
if (typeof CanvasRenderingContext2D !== 'undefined' &&
    !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        const rad = Math.min(Math.abs(Array.isArray(r) ? r[0] : r),
                             Math.min(Math.abs(w), Math.abs(h)) / 2);
        this.beginPath();
        this.moveTo(x + rad, y);
        this.arcTo(x + w, y,     x + w, y + h, rad);
        this.arcTo(x + w, y + h, x,     y + h, rad);
        this.arcTo(x,     y + h, x,     y,     rad);
        this.arcTo(x,     y,     x + w, y,     rad);
        this.closePath();
    };
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Splash Screen ───────────────────────────────────────────────────────────
(function() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    function hideSplash() {
        splash.classList.add('splash-hiding');
        setTimeout(() => {
            splash.style.display = 'none';
        }, 580);
    }

    // Hide splash after 2s max
    const splashTimer = setTimeout(hideSplash, 2000);

    // Hide as soon as page is fully loaded
    if (document.readyState === 'complete') {
        clearTimeout(splashTimer);
        setTimeout(hideSplash, 1200);
    } else {
        window.addEventListener('load', function() {
            clearTimeout(splashTimer);
            setTimeout(hideSplash, 1200);
        }, { once: true });
    }
})();
// ─────────────────────────────────────────────────────────────────────────────

// ─── Unity Ads Manager ───────────────────────────────────────────────────────
const unityAds = {
    ready: false,
    initializing: false,
    gameOverCount: 0,

    _isNative() {
        return typeof window.NativeUnityAds !== 'undefined';
    },

    _isCapacitorNative() {
        return typeof window.Capacitor !== 'undefined' &&
               window.Capacitor.isNativePlatform &&
               window.Capacitor.isNativePlatform();
    },

    init() {
        if (!this._isNative()) {
            if (!this._isCapacitorNative()) return;
            if (this.ready || this.initializing) return;
            this.initializing = true;
            let attempts = 0;
            const waitForBridge = () => {
                if (this._isNative()) { this.initializing = false; this.init(); return; }
                if (++attempts < 10) setTimeout(waitForBridge, 500);
                else this.initializing = false;
            };
            waitForBridge();
            return;
        }

        window.onNativeAdsReady = () => {
            if (this.ready) return;
            this.ready = true;
            this.showBanner();
        };

        if (window.NativeUnityAds.isInitialized()) {
            this.ready = true;
            this.showBanner();
        } else {
            const poll = () => {
                if (this.ready) return;
                try {
                    if (window.NativeUnityAds.isInitialized()) {
                        this.ready = true;
                        this.showBanner();
                        return;
                    }
                } catch(e) {}
                setTimeout(poll, 1000);
            };
            setTimeout(poll, 1000);
        }
    },

    showBanner() {
        if (this._isNative()) window.NativeUnityAds.showBanner();
    },

    hideBanner() {
        if (this._isNative()) window.NativeUnityAds.hideBanner();
    },

    showInterstitialIfReady() {
        this.gameOverCount++;
        if (this.gameOverCount % 3 !== 0) return;
        if (this._isNative() && window.NativeUnityAds.isVideoReady()) {
            window.NativeUnityAds.showVideo();
        }
    },

    onInternetRestored() {
        if (this._isNative() && !this.ready) this.init();
    }
};

// ── AD DEBUG PANEL ───────────────────────────────────────────────────────────
const adDebug = {
    _lines: [],
    _open: false,

    _el(id) { return document.getElementById(id); },

    init() {
        const toggle = this._el('ad-debug-toggle');
        const clear  = this._el('ad-debug-clear');
        if (toggle) toggle.addEventListener('click', () => this._toggle());
        if (clear)  clear.addEventListener('click',  () => this._clear());
        this._log('adDebug init — waiting for bridge...');
        this._refreshStatus();
        setInterval(() => this._refreshStatus(), 2000);
    },

    _toggle() {
        this._open = !this._open;
        const body = this._el('ad-debug-body');
        if (body) body.style.display = this._open ? 'block' : 'none';
        const btn = this._el('ad-debug-toggle');
        if (btn) btn.textContent = (this._open ? '▲' : '📋') + ' AD LOG';
    },

    _clear() {
        this._lines = [];
        const logEl = this._el('ad-debug-log');
        if (logEl) logEl.innerHTML = '';
    },

    _log(msg, isErr) {
        const t = new Date().toLocaleTimeString('en-GB');
        this._lines.push({ t, msg, isErr: !!isErr });
        if (this._lines.length > 40) this._lines.shift();
        const logEl = this._el('ad-debug-log');
        if (logEl) {
            logEl.innerHTML = this._lines.map(l =>
                `<div style="color:${l.isErr ? '#ff6666' : '#aaffaa'}">[${l.t}] ${l.msg}</div>`
            ).join('');
            logEl.scrollTop = logEl.scrollHeight;
        }
    },

    log(msg)   { this._log(msg, false); },
    error(msg) { this._log('❌ ' + msg, true); },

    _refreshStatus() {
        const el = this._el('ad-debug-status');
        if (!el) return;
        const isNative = typeof window.NativeUnityAds !== 'undefined';
        const isCap    = typeof window.Capacitor !== 'undefined' &&
                         window.Capacitor.isNativePlatform &&
                         window.Capacitor.isNativePlatform();
        let isInit = 'N/A', isVid = 'N/A';
        if (isNative) {
            try { isInit = window.NativeUnityAds.isInitialized(); } catch(e) { isInit = 'ERR'; }
            try { isVid  = window.NativeUnityAds.isVideoReady();   } catch(e) { isVid  = 'ERR'; }
        }
        el.innerHTML = [
            `<b>NativeBridge:</b> ${isNative ? '✅ YES' : '❌ NO'}`,
            `<b>CapacitorNative:</b> ${isCap ? '✅ YES' : '❌ NO'}`,
            `<b>AdsInitialized:</b> ${isInit}`,
            `<b>VideoReady:</b> ${isVid}`,
            `<b>unityAds.ready:</b> ${unityAds.ready}`,
        ].join('<br>');
    }
};

// Patch unityAds to also log to adDebug
(function patchUnityAdsDebug() {
    const orig = {
        init:        unityAds.init.bind(unityAds),
        showBanner:  unityAds.showBanner.bind(unityAds),
        hideBanner:  unityAds.hideBanner.bind(unityAds),
        showInterstitialIfReady: unityAds.showInterstitialIfReady.bind(unityAds),
    };

    unityAds.init = function() {
        adDebug.log('unityAds.init() called | isNative=' + this._isNative() + ' isCap=' + this._isCapacitorNative());
        orig.init();
    };

    unityAds.showBanner = function() {
        adDebug.log('showBanner() called | isNative=' + this._isNative());
        if (!this._isNative()) { adDebug.error('showBanner: NativeUnityAds bridge NOT found!'); return; }
        try { window.NativeUnityAds.showBanner(); adDebug.log('showBanner → native call OK'); }
        catch(e) { adDebug.error('showBanner native call threw: ' + e); }
    };

    unityAds.hideBanner = function() {
        adDebug.log('hideBanner() called');
        if (!this._isNative()) return;
        try { window.NativeUnityAds.hideBanner(); }
        catch(e) { adDebug.error('hideBanner threw: ' + e); }
    };

    unityAds.showInterstitialIfReady = function() {
        this.gameOverCount++;
        if (this.gameOverCount % 3 !== 0) return;
        adDebug.log('showInterstitial check | isNative=' + this._isNative());
        if (this._isNative()) {
            try {
                const ready = window.NativeUnityAds.isVideoReady();
                adDebug.log('isVideoReady=' + ready);
                if (ready) window.NativeUnityAds.showVideo();
            } catch(e) { adDebug.error('showInterstitial threw: ' + e); }
        }
    };

    const origOnReady = window.onNativeAdsReady;
    window.onNativeAdsReady = function() {
        adDebug.log('✅ onNativeAdsReady fired!');
        if (typeof origOnReady === 'function') origOnReady();
    };
})();

// ─────────────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameoverScreen = document.getElementById('gameover-screen');

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const soundBtn = document.getElementById('sound-btn');
const resumeBtn = document.getElementById('resume-btn');
const quitBtn = document.getElementById('quit-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const comboDisplay = document.getElementById('combo');
const difficultyBadge = document.getElementById('difficulty-badge');
const finalScoreDisplay = document.getElementById('final-score');
const highScoreDisplay = document.getElementById('high-score');

const musicToggle = document.getElementById('music-toggle');
const sfxToggle = document.getElementById('sfx-toggle');
const diffButtons = document.querySelectorAll('.diff-btn');

const leaderboardContainer = document.getElementById('leaderboard-container');

const fruitTypes = [
    { emoji: '🍎', points: 10, name: 'Apple' },
    { emoji: '🍊', points: 15, name: 'Orange' },
    { emoji: '🍋', points: 10, name: 'Lemon' },
    { emoji: '🍇', points: 20, name: 'Grapes' },
    { emoji: '🍓', points: 25, name: 'Strawberry' },
    { emoji: '🍑', points: 15, name: 'Peach' },
    { emoji: '🥭', points: 30, name: 'Mango' },
    { emoji: '🍒', points: 20, name: 'Cherry' },
    { emoji: '🍌', points: 10, name: 'Banana' },
    { emoji: '🥝', points: 25, name: 'Kiwi' },
    { emoji: '🍉', points: 35, name: 'Watermelon' },
    { emoji: '🍍', points: 40, name: 'Pineapple' }
];

const specialItems = [
    { emoji: '⭐', type: 'star', points: 100, effect: '2x Points!' },
    { emoji: '💎', type: 'diamond', points: 150, effect: '3x Points!' },
    { emoji: '🌟', type: 'golden', points: 200, effect: 'Mega Bonus!' },
    { emoji: '❄️', type: 'freeze', points: 50, effect: 'Slow Motion!' },
    { emoji: '🧲', type: 'magnet', points: 30, effect: 'Magnet!' },
    { emoji: '🛡️', type: 'shield', points: 25, effect: 'Shield!' }
];

const badItems = [
    { emoji: '💣', type: 'bomb', damage: 1, penalty: -30 },
    { emoji: '🔥', type: 'fire', damage: 0, penalty: -25 },
    { emoji: '💀', type: 'skull', damage: 0, penalty: -50 },
    { emoji: '🦂', type: 'scorpion', damage: 0, penalty: -100, killAll: true }
];

const difficultySettings = {
    easy: { 
        lives: 5, 
        baseSpeed: 2.4, 
        spawnInterval: 2400, 
        bombChance: 0.04,
        speedIncrement: 0.20,
        label: 'EASY',
        pointsPerLevel: 800,
        maxItems: 6,
        extraAtLevel: 7,
        extraTwoAtLevel: 12
    },
    medium: { 
        lives: 4, 
        baseSpeed: 3.6, 
        spawnInterval: 1900, 
        bombChance: 0.09,
        speedIncrement: 0.35,
        label: 'MEDIUM',
        pointsPerLevel: 700,
        maxItems: 8,
        extraAtLevel: 6,
        extraTwoAtLevel: 10
    },
    hard: { 
        lives: 3, 
        baseSpeed: 4.4, 
        spawnInterval: 1400, 
        bombChance: 0.13,
        speedIncrement: 0.55,
        label: 'HARD',
        pointsPerLevel: 600,
        maxItems: 10,
        extraAtLevel: 5,
        extraTwoAtLevel: 9
    }
};

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.bgMusic = null;
        this.isPlayingMusic = false;
        this.wasPlayingBeforeHidden = false;
        this.initVisibilityHandler();
    }

    init() {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (!this.bgMusic) {
                this.bgMusic = new Audio('assets/background-music.mp3');
                this.bgMusic.loop = true;
                this.bgMusic.volume = 0.4;
            }
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    initVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.isPlayingMusic) {
                    this.wasPlayingBeforeHidden = true;
                    this.pauseBackgroundMusic();
                }
            } else {
                if (this.wasPlayingBeforeHidden && this.musicEnabled) {
                    this.wasPlayingBeforeHidden = false;
                    this.resumeBackgroundMusic();
                }
            }
        });
        
        window.addEventListener('blur', () => {
            if (this.isPlayingMusic) {
                this.wasPlayingBeforeHidden = true;
                this.pauseBackgroundMusic();
            }
        });
        
        window.addEventListener('focus', () => {
            if (this.wasPlayingBeforeHidden && this.musicEnabled) {
                this.wasPlayingBeforeHidden = false;
                this.resumeBackgroundMusic();
            }
        });
    }

    startBackgroundMusic() {
        if (!this.bgMusic || !this.musicEnabled || this.isPlayingMusic) return;
        
        this.bgMusic.currentTime = 0;
        this.bgMusic.play().then(() => {
            this.isPlayingMusic = true;
        }).catch(e => {
            console.log('Music autoplay blocked:', e.message);
        });
    }

    pauseBackgroundMusic() {
        if (this.bgMusic && this.isPlayingMusic) {
            this.bgMusic.pause();
            this.isPlayingMusic = false;
        }
    }

    resumeBackgroundMusic() {
        if (this.bgMusic && this.musicEnabled && !this.isPlayingMusic) {
            this.bgMusic.play().then(() => {
                this.isPlayingMusic = true;
            }).catch(e => {
                console.log('Music resume blocked:', e.message);
            });
        }
    }

    stopBackgroundMusic() {
        if (this.bgMusic) {
            this.bgMusic.pause();
            this.bgMusic.currentTime = 0;
        }
        this.isPlayingMusic = false;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }
        return this.musicEnabled;
    }

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }

    play(type) {
        if (!this.sfxEnabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const now = this.audioContext.currentTime;
        
        switch(type) {
            case 'catch':
                oscillator.frequency.setValueAtTime(523.25, now);
                oscillator.frequency.exponentialRampToValueAtTime(783.99, now + 0.1);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                oscillator.start(now);
                oscillator.stop(now + 0.2);
                break;
            case 'special':
                oscillator.frequency.setValueAtTime(523.25, now);
                oscillator.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15);
                oscillator.frequency.exponentialRampToValueAtTime(1318.51, now + 0.3);
                gainNode.gain.setValueAtTime(0.4, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                oscillator.start(now);
                oscillator.stop(now + 0.4);
                break;
            case 'bomb':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(150, now);
                oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
                gainNode.gain.setValueAtTime(0.5, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                this.vibrate();
                break;
            case 'combo':
                oscillator.frequency.setValueAtTime(659.25, now);
                oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1);
                oscillator.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2);
                gainNode.gain.setValueAtTime(0.35, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;
            case 'levelup':
                for (let i = 0; i < 4; i++) {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    osc.frequency.setValueAtTime(523.25 * (1 + i * 0.25), now + i * 0.1);
                    gain.gain.setValueAtTime(0.25, now + i * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);
                    osc.start(now + i * 0.1);
                    osc.stop(now + i * 0.1 + 0.15);
                }
                break;
            case 'gameover':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(400, now);
                oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.5);
                gainNode.gain.setValueAtTime(0.4, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                oscillator.start(now);
                oscillator.stop(now + 0.5);
                this.vibrate(300);
                break;
        }
    }

    vibrate(duration = 100) {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }
}

const audio = new AudioManager();

let selectedDifficulty = 'medium';
let gameState = {
    score: 0,
    lives: 3,
    level: 1,
    combo: 0,
    maxCombo: 0,
    isRunning: false,
    isPaused: false,
    highScore: parseInt(localStorage.getItem('fruitCatcherHighScore')) || 0,
    totalCaught: 0,
    multiplier: 1,
    multiplierEnd: 0,
    hasShield: false,
    magnetActive: false,
    magnetEnd: 0,
    freezeActive: false,
    freezeEnd: 0,
    gameTime: 0,
    weather: 'night',
    dayPhase: 0.8
};

let basket = { x: 0, y: 0, width: 80, height: 50, targetX: 0, facing: 1 };
let fallingItems = [];
let particles = [];
let floatingTexts = [];
let rainDrops = [];
let backgroundStars = [];
let shootingStars = [];
let lightning = { active: false, alpha: 0 };
let animationId = null;
let lastSpawnTime = 0;
let spawnInterval = 1500;
let lastTime = 0;
let weatherChangeTime = 0;
let dangerFlash = 0;
let catchFlash = 0;
let screenShakeX = 0;
let screenShakeY = 0;
let screenShakeMag = 0;
let catchEffects = [];
let basketSquish = 0;
let currentDtFactor = 1;
let _cachedSkyGradient = null;
let _cachedSkyWeather = null;
let _cachedSkyH = 0;

// UI cache — only update DOM when values actually change
let _uiScore = -1;
let _uiLives = -1;
let _uiLevel = -1;
let _uiCombo = -1;

// Pre-built hearts strings to avoid repeat() every frame
const _heartsCache = ['', '❤️', '❤️❤️', '❤️❤️❤️', '❤️❤️❤️❤️', '❤️❤️❤️❤️❤️'];

// Cached danger vignette gradient (recreated only on resize)
let _dangerGradient = null;
let _dangerGradientW = 0;
let _dangerGradientH = 0;

const SWIPER_HEIGHT = 0;
const BASKET_OFFSET = 95;

let displayWidth = window.innerWidth;
let displayHeight = window.innerHeight;

// ─── Keyboard & Gamepad State ─────────────────────────────────────────────────
const keyState = { left: false, right: false };
let _kbMoveX = 0;
let _lastGamepadCheck = 0;
let _gpPrevA = false;
let _gpPrevB = false;


class LeaderboardManager {
    constructor() {
        this.leaderboard = this.loadLeaderboard();
        this.playerName = this.getPlayerName();
    }

    getPlayerName() {
        let name = localStorage.getItem('fruitCatcherPlayerName');
        if (!name) {
            name = 'Player_' + Math.random().toString(36).substr(2, 6).toUpperCase();
            localStorage.setItem('fruitCatcherPlayerName', name);
        }
        return name;
    }

    loadLeaderboard() {
        try {
            const stored = localStorage.getItem('fruitCatcherLeaderboard');
            if (stored) return JSON.parse(stored);
        } catch (e) {
            localStorage.removeItem('fruitCatcherLeaderboard');
        }
        return this.generateDemoLeaderboard();
    }

    generateDemoLeaderboard() {
        const names = [
            'FruitMaster', 'CatchKing', 'ProGamer', 'FruitNinja', 'SpeedCatcher',
            'AppleHunter', 'OrangeKing', 'BerryPro', 'MangoPro', 'ChampionX',
            'FastHands', 'QuickCatch', 'TopPlayer', 'StarGamer', 'FruitLord',
            'GameMaster', 'HighScore', 'ProPlayer', 'BestCatch', 'FruitFan',
            'SuperCatch', 'MegaFruit', 'UltraGamer', 'FruitBoss', 'CatchPro',
            'GameStar', 'FruitHero', 'TopCatcher', 'BestPlayer', 'FruitChamp',
            'CatchMaster', 'ProCatcher', 'GameKing', 'FruitStar', 'UltraCatch',
            'MegaCatcher', 'SuperGamer', 'FruitKnight', 'CatchLord', 'GamePro',
            'FastCatcher', 'QuickGamer', 'SpeedMaster', 'FruitWiz', 'CatchWiz',
            'GameWizard', 'FruitAce', 'CatchAce', 'TopGamer', 'BestGamer'
        ];
        
        const leaderboard = [];
        for (let i = 0; i < 50; i++) {
            leaderboard.push({
                name: names[i],
                score: Math.floor(5000 - (i * 80) + Math.random() * 50),
                rank: i + 1
            });
        }
        
        return leaderboard;
    }

    updateLeaderboard(playerName, score) {
        const existingIndex = this.leaderboard.findIndex(p => p.name === playerName);
        
        if (existingIndex !== -1) {
            if (score > this.leaderboard[existingIndex].score) {
                this.leaderboard[existingIndex].score = score;
            }
        } else {
            this.leaderboard.push({ name: playerName, score: score });
        }
        
        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, 50);
        this.leaderboard.forEach((p, i) => p.rank = i + 1);
        
        try {
            localStorage.setItem('fruitCatcherLeaderboard', JSON.stringify(this.leaderboard));
        } catch (e) {
            console.warn('Leaderboard save failed (storage full?):', e.message);
        }
    }

    renderLeaderboard() {
        if (!leaderboardContainer) return;

        // Update "Your Best" score display
        const myBestEl = document.getElementById('my-best-score');
        if (myBestEl) {
            const hs = parseInt(localStorage.getItem('fruitCatcherHighScore')) || 0;
            myBestEl.textContent = hs > 0 ? hs.toLocaleString() : '—';
        }

        if (!navigator.onLine) {
            leaderboardContainer.innerHTML = `<div class="leaderboard-offline"><span>📡 Connect to see leaderboard</span></div>`;
            const countEl = document.getElementById('lb-count-label');
            if (countEl) countEl.textContent = '';
            return;
        }

        // Show top 3 entries + current user if outside top 3
        const SHOW = 3;
        const topN  = this.leaderboard.slice(0, SHOW);
        const userIndex = this.leaderboard.findIndex(p => p.name === this.playerName);
        const userInTop = userIndex !== -1 && userIndex < SHOW;
        const medalIcon = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
        const rankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';

        let html = '';
        topN.forEach((player, i) => {
            const isCurrentUser = player.name === this.playerName;
            const medal = medalIcon(i);
            const rankDisplay = medal
                ? `<span class="lb-medal">${medal}</span>`
                : `<span class="lb-num">${player.rank}</span>`;
            html += `<div class="leaderboard-item ${rankClass(i)} ${isCurrentUser ? 'current-user' : ''}">
                    <div class="leaderboard-rank">${rankDisplay}</div>
                    <div class="leaderboard-name">${player.name}</div>
                    <div class="leaderboard-score">${player.score.toLocaleString()}</div>
                </div>`;
        });

        // Show current user row if not already visible
        if (!userInTop && userIndex !== -1) {
            const player = this.leaderboard[userIndex];
            html += `<div class="leaderboard-item current-user lb-you">
                    <div class="leaderboard-rank"><span class="lb-num">${player.rank}</span></div>
                    <div class="leaderboard-name">👤 ${player.name}</div>
                    <div class="leaderboard-score">${player.score.toLocaleString()}</div>
                </div>`;
        }

        leaderboardContainer.innerHTML = html;

        // Update count label
        const countEl = document.getElementById('lb-count-label');
        if (countEl) countEl.textContent = `${this.leaderboard.length} players`;
    }
}

const leaderboardManager = new LeaderboardManager();

function initBackgroundStars() {
    backgroundStars = [];
    for (let i = 0; i < 80; i++) {
        backgroundStars.push({
            x: Math.random() * displayWidth,
            y: Math.random() * displayHeight * 0.6,
            size: Math.random() * 2.5 + 0.5,
            twinkle: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.04 + 0.01
        });
    }
    shootingStars = [];
}

function spawnShootingStar() {
    shootingStars.push({
        x: Math.random() * displayWidth,
        y: Math.random() * displayHeight * 0.3,
        vx: 6 + Math.random() * 8,
        vy: 3 + Math.random() * 4,
        length: 80 + Math.random() * 80,
        life: 1,
        decay: 0.03 + Math.random() * 0.02
    });
}

function drawShootingStars() {
    // Randomly spawn new shooting stars
    if (Math.random() < 0.008) spawnShootingStar();

    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        ctx.save();
        ctx.globalAlpha = s.life;
        const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * s.length / 10, s.y - s.vy * s.length / 10);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * s.length / 10, s.y - s.vy * s.length / 10);
        ctx.stroke();
        ctx.restore();
        s.x += s.vx;
        s.y += s.vy;
        s.life -= s.decay;
        if (s.life <= 0 || s.x > displayWidth + 50 || s.y > displayHeight) {
            shootingStars.splice(i, 1);
        }
    }
}

function initRainDrops() {
    rainDrops = [];
    for (let i = 0; i < 100; i++) {
        rainDrops.push({
            x: Math.random() * displayWidth,
            y: Math.random() * displayHeight,
            length: Math.random() * 15 + 10,
            speed: Math.random() * 8 + 12,
            opacity: Math.random() * 0.5 + 0.3
        });
    }
}

function resizeCanvas() {
    // Cap DPR at 2 — 4K/HiDPI screens would otherwise render 4-9× pixels
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const headerEl = document.getElementById('game-header');
    const headerHeight = (headerEl && gameScreen && !gameScreen.classList.contains('hidden'))
        ? headerEl.offsetHeight
        : 0;

    displayWidth = window.innerWidth;
    displayHeight = window.innerHeight - headerHeight;

    // Invalidate cached gradients on resize
    _cachedSkyGradient = null;
    _dangerGradient = null;

    canvas.style.top = headerHeight + 'px';
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    // Position combo text just below the header
    const comboEl = document.getElementById('combo');
    if (comboEl) comboEl.style.top = (headerHeight + 6) + 'px';

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    basket.width = Math.min(displayWidth * 0.17, 100);
    basket.height = basket.width * 0.65;
    basket.y = displayHeight - basket.height - SWIPER_HEIGHT - BASKET_OFFSET;
    basket.x = (displayWidth - basket.width) / 2;
    basket.targetX = basket.x;

    // Invalidate sky gradient cache — dimensions changed
    _cachedSkyWeather = null;

    initBackgroundStars();
    initRainDrops();
}

function _drawBow(ctx, x, y, s) {
    ctx.fillStyle = '#ff1a8c';
    ctx.beginPath();
    ctx.ellipse(x - 4.5 * s, y, 4.5 * s, 3 * s, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 4.5 * s, y, 4.5 * s, 3 * s, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.arc(x, y, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
}

function drawCharacter() {
    const bx = basket.x;
    const by = basket.y;        // top of catch zone / bucket opening
    const bw = basket.width;
    const bh = basket.height;
    const cx = bx + bw / 2;
    const s = Math.max(bw / 60, 0.65);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Apply catch squish — squeeze Y, expand X around the basket base
    if (basketSquish > 0.01) {
        const squishY = 1 - basketSquish * 0.22;
        const squishX = 1 + basketSquish * 0.14;
        ctx.translate(cx, by + bh);
        ctx.scale(squishX, squishY);
        ctx.translate(-cx, -(by + bh));
    }

    // Flip horizontally around cx to face movement direction
    ctx.translate(cx, 0);
    ctx.scale(basket.facing || 1, 1);
    ctx.translate(-cx, 0);

    // ── Layout anchors ────────────────────────────────────────────────
    // Bucket is held at waist/hand level: by..by+bh is the catch zone
    // Girl's feet are BELOW the bucket
    const girlFeetY  = by + bh + 26 * s;   // feet on the ground below
    const waistY     = by + bh;             // bottom of bucket = waist line
    const shoulderY  = by - 14 * s;         // shoulders above bucket
    const neckTopY   = shoulderY - 4 * s;
    const headR      = 12 * s;
    const headCY     = neckTopY - headR - 2 * s;

    // ── SHOES ────────────────────────────────────────────────────────
    ctx.fillStyle = '#1a1028';
    ctx.beginPath();
    ctx.ellipse(cx - 7 * s, girlFeetY + 3, 7 * s, 3.5 * s, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 7 * s, girlFeetY + 3, 7 * s, 3.5 * s, 0.08, 0, Math.PI * 2);
    ctx.fill();

    // ── LEGS / white socks ───────────────────────────────────────────
    ctx.strokeStyle = '#f0e0e0';
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 6 * s, girlFeetY);
    ctx.lineTo(cx - 5 * s, waistY + 2 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 6 * s, girlFeetY);
    ctx.lineTo(cx + 5 * s, waistY + 2 * s);
    ctx.stroke();

    // ── SKIRT (between waist and legs) ───────────────────────────────
    const skirtGrad = ctx.createLinearGradient(cx, waistY, cx, girlFeetY - 4 * s);
    skirtGrad.addColorStop(0, '#e91e8c');
    skirtGrad.addColorStop(1, '#c2185b');
    ctx.fillStyle = skirtGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 8 * s, waistY);
    ctx.lineTo(cx + 8 * s, waistY);
    ctx.lineTo(cx + 17 * s, girlFeetY - 4 * s);
    ctx.lineTo(cx - 17 * s, girlFeetY - 4 * s);
    ctx.closePath();
    ctx.fill();
    // Skirt trim
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(cx - 17 * s, girlFeetY - 7 * s);
    ctx.lineTo(cx + 17 * s, girlFeetY - 7 * s);
    ctx.lineTo(cx + 17 * s, girlFeetY - 4 * s);
    ctx.lineTo(cx - 17 * s, girlFeetY - 4 * s);
    ctx.closePath();
    ctx.fill();

    // ── BUCKET (held at hand level — the catch zone) ──────────────────
    const inset  = bw * 0.08;
    const rimH   = Math.max(5, bw * 0.11);

    // Bucket body
    const bucketGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    bucketGrad.addColorStop(0,   '#e8922a');
    bucketGrad.addColorStop(0.4, '#a05010');
    bucketGrad.addColorStop(1,   '#5a2a08');
    ctx.fillStyle = bucketGrad;
    ctx.beginPath();
    ctx.moveTo(bx + 1,        by + rimH);
    ctx.lineTo(bx + bw - 1,  by + rimH);
    ctx.lineTo(bx + bw - inset, by + bh - 2);
    ctx.quadraticCurveTo(cx, by + bh + 3, bx + inset, by + bh - 2);
    ctx.closePath();
    ctx.fill();

    // Wicker bands
    for (let i = 1; i < 4; i++) {
        const t  = i / 4;
        const hy = by + rimH + (bh - rimH - 2) * t;
        const hw = bw / 2 - inset * t;
        ctx.strokeStyle = `rgba(40,15,2,${0.22 + i * 0.05})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(cx - hw, hy);
        ctx.lineTo(cx + hw, hy);
        ctx.stroke();
    }

    // Bucket rim
    const rimGrad = ctx.createLinearGradient(0, by, 0, by + rimH);
    rimGrad.addColorStop(0, '#ffe070');
    rimGrad.addColorStop(1, '#8a5000');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.roundRect(bx - 3, by, bw + 6, rimH, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(bx - 1, by + 1, bw + 2, 2);

    // ── ARMS (from shoulders bending down to grip bucket sides) ──────
    ctx.strokeStyle = '#f5cba7';
    ctx.lineWidth = 4 * s;
    // Left arm
    ctx.beginPath();
    ctx.moveTo(cx - 8 * s, shoulderY + 4 * s);
    ctx.quadraticCurveTo(cx - 20 * s, by, bx - 1, by + rimH + 2);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(cx + 8 * s, shoulderY + 4 * s);
    ctx.quadraticCurveTo(cx + 20 * s, by, bx + bw + 1, by + rimH + 2);
    ctx.stroke();

    // Hands gripping bucket
    ctx.fillStyle = '#f5cba7';
    ctx.beginPath();
    ctx.arc(bx - 1, by + rimH + 2, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx + bw + 1, by + rimH + 2, 4 * s, 0, Math.PI * 2);
    ctx.fill();

    // ── BLOUSE / TORSO ───────────────────────────────────────────────
    ctx.fillStyle = '#fff5f8';
    ctx.beginPath();
    ctx.moveTo(cx - 8 * s, shoulderY);
    ctx.lineTo(cx + 8 * s, shoulderY);
    ctx.lineTo(cx + 8 * s, waistY);
    ctx.lineTo(cx - 8 * s, waistY);
    ctx.closePath();
    ctx.fill();
    // Blouse bow
    ctx.fillStyle = '#ff3399';
    ctx.beginPath();
    ctx.arc(cx, shoulderY + 6 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();

    // ── NECK ─────────────────────────────────────────────────────────
    ctx.strokeStyle = '#f5cba7';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(cx, shoulderY);
    ctx.lineTo(cx, neckTopY);
    ctx.stroke();

    // ── HEAD (back view — we see hair, not face) ──────────────────────
    // Base skull
    ctx.fillStyle = '#f5cba7';
    ctx.beginPath();
    ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Full hair covering back of head (dark brown)
    ctx.fillStyle = '#5a2d0c';
    ctx.beginPath();
    ctx.arc(cx, headCY, headR + 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Hair highlight (lighter brown sheen on top)
    ctx.fillStyle = '#7a3e18';
    ctx.beginPath();
    ctx.ellipse(cx - 2 * s, headCY - headR * 0.35, headR * 0.65, headR * 0.45, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Hair whorl / parting
    ctx.strokeStyle = '#3a1a00';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(cx, headCY, 3 * s, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();

    // Left pigtail (from behind)
    ctx.fillStyle = '#5a2d0c';
    ctx.beginPath();
    ctx.ellipse(cx - headR - 3 * s, headCY + 3 * s, 5.5 * s, 9 * s, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Right pigtail (from behind)
    ctx.beginPath();
    ctx.ellipse(cx + headR + 3 * s, headCY + 3 * s, 5.5 * s, 9 * s, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Pigtail hair sheen
    ctx.fillStyle = '#7a3e18';
    ctx.beginPath();
    ctx.ellipse(cx - headR - 2.5 * s, headCY + 1 * s, 2.5 * s, 4 * s, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + headR + 2.5 * s, headCY + 1 * s, 2.5 * s, 4 * s, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Left bow (pink butterfly bow)
    _drawBow(ctx, cx - headR - 3 * s, headCY - 5 * s, s);
    // Right bow
    _drawBow(ctx, cx + headR + 3 * s, headCY - 5 * s, s);

    // ── Shield aura ───────────────────────────────────────────────────
    if (gameState.hasShield) {
        const auraH = girlFeetY + 3 - (headCY - headR - 4);
        ctx.strokeStyle = 'rgba(80,220,255,0.95)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, (headCY - headR + girlFeetY) / 2, bw / 1.3 + 14, auraH / 2 + 6, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

const MAX_PARTICLES = 80;

function createParticles(x, y, color, count = 10, type = 'normal') {
    if (particles.length >= MAX_PARTICLES) return;
    count = Math.min(count, MAX_PARTICLES - particles.length);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        const speed = type === 'explosion' ? 8 + Math.random() * 6 : 3 + Math.random() * 4;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: type === 'explosion' ? 6 + Math.random() * 4 : 3 + Math.random() * 3,
            color,
            life: 1,
            decay: 0.02 + Math.random() * 0.02,
            type
        });
    }
}

function createFloatingText(x, y, text, color, size = 24) {
    floatingTexts.push({ x, y, text, color, size, life: 1, vy: -3 });
}

function spawnItem() {
    const settings = difficultySettings[selectedDifficulty];
    const rand = Math.random();
    let item;

    const levelSpeedBonus = (gameState.level - 1) * settings.speedIncrement;
    // Bomb chance increases very gradually with level, capped lower
    const difficultyMultiplier = Math.min(gameState.level * 0.01, 0.08);
    // Zigzag only from level 8+ so early levels stay clean
    const zigzagStrength = gameState.level >= 8 ? Math.min((gameState.level - 7) * 0.18, 1.2) : 0;
    const hasZigzag = zigzagStrength > 0 && Math.random() < 0.28;

    // Choose X with firm spacing from all existing items in top 70% of screen
    let spawnX;
    const minSpacing = 160;
    let attempts = 0;
    do {
        spawnX = Math.random() * (displayWidth - 120) + 60;
        attempts++;
    } while (
        attempts < 20 &&
        fallingItems.some(fi => Math.abs(fi.x - spawnX) < minSpacing && fi.y < displayHeight * 0.70)
    );

    const baseY = -55;

    if (rand < settings.bombChance + difficultyMultiplier) {
        const maxBadIndex = Math.min(badItems.length, 1 + Math.floor(gameState.level / 5));
        const badItem = badItems[Math.floor(Math.random() * maxBadIndex)];
        item = {
            ...badItem,
            x: spawnX,
            startX: spawnX,
            y: baseY,
            size: Math.round(44 + Math.random() * 6),
            speed: settings.baseSpeed + levelSpeedBonus + Math.random() * 1.2,
            isBad: true,
            vx: hasZigzag ? (Math.random() - 0.5) * zigzagStrength * 1.5 : 0,
            zigzag: hasZigzag,
            zigzagPhase: Math.random() * Math.PI * 2,
            zigzagSpeed: 0.035 + Math.random() * 0.025,
            zigzagAmp: zigzagStrength * 1.2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.09
        };
    } else if (rand < settings.bombChance + difficultyMultiplier + 0.08) {
        const special = specialItems[Math.floor(Math.random() * specialItems.length)];
        item = {
            ...special,
            x: spawnX,
            startX: spawnX,
            y: baseY,
            size: 50,
            speed: settings.baseSpeed + levelSpeedBonus * 0.65 + Math.random() * 0.8,
            isSpecial: true,
            vx: 0,
            zigzag: false,
            rotation: 0,
            rotationSpeed: 0.04
        };
    } else {
        const maxFruitIndex = Math.min(fruitTypes.length, 6 + Math.floor(gameState.level / 2));
        const fruit = fruitTypes[Math.floor(Math.random() * maxFruitIndex)];
        item = {
            ...fruit,
            x: spawnX,
            startX: spawnX,
            y: baseY,
            size: Math.round(44 + Math.random() * 6),
            speed: settings.baseSpeed + levelSpeedBonus + Math.random() * 1.2,
            isFruit: true,
            vx: hasZigzag ? (Math.random() - 0.5) * zigzagStrength * 1.2 : 0,
            zigzag: hasZigzag,
            zigzagPhase: Math.random() * Math.PI * 2,
            zigzagSpeed: 0.03 + Math.random() * 0.02,
            zigzagAmp: zigzagStrength * 0.9,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.07
        };
    }

    fallingItems.push(item);
}

function drawItem(item) {
    ctx.font = `${item.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (item.rotation) {
        // Only pay the save/restore cost when actually rotating
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation);
        ctx.fillText(item.emoji, 0, 0);
        ctx.restore();
    } else {
        ctx.fillText(item.emoji, item.x, item.y);
    }
}

function updateItems(dtFactor = 1) {
    const speedMultiplier = (gameState.freezeActive ? 0.3 : 1) * dtFactor;
    
    for (let i = fallingItems.length - 1; i >= 0; i--) {
        const item = fallingItems[i];
        item.y += item.speed * speedMultiplier;
        if (item.rotationSpeed) item.rotation += item.rotationSpeed * dtFactor;

        // Zigzag horizontal movement — advance phase by dtFactor, then set x
        // absolutely from startX so there is no frame-by-frame drift
        if (item.zigzag) {
            item.zigzagPhase += item.zigzagSpeed * dtFactor;
            const rawX = item.startX + Math.sin(item.zigzagPhase) * item.zigzagAmp * 18;
            item.x = Math.max(item.size / 2, Math.min(displayWidth - item.size / 2, rawX));
        }
        
        if (gameState.magnetActive && !item.isBad) {
            const dx = (basket.x + basket.width / 2) - item.x;
            const dy = (basket.y) - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150 && dist > 0) {
                item.x += (dx / dist) * 3 * dtFactor;
                item.y += (dy / dist) * 2 * dtFactor;
            }
        }
        
        const catchZoneTop = basket.y - 10;
        const catchZoneBottom = basket.y + basket.height * 0.6;
        
        if (item.y > catchZoneTop && 
            item.y < catchZoneBottom &&
            item.x > basket.x - 10 && 
            item.x < basket.x + basket.width + 10) {
            
            if (item.isBad) {
                if (gameState.hasShield) {
                    gameState.hasShield = false;
                    createParticles(item.x, item.y, '#64b5f6', 15);
                    createFloatingText(item.x, item.y, 'Shield Used!', '#64b5f6');
                    audio.play('catch');
                } else {
                    const damage = item.damage ?? 0;
                    if (item.killAll) {
                        gameState.lives = 0;
                        audio.play('bomb');
                        screenShakeMag = 20;
                        createParticles(item.x, item.y, '#ff0000', 40, 'explosion');
                        createParticles(item.x, item.y, '#8b0000', 20, 'explosion');
                        createFloatingText(item.x, item.y - 20, '☠ ALL LIVES LOST!', '#ff0000', 30);
                    } else if (damage > 0) {
                        gameState.lives -= damage;
                        audio.play('bomb');
                        screenShakeMag = 14;
                    } else {
                        audio.play('bomb');
                        screenShakeMag = 8;
                    }
                    if (!item.killAll) {
                        gameState.score = Math.max(0, gameState.score + item.penalty);
                        gameState.combo = 0;
                        createParticles(item.x, item.y, '#ff4444', 28, 'explosion');
                        createParticles(item.x, item.y, '#ff8800', 12, 'explosion');
                        createFloatingText(item.x, item.y, item.penalty.toString(), '#ff4444', 32);
                    } else {
                        gameState.score = Math.max(0, gameState.score + item.penalty);
                        gameState.combo = 0;
                    }
                }
            } else if (item.isSpecial) {
                handleSpecialItem(item);
                createParticles(item.x, item.y, '#ffd700', 25);
                audio.play('special');
            } else {
                let points = item.points * gameState.multiplier;
                gameState.combo++;
                gameState.totalCaught++;
                
                if (gameState.combo > 1) {
                    points = Math.floor(points * (1 + gameState.combo * 0.1));
                    if (gameState.combo % 5 === 0) {
                        audio.play('combo');
                        createFloatingText(item.x, item.y - 30, `${gameState.combo}x COMBO!`, '#ff6b6b', 28);
                    }
                }
                
                gameState.score += points;
                gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
                catchFlash = Math.min(catchFlash + 0.5, 1.5);
                basketSquish = 0.38;

                const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#ff9ff3'];
                const col = colors[Math.floor(Math.random() * colors.length)];
                createCatchEffect(item.x, basket.y + basket.height / 2, col);
                createParticles(item.x, item.y, col, 18);
                createParticles(item.x, item.y, '#ffffff', 6);
                createFloatingText(item.x, item.y, `+${points}`, '#4ade80');
                audio.play('catch');
            }
            
            fallingItems.splice(i, 1);

            if (gameState.lives <= 0) {
                endGame();
            }
            continue;
        }
        
        if (item.y > displayHeight + 50) {
            if (item.isFruit) {
                gameState.combo = 0;
                createFloatingText(item.x, displayHeight - 80, 'Miss!', '#ff9966', 20);
            }
            fallingItems.splice(i, 1);
        }
    }
}

function handleSpecialItem(item) {
    const now = Date.now();
    
    switch(item.type) {
        case 'star':
            gameState.multiplier = 2;
            gameState.multiplierEnd = now + 5000;
            createFloatingText(item.x, item.y, '2x POINTS!', '#ffd700', 30);
            break;
        case 'diamond':
            gameState.multiplier = 3;
            gameState.multiplierEnd = now + 4000;
            createFloatingText(item.x, item.y, '3x POINTS!', '#00ffff', 32);
            break;
        case 'golden':
            gameState.score += item.points * gameState.multiplier;
            createFloatingText(item.x, item.y, `+${item.points * gameState.multiplier}`, '#ffd700', 34);
            break;
        case 'freeze':
            gameState.freezeActive = true;
            gameState.freezeEnd = now + 3000;
            createFloatingText(item.x, item.y, 'FREEZE!', '#87ceeb', 28);
            break;
        case 'magnet':
            gameState.magnetActive = true;
            gameState.magnetEnd = now + 4000;
            createFloatingText(item.x, item.y, 'MAGNET!', '#ff6b6b', 28);
            break;
        case 'shield':
            gameState.hasShield = true;
            createFloatingText(item.x, item.y, 'SHIELD!', '#64b5f6', 28);
            break;
    }
    
    gameState.score += 50;
}

function createCatchEffect(x, y, color) {
    catchEffects.push({ x, y, r: 10, maxR: 55, life: 1, color });
}

function updateParticles(dtFactor = 1) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dtFactor;
        p.y += p.vy * dtFactor;
        p.vy += 0.2 * dtFactor;
        p.life -= p.decay * dtFactor;
        p.size *= Math.pow(0.97, dtFactor);
        if (p.life <= 0 || p.size < 0.5) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function updateCatchEffects(dtFactor = 1) {
    for (let i = catchEffects.length - 1; i >= 0; i--) {
        const e = catchEffects[i];
        e.r += (e.maxR - e.r) * 0.22 * dtFactor;
        e.life -= 0.055 * dtFactor;
        if (e.life <= 0) catchEffects.splice(i, 1);
    }
}

function drawCatchEffects() {
    for (const e of catchEffects) {
        ctx.save();
        ctx.globalAlpha = e.life * 0.7;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3 * e.life;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

function updateFloatingTexts(dtFactor = 1) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy * dtFactor;
        ft.vy *= Math.pow(0.95, dtFactor);
        ft.life -= 0.022 * dtFactor;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
}

function drawFloatingTexts() {
    for (const ft of floatingTexts) {
        const alpha = Math.min(1, ft.life * 1.4);
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${ft.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        // Cheap text outline: draw dark copy slightly offset, then bright copy on top
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'middle';
}

function updateWeather(timestamp) {
    if (timestamp - weatherChangeTime > 40000) {
        // Night-only: alternate between clear night and rainy night
        const weathers = ['night', 'night', 'rain'];
        gameState.weather = weathers[Math.floor(Math.random() * weathers.length)];
        weatherChangeTime = timestamp;
        if (gameState.weather === 'rain') {
            initRainDrops();
        }
    }
    // Keep dayPhase locked in night range (no day/dawn cycles)
    gameState.dayPhase = 0.8;
}

function drawBackground() {
    const time = Date.now() / 1000;
    const isNight = gameState.weather === 'night' || gameState.dayPhase > 0.7;
    const isRain  = gameState.weather === 'rain';
    const groundY = displayHeight - SWIPER_HEIGHT - 20;
    const weatherKey = isNight ? 'night' : isRain ? 'rain' : 'clear';

    // ── Sky gradient — recreate only when weather or height changes ──
    if (_cachedSkyWeather !== weatherKey || _cachedSkyH !== displayHeight) {
        _cachedSkyGradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
        if (isNight) {
            _cachedSkyGradient.addColorStop(0,   '#020d04');
            _cachedSkyGradient.addColorStop(0.5, '#051a08');
            _cachedSkyGradient.addColorStop(1,   '#0a2210');
        } else if (isRain) {
            _cachedSkyGradient.addColorStop(0,   '#1a2a18');
            _cachedSkyGradient.addColorStop(0.5, '#253825');
            _cachedSkyGradient.addColorStop(1,   '#1a2a18');
        } else {
            _cachedSkyGradient.addColorStop(0,   '#1a6e2e');
            _cachedSkyGradient.addColorStop(0.4, '#228b36');
            _cachedSkyGradient.addColorStop(0.75,'#1b5e20');
            _cachedSkyGradient.addColorStop(1,   '#0d3b12');
        }
        _cachedSkyWeather = weatherKey;
        _cachedSkyH = displayHeight;
    }
    ctx.fillStyle = _cachedSkyGradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // ── Background jungle trees ─────────────────────────────────────
    _drawJungleTree(ctx, -25, groundY, 44, 175, time,       isNight);
    _drawJungleTree(ctx, displayWidth * 0.07, groundY, 28, 130, time+1.1, isNight);
    _drawJungleTree(ctx, displayWidth + 25, groundY, 46, 180, time+0.5,  isNight);
    _drawJungleTree(ctx, displayWidth * 0.88, groundY, 30, 138, time+1.8,isNight);
    _drawJungleTree(ctx, displayWidth * 0.22, groundY, 16,  95, time+2.2, isNight);
    _drawJungleTree(ctx, displayWidth * 0.74, groundY, 18, 100, time+0.9, isNight);

    // ── Hanging vines ───────────────────────────────────────────────
    _drawVines(ctx, time, isNight);

    // ── Night: fireflies — no save/restore per firefly ──────────────
    if (isNight) {
        ctx.fillStyle = '#ccff88';
        for (const star of backgroundStars) {
            star.twinkle += star.speed;
            const a = Math.max(0, Math.sin(star.twinkle));
            if (a > 0.15) {
                ctx.globalAlpha = a * 0.85;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    // ── Rain ────────────────────────────────────────────────────────
    if (isRain) {
        drawRain();
        if (Math.random() < 0.004) { lightning.active = true; lightning.alpha = 1; }
        if (lightning.active) {
            ctx.fillStyle = `rgba(255,255,255,${lightning.alpha * 0.45})`;
            ctx.fillRect(0, 0, displayWidth, displayHeight);
            lightning.alpha -= 0.1;
            if (lightning.alpha <= 0) lightning.active = false;
        }
    }

    // ── Freeze tint ─────────────────────────────────────────────────
    if (gameState.freezeActive) {
        ctx.fillStyle = 'rgba(135,206,235,0.18)';
        ctx.fillRect(0, 0, displayWidth, displayHeight);
    }

    // ── Jungle floor ────────────────────────────────────────────────
    // Wave step scales with width — avoids 100+ iterations on wide screens
    const waveStep = Math.max(18, Math.round(displayWidth / 60));
    const _waveY = (x) => groundY - Math.sin(x * 0.055 + time * 0.6) * 6 - Math.sin(x * 0.028) * 4;
    // Soil
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(0, groundY + 12, displayWidth, displayHeight - groundY);
    // Pre-compute wave points once, reuse for both grass passes
    const wavePoints = [];
    for (let x = 0; x <= displayWidth; x += waveStep) wavePoints.push([x, _waveY(x)]);
    // Dark base grass
    ctx.fillStyle = '#145214';
    ctx.beginPath();
    ctx.moveTo(0, displayHeight);
    for (const [x, y] of wavePoints) ctx.lineTo(x, y);
    ctx.lineTo(displayWidth, displayHeight);
    ctx.closePath();
    ctx.fill();
    // Bright top strip
    ctx.fillStyle = isNight ? '#0d3d0d' : '#22a822';
    ctx.beginPath();
    ctx.moveTo(0, groundY + 3);
    for (const [x, y] of wavePoints) ctx.lineTo(x, y);
    ctx.lineTo(displayWidth, groundY + 3);
    ctx.closePath();
    ctx.fill();
    // Small grass blades — step scales with screen width to avoid 100+ iterations on PC/TV
    const grassStep = Math.max(14, Math.round(displayWidth / 90));
    ctx.strokeStyle = isNight ? '#0d4a0d' : '#33cc33';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 8; x < displayWidth; x += grassStep) {
        const baseY = _waveY(x);
        const sway  = Math.sin(x * 0.1 + time * 1.2) * 3;
        ctx.moveTo(x, baseY);
        ctx.quadraticCurveTo(x + sway, baseY - 9, x + sway * 1.4, baseY - 14);
    }
    ctx.stroke();
}

function _drawJungleTree(ctx, baseX, baseY, trunkW, trunkH, time, isNight) {
    const tc  = isNight ? '#071a07' : '#2d1200';
    const lc1 = isNight ? '#062006' : '#1a5e00';
    const lc2 = isNight ? '#0a2e0a' : '#267300';
    const lc3 = isNight ? '#0d380d' : '#33880a';

    const sway = Math.sin(time * 0.55) * 5;
    const tipX = baseX + sway;
    const tipY = baseY - trunkH;

    // Trunk
    ctx.fillStyle = tc;
    ctx.beginPath();
    ctx.moveTo(baseX - trunkW * 0.5, baseY);
    ctx.quadraticCurveTo(baseX - trunkW * 0.25, baseY - trunkH * 0.55, tipX, tipY);
    ctx.lineTo(tipX + trunkW * 0.35, tipY + 12);
    ctx.quadraticCurveTo(baseX + trunkW * 0.25, baseY - trunkH * 0.55, baseX + trunkW * 0.5, baseY);
    ctx.closePath();
    ctx.fill();

    // Canopy layers
    ctx.fillStyle = lc1;
    ctx.beginPath();
    ctx.arc(tipX, tipY + 8, trunkW * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lc2;
    ctx.beginPath();
    ctx.arc(tipX - trunkW * 0.9 + sway * 0.4, tipY + trunkW * 0.6, trunkW * 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tipX + trunkW * 0.9 + sway * 0.4, tipY + trunkW * 0.7, trunkW * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lc3;
    ctx.beginPath();
    ctx.arc(tipX + sway * 0.3, tipY - trunkW * 0.4, trunkW * 1.5, 0, Math.PI * 2);
    ctx.fill();
}

function _drawVines(ctx, time, isNight) {
    const positions = [0.18, 0.52, 0.82];
    const lengths   = [0.28, 0.22, 0.26];
    const lc     = isNight ? '#0d3d00' : '#2a7a00';
    const leafC  = isNight ? '#0a3300' : '#3aaa00';
    // Draw all vine strokes as one batched path
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = lc;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    for (let i = 0; i < positions.length; i++) {
        const vx  = displayWidth * positions[i];
        const len = displayHeight * lengths[i];
        const sway = Math.sin(time * 0.22 + i * 1.8) * 10;
        ctx.moveTo(vx, 0);
        ctx.bezierCurveTo(
            vx + sway * 1.5, len * 0.25,
            vx - sway * 1.5, len * 0.6,
            vx + sway * 0.8, len
        );
    }
    ctx.stroke();
    // Leaves — all batched into a single beginPath+fill to cut 18 draw calls to 1
    ctx.fillStyle = leafC;
    ctx.beginPath();
    for (let i = 0; i < positions.length; i++) {
        const vx  = displayWidth * positions[i];
        const len = displayHeight * lengths[i];
        const sway = Math.sin(time * 0.22 + i * 1.8) * 10;
        for (let t = 0.2; t <= 1; t += 0.35) {
            const lx = vx + sway * (t < 0.4 ? 1.5 : t < 0.7 ? -1.5 : 0.8) * t;
            const ly = len * t;
            ctx.ellipse(lx + 10, ly,     12, 5,  0.5, 0, Math.PI * 2);
            ctx.ellipse(lx - 10, ly + 5, 12, 5, -0.5, 0, Math.PI * 2);
        }
    }
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawRain() {
    // Move all drops first, then draw as one batched path
    for (const drop of rainDrops) {
        drop.y += drop.speed * currentDtFactor;
        drop.x -= 1 * currentDtFactor;
        if (drop.y > displayHeight) {
            drop.y = -drop.length;
            drop.x = Math.random() * displayWidth;
        }
    }
    ctx.strokeStyle = 'rgba(174, 194, 224, 0.55)';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (const drop of rainDrops) {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 2, drop.y + drop.length);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function drawPowerUpIndicator(emoji, label, timerRatio, color, yOffset) {
    const x = 8, w = 120, h = 22, r = 11;
    // Background pill
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(x, yOffset, w, h, r);
    ctx.fill();
    // Timer fill
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.30;
    ctx.beginPath();
    ctx.roundRect(x, yOffset, w * timerRatio, h, r);
    ctx.fill();
    // Text
    ctx.globalAlpha = 1;
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${emoji} ${label}`, x + 8, yOffset + h / 2);
    ctx.restore();
}

function drawPowerUpIndicators() {
    const now = Date.now();
    let yOffset = 80;
    const gap = 26;

    if (gameState.multiplier > 1 && now < gameState.multiplierEnd) {
        const total = gameState.multiplier === 3 ? 4000 : 5000;
        const ratio = Math.max(0, (gameState.multiplierEnd - now) / total);
        const col = gameState.multiplier === 3 ? '#00ffff' : '#ffd700';
        drawPowerUpIndicator(gameState.multiplier === 3 ? '💎' : '⭐', `${gameState.multiplier}x Points`, ratio, col, yOffset);
        yOffset += gap;
    } else {
        gameState.multiplier = 1;
    }

    if (gameState.freezeActive && now < gameState.freezeEnd) {
        const ratio = Math.max(0, (gameState.freezeEnd - now) / 3000);
        drawPowerUpIndicator('❄️', 'Slow Motion', ratio, '#87ceeb', yOffset);
        yOffset += gap;
    } else {
        gameState.freezeActive = false;
    }

    if (gameState.magnetActive && now < gameState.magnetEnd) {
        const ratio = Math.max(0, (gameState.magnetEnd - now) / 4000);
        drawPowerUpIndicator('🧲', 'Magnet', ratio, '#ff6b6b', yOffset);
        yOffset += gap;
    } else {
        gameState.magnetActive = false;
    }

    if (gameState.hasShield) {
        drawPowerUpIndicator('🛡️', 'Shield', 1, '#64b5f6', yOffset);
    }
}

function updateUI() {
    if (gameState.score !== _uiScore) {
        _uiScore = gameState.score;
        scoreDisplay.textContent = `Score: ${_uiScore}`;
    }
    const lives = Math.max(0, Math.min(gameState.lives, 5));
    if (lives !== _uiLives) {
        _uiLives = lives;
        livesDisplay.textContent = _heartsCache[lives] || '❤️'.repeat(lives);
    }
    if (gameState.level !== _uiLevel) {
        _uiLevel = gameState.level;
        levelDisplay.textContent = `Level: ${_uiLevel}`;
    }
    if (comboDisplay) {
        const combo = gameState.combo;
        if (combo !== _uiCombo) {
            _uiCombo = combo;
            if (combo > 1) {
                comboDisplay.textContent = `${combo}x Combo!`;
                comboDisplay.style.display = 'block';
            } else {
                comboDisplay.style.display = 'none';
            }
        }
    }
}

function gameLoop(timestamp) {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    const rawDelta = timestamp - lastTime;
    // Cap at 60fps — on 120Hz/144Hz screens this halves unnecessary render work
    if (rawDelta < 14) {
        animationId = requestAnimationFrame(gameLoop);
        return;
    }
    lastTime = timestamp;
    const deltaTime = Math.min(rawDelta, 50);
    gameState.gameTime += deltaTime;
    const dtFactor = deltaTime / 16.667;

    // Screen shake decay
    if (screenShakeMag > 0) {
        screenShakeMag *= 0.75;
        screenShakeX = (Math.random() - 0.5) * screenShakeMag;
        screenShakeY = (Math.random() - 0.5) * screenShakeMag;
        if (screenShakeMag < 0.5) { screenShakeMag = 0; screenShakeX = 0; screenShakeY = 0; }
    }
    
    // Apply screen shake
    ctx.save();
    ctx.translate(screenShakeX, screenShakeY);

    currentDtFactor = dtFactor;

    updateWeather(timestamp);
    drawBackground();
    
    const settings = difficultySettings[selectedDifficulty];
    // Level up every pointsPerLevel points (slower, more satisfying ramp)
    const newLevel = Math.floor(gameState.score / settings.pointsPerLevel) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        audio.play('levelup');
        createFloatingText(displayWidth / 2, displayHeight / 2, `LEVEL ${gameState.level}!`, '#ffd700', 44);
        createFloatingText(displayWidth / 2, displayHeight / 2 + 50, '⚡ Faster!', '#ff9500', 30);
        // One item at a time: interval shrinks 70ms per level, minimum 500ms
        spawnInterval = Math.max(500, settings.spawnInterval - (gameState.level * 70));
    }

    // Simple one-at-a-time spawner — one item drops, waits, next item drops
    if (timestamp - lastSpawnTime > spawnInterval && fallingItems.length < settings.maxItems) {
        spawnItem();
        lastSpawnTime = timestamp;
    }

    // ── Keyboard movement ─────────────────────────────────────────────
    const kbSpeed = displayWidth * 0.011 * dtFactor;
    if (keyState.left)  basket.targetX = Math.max(0, basket.targetX - kbSpeed);
    if (keyState.right) basket.targetX = Math.min(displayWidth - basket.width, basket.targetX + kbSpeed);

    // ── Gamepad polling (TV remotes / controllers) ────────────────────
    if (timestamp - _lastGamepadCheck > 50) {
        _lastGamepadCheck = timestamp;
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let gi = 0; gi < pads.length; gi++) {
            const gp = pads[gi];
            if (!gp) continue;
            // Left stick X axis (axis 0) or D-pad (14=left, 15=right)
            const axisX = gp.axes[0] || 0;
            const dLeft  = (gp.buttons[14] && gp.buttons[14].pressed) || axisX < -0.3;
            const dRight = (gp.buttons[15] && gp.buttons[15].pressed) || axisX > 0.3;
            const gpSpeed = displayWidth * 0.014 * Math.min(Math.abs(axisX) + 0.5, 1.5);
            if (dLeft)  basket.targetX = Math.max(0, basket.targetX - gpSpeed);
            if (dRight) basket.targetX = Math.min(displayWidth - basket.width, basket.targetX + gpSpeed);
            // Edge-detect A button (0) / Start (9) — fire only on new press, not hold
            const gpA = (gp.buttons[0] && gp.buttons[0].pressed) ||
                        (gp.buttons[9] && gp.buttons[9].pressed);
            if (gpA && !_gpPrevA) {
                if (!gameState.isRunning) startGame();
                else if (gameState.isPaused) resumeGame();
            }
            _gpPrevA = gpA;
            // Edge-detect B button (1) = pause
            const gpB = !!(gp.buttons[1] && gp.buttons[1].pressed);
            if (gpB && !_gpPrevB && gameState.isRunning && !gameState.isPaused) pauseGame();
            _gpPrevB = gpB;
            break;
        }
    }

    const _prevX = basket.x;
    basket.x += (basket.targetX - basket.x) * Math.min(0.92 * dtFactor, 1);
    const _dx = basket.x - _prevX;
    if (Math.abs(_dx) > 0.4) basket.facing = _dx > 0 ? 1 : -1;

    basketSquish *= Math.pow(0.72, dtFactor);
    if (basketSquish < 0.01) basketSquish = 0;

    updateItems(dtFactor);
    updateParticles(dtFactor);
    updateCatchEffects(dtFactor);
    updateFloatingTexts(dtFactor);
    
    fallingItems.forEach(drawItem);
    drawParticles();
    drawCatchEffects();
    drawCharacter();
    drawFloatingTexts();
    drawPowerUpIndicators();

    // Danger overlay — pulsing red vignette when lives <= 1
    if (gameState.lives <= 1) {
        dangerFlash += 0.07 * dtFactor;
        const dangerAlpha = 0.12 + Math.sin(dangerFlash) * 0.1;
        // Recreate gradient only when canvas size changes
        if (!_dangerGradient || _dangerGradientW !== displayWidth || _dangerGradientH !== displayHeight) {
            _dangerGradient = ctx.createRadialGradient(
                displayWidth / 2, displayHeight / 2, displayHeight * 0.2,
                displayWidth / 2, displayHeight / 2, displayHeight * 0.8
            );
            _dangerGradient.addColorStop(0, 'rgba(255,0,0,0)');
            _dangerGradient.addColorStop(1, 'rgba(255,0,0,1)');
            _dangerGradientW = displayWidth;
            _dangerGradientH = displayHeight;
        }
        ctx.globalAlpha = dangerAlpha;
        ctx.fillStyle = _dangerGradient;
        ctx.fillRect(0, 0, displayWidth, displayHeight);
        ctx.globalAlpha = 1;
    } else {
        dangerFlash = 0;
    }

    // Green catch flash
    if (catchFlash > 0) {
        ctx.fillStyle = `rgba(100,255,150,${catchFlash * 0.18})`;
        ctx.fillRect(0, 0, displayWidth, displayHeight);
        catchFlash -= 0.08 * dtFactor;
    }

    ctx.restore();
    
    updateUI();
    
    animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
    cancelAnimationFrame(animationId);
    animationId = null;
    unityAds.hideBanner();
    audio.init();
    audio.stopBackgroundMusic();
    
    const settings = difficultySettings[selectedDifficulty];
    
    gameState = {
        score: 0,
        lives: settings.lives,
        level: 1,
        combo: 0,
        maxCombo: 0,
        isRunning: true,
        isPaused: false,
        highScore: gameState.highScore,
        totalCaught: 0,
        multiplier: 1,
        multiplierEnd: 0,
        hasShield: false,
        magnetActive: false,
        magnetEnd: 0,
        freezeActive: false,
        freezeEnd: 0,
        gameTime: 0,
        weather: 'night',
        dayPhase: 0.8
    };
    
    fallingItems = [];
    particles = [];
    floatingTexts = [];
    catchEffects = [];
    shootingStars = [];
    lastSpawnTime = 0;
    spawnInterval = settings.spawnInterval;
    lastTime = performance.now();
    weatherChangeTime = 0;
    dangerFlash = 0;
    catchFlash = 0;
    basketSquish = 0;
    screenShakeX = 0;
    screenShakeY = 0;
    screenShakeMag = 0;
    _uiScore = -1; _uiLives = -1; _uiLevel = -1; _uiCombo = -1;
    
    difficultyBadge.textContent = settings.label;
    difficultyBadge.className = selectedDifficulty;

    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    resizeCanvas();
    updateUI();

    animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
    gameState.isPaused = true;
    cancelAnimationFrame(animationId);
    animationId = null;
    pauseScreen.classList.remove('hidden');
}

function resumeGame() {
    gameState.isPaused = false;
    pauseScreen.classList.add('hidden');
    lastTime = performance.now();
    lastSpawnTime = performance.now();
    animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
    gameState.isRunning = false;
    cancelAnimationFrame(animationId);
    audio.play('gameover');
    unityAds.showBanner();
    unityAds.showInterstitialIfReady();
    if (unityAds._isNative() && typeof window.NativeUnityAds.onGameCompleted === 'function') {
        window.NativeUnityAds.onGameCompleted();
    }
    
    const isNewHighScore = gameState.score > gameState.highScore;
    if (isNewHighScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('fruitCatcherHighScore', gameState.highScore);
    }
    
    leaderboardManager.updateLeaderboard(leaderboardManager.playerName, gameState.score);
    
    // Star rating thresholds by difficulty
    const starThresholds = {
        easy:   { two: 200,  three: 600  },
        medium: { two: 400,  three: 1000 },
        hard:   { two: 700,  three: 1800 }
    };
    const thresholds = starThresholds[selectedDifficulty] || starThresholds.medium;
    const stars = gameState.score >= thresholds.three ? 3 : gameState.score >= thresholds.two ? 2 : gameState.score > 0 ? 1 : 0;

    // Update star display
    const starEls = [document.getElementById('star1'), document.getElementById('star2'), document.getElementById('star3')];
    starEls.forEach((el, i) => {
        el.classList.remove('earned');
        if (i < stars) {
            setTimeout(() => el.classList.add('earned'), 300 + i * 200);
        }
    });

    // New high score banner
    const newHSLabel = document.getElementById('new-highscore-label');
    if (newHSLabel) {
        newHSLabel.classList.toggle('show', isNewHighScore);
    }
    
    finalScoreDisplay.innerHTML = `
        <div style="margin-bottom: 8px">Your Score: <span style="color: #4ade80; font-size: 1.8rem; font-weight:bold">${gameState.score}</span></div>
        <div style="font-size: 0.9rem; color: #aaa">Level ${gameState.level} &nbsp;|&nbsp; Best Combo: ${gameState.maxCombo}x</div>
    `;
    highScoreDisplay.textContent = `🏆 Best: ${gameState.highScore}`;
    
    gameScreen.classList.add('hidden');
    gameoverScreen.classList.remove('hidden');
}

function goHome() {
    gameState.isRunning = false;
    cancelAnimationFrame(animationId);
    unityAds.showBanner();

    gameScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    
    leaderboardManager.renderLeaderboard();
    
    audio.init();
    if (audio.musicEnabled) {
        audio.startBackgroundMusic();
    }
}

function handleMove(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    basket.targetX = Math.max(0, Math.min(displayWidth - basket.width, x - basket.width / 2));
}

canvas.addEventListener('mousemove', (e) => {
    if (gameState.isRunning && !gameState.isPaused) {
        handleMove(e.clientX);
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState.isRunning && !gameState.isPaused) {
        handleMove(e.touches[0].clientX);
    }
}, { passive: false });

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState.isRunning && !gameState.isPaused) {
        handleMove(e.touches[0].clientX);
    }
}, { passive: false });

diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        diffButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedDifficulty = btn.dataset.difficulty;
    });
});

musicToggle.addEventListener('click', () => {
    const enabled = audio.toggleMusic();
    musicToggle.classList.toggle('active', enabled);
});

sfxToggle.addEventListener('click', () => {
    const enabled = audio.toggleSfx();
    sfxToggle.classList.toggle('active', enabled);
});

soundBtn.addEventListener('click', () => {
    const enabled = audio.toggleSfx();
    soundBtn.textContent = enabled ? '🔊' : '🔇';
});


document.addEventListener('click', () => {
    audio.init();
    if (audio.musicEnabled && !gameState.isRunning && !audio.isPlayingMusic) {
        audio.startBackgroundMusic();
    }
}, { once: true });

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resumeBtn.addEventListener('click', resumeGame);
quitBtn.addEventListener('click', goHome);
restartBtn.addEventListener('click', startGame);
homeBtn.addEventListener('click', goHome);

// ─── togglePause (called by Capacitor app pause event) ───────────────────────
function togglePause() {
    if (!gameState.isRunning) return;
    if (gameState.isPaused) resumeGame(); else pauseGame();
}

// ─── Keyboard controls (PC / Laptop) ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'ArrowLeft':  case 'KeyA': keyState.left  = true; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': keyState.right = true; e.preventDefault(); break;
        case 'Space': case 'KeyP':
            e.preventDefault();
            if (!gameState.isRunning) return;
            if (gameState.isPaused) resumeGame(); else pauseGame();
            break;
        case 'Enter':
            e.preventDefault();
            if (!gameState.isRunning) startGame();
            else if (gameState.isPaused) resumeGame();
            break;
        case 'Escape':
            e.preventDefault();
            if (gameState.isRunning && !gameState.isPaused) pauseGame();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'ArrowLeft':  case 'KeyA': keyState.left  = false; break;
        case 'ArrowRight': case 'KeyD': keyState.right = false; break;
    }
});

window.addEventListener('resize', () => {
    resizeCanvas();
});

window.addEventListener('online', () => {
    leaderboardManager.renderLeaderboard();
    // Retry Unity Ads if it failed to initialize due to no internet at startup
    unityAds.onInternetRestored();
});

window.addEventListener('offline', () => {
    leaderboardManager.renderLeaderboard();
});

// ─── Canvas context lost / restored ──────────────────────────────────────────
canvas.addEventListener('contextlost', (e) => {
    e.preventDefault();
    if (gameState.isRunning && !gameState.isPaused) pauseGame();
}, false);

canvas.addEventListener('contextrestored', () => {
    resizeCanvas();
    if (gameState.isPaused) {
        lastTime = performance.now();
        resumeGame();
    }
}, false);

resizeCanvas();
leaderboardManager.renderLeaderboard();

// Initialize Ad Debug Panel
adDebug.init();

// Initialize Unity Ads — Game ID 6082243
unityAds.init();

