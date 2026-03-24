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

    // Hide splash after 3s (gives loading bar animation time to finish)
    const splashTimer = setTimeout(hideSplash, 3000);

    // Also hide immediately if all assets are already cached (fast load)
    if (document.readyState === 'complete') {
        clearTimeout(splashTimer);
        setTimeout(hideSplash, 2200);
    } else {
        window.addEventListener('load', function() {
            clearTimeout(splashTimer);
            setTimeout(hideSplash, 2200);
        }, { once: true });
    }
})();
// ─────────────────────────────────────────────────────────────────────────────

// ─── AdMob Manager (Android only) ────────────────────────────────────────────
const ADMOB_BANNER_ID       = 'ca-app-pub-9600331042737400/6924594128';
const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-9600331042737400/3978866581';

// Real ad unit IDs — production mode
const ADMOB_TESTING = false;

const adMob = {
    ready: false,
    initializing: false,
    interstitialLoaded: false,
    gameOverCount: 0,
    bannerVisible: false,
    consentObtained: false,

    isNative() {
        return !!(window.Capacitor &&
                  window.Capacitor.isNativePlatform &&
                  window.Capacitor.isNativePlatform());
    },

    getPlugin() {
        return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
    },

    // ── GDPR / UMP Consent (required by AdMob policy) ──────────────────────
    async requestConsent() {
        const AdMob = this.getPlugin();
        if (!AdMob || typeof AdMob.requestConsentInfo !== 'function') {
            this.consentObtained = true;
            return;
        }
        try {
            const consentInfo = await AdMob.requestConsentInfo({
                debugGeography: 0,       // 0 = DISABLED — use real geography
                testDeviceIdentifiers: []
            });
            console.log('AdMob consent status:', consentInfo.status);
            // status: 0=UNKNOWN, 1=REQUIRED, 2=NOT_REQUIRED, 3=OBTAINED
            if (consentInfo.isConsentFormAvailable && consentInfo.status === 1) {
                const result = await AdMob.showConsentForm();
                console.log('AdMob consent form result:', result.status);
            }
            this.consentObtained = true;
        } catch (e) {
            console.warn('AdMob consent error:', e);
            // Allow ads to continue — non-personalized ads will be served
            this.consentObtained = true;
        }
    },

    async init(retryCount = 0) {
        if (!this.isNative()) return;
        if (this.ready || this.initializing) return;
        if (!navigator.onLine) {
            console.log('AdMob: no internet, will retry when online');
            return;
        }
        const AdMob = this.getPlugin();
        if (!AdMob) { console.warn('AdMob plugin not found'); return; }

        this.initializing = true;
        try {
            // Step 1: Initialize the SDK
            await AdMob.initialize({
                initializeForTesting: ADMOB_TESTING,
                tagForChildDirectedTreatment: false,
                tagForUnderAgeOfConsent: false,
                requestTrackingAuthorization: false
            });

            // Step 2: Request GDPR/UMP consent before showing any ads
            await this.requestConsent();

            this.ready = true;
            this.initializing = false;
            console.log('AdMob initialized successfully');

            // Step 3: Show ads only after consent is handled
            await this.showBanner();
            await this.loadInterstitial();
        } catch (e) {
            this.initializing = false;
            console.warn('AdMob init error:', e);
            if (retryCount < 3 && navigator.onLine) {
                const delay = Math.pow(2, retryCount) * 2000;
                console.log(`AdMob: retrying in ${delay}ms (attempt ${retryCount + 1})`);
                setTimeout(() => this.init(retryCount + 1), delay);
            }
        }
    },

    async showBanner() {
        if (!this.ready || this.bannerVisible) return;
        const AdMob = this.getPlugin();
        if (!AdMob) return;
        try {
            await AdMob.showBanner({
                adId: ADMOB_BANNER_ID,
                adSize: 'BANNER',
                position: 'BOTTOM_CENTER',
                margin: 0,
                isTesting: ADMOB_TESTING
            });
            this.bannerVisible = true;
        } catch (e) {
            console.warn('AdMob banner error:', e);
        }
    },

    async hideBanner() {
        if (!this.ready || !this.bannerVisible) return;
        const AdMob = this.getPlugin();
        if (!AdMob) return;
        try {
            await AdMob.hideBanner();
            this.bannerVisible = false;
        } catch (e) { /* silent */ }
    },

    async loadInterstitial() {
        if (!this.ready) return;
        const AdMob = this.getPlugin();
        if (!AdMob) return;
        try {
            await AdMob.prepareInterstitial({
                adId: ADMOB_INTERSTITIAL_ID,
                isTesting: ADMOB_TESTING
            });
            this.interstitialLoaded = true;
        } catch (e) {
            console.warn('AdMob interstitial load error:', e);
            this.interstitialLoaded = false;
        }
    },

    async showInterstitialIfReady() {
        if (!this.ready) return;
        this.gameOverCount++;
        // Show interstitial every 5 game overs
        if (this.gameOverCount % 5 === 0 && this.interstitialLoaded) {
            const AdMob = this.getPlugin();
            if (!AdMob) return;
            try {
                this.interstitialLoaded = false;
                await AdMob.showInterstitial();
            } catch (e) {
                console.warn('AdMob interstitial show error:', e);
            } finally {
                // Always pre-load next interstitial after showing
                await this.loadInterstitial();
            }
        }
    },

    // Called when internet connection is restored
    async onInternetRestored() {
        if (!this.isNative()) return;
        if (!this.ready) {
            await this.init();
        } else {
            if (!this.bannerVisible) {
                await this.showBanner();
            }
            if (!this.interstitialLoaded) {
                await this.loadInterstitial();
            }
        }
    }
};

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
    { emoji: '💀', type: 'skull', damage: 0, penalty: -50 }
];

const difficultySettings = {
    easy: { 
        lives: 5, 
        baseSpeed: 7.0, 
        spawnInterval: 1200, 
        bombChance: 0.13,
        speedIncrement: 1.0,
        label: 'EASY'
    },
    medium: { 
        lives: 3, 
        baseSpeed: 10.5, 
        spawnInterval: 850, 
        bombChance: 0.22,
        speedIncrement: 1.4,
        label: 'MEDIUM'
    },
    hard: { 
        lives: 2, 
        baseSpeed: 15.0, 
        spawnInterval: 550, 
        bombChance: 0.32,
        speedIncrement: 1.9,
        label: 'HARD'
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
    weather: 'clear',
    dayPhase: 0
};

let basket = { x: 0, y: 0, width: 80, height: 50, targetX: 0 };
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

const SWIPER_HEIGHT = 0;
const BASKET_OFFSET = 95;

let displayWidth = window.innerWidth;
let displayHeight = window.innerHeight;


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
        const stored = localStorage.getItem('fruitCatcherLeaderboard');
        if (stored) {
            return JSON.parse(stored);
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
        
        localStorage.setItem('fruitCatcherLeaderboard', JSON.stringify(this.leaderboard));
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

        // Show top 5 entries + current user if outside top 5
        const SHOW = 5;
        const top5 = this.leaderboard.slice(0, SHOW);
        const userIndex = this.leaderboard.findIndex(p => p.name === this.playerName);
        const userInTop = userIndex !== -1 && userIndex < SHOW;
        const rankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';

        let html = '';
        top5.forEach((player, i) => {
            const isCurrentUser = player.name === this.playerName;
            html += `<div class="leaderboard-item top-3 ${isCurrentUser ? 'current-user' : ''}">
                    <div class="leaderboard-rank ${rankClass(i)}">${player.rank}</div>
                    <div class="leaderboard-name">${player.name}</div>
                    <div class="leaderboard-score">${player.score.toLocaleString()}</div>
                </div>`;
        });

        // Show current user row if not already visible
        if (!userInTop && userIndex !== -1) {
            const player = this.leaderboard[userIndex];
            html += `<div class="leaderboard-item current-user" style="border-top:1px solid rgba(74,222,128,0.12);margin-top:2px;">
                    <div class="leaderboard-rank normal">${player.rank}</div>
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
    const dpr = window.devicePixelRatio || 1;
    const headerEl = document.getElementById('game-header');
    const headerHeight = (headerEl && gameScreen && !gameScreen.classList.contains('hidden'))
        ? headerEl.offsetHeight
        : 0;

    displayWidth = window.innerWidth;
    displayHeight = window.innerHeight - headerHeight;

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

    basket.width = Math.min(displayWidth * 0.17, 76);
    basket.height = basket.width * 0.65;
    basket.y = displayHeight - basket.height - SWIPER_HEIGHT - BASKET_OFFSET;
    basket.x = (displayWidth - basket.width) / 2;
    basket.targetX = basket.x;

    initBackgroundStars();
    initRainDrops();
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

    // ── HEAD ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#f5cba7';
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Hair cap
    ctx.fillStyle = '#6B3A1F';
    ctx.beginPath();
    ctx.arc(cx, headCY - 1 * s, headR + 1.5, Math.PI, 2 * Math.PI);
    ctx.fill();
    // Side hair
    ctx.fillStyle = '#6B3A1F';
    ctx.beginPath();
    ctx.ellipse(cx - headR + 1 * s, headCY + 4 * s, 4 * s, 8 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + headR - 1 * s, headCY + 4 * s, 4 * s, 8 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Pigtail bunches
    ctx.beginPath();
    ctx.arc(cx - headR - 2 * s, headCY + 1 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + headR + 2 * s, headCY + 1 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Ribbons
    ctx.fillStyle = '#ff3399';
    ctx.beginPath();
    ctx.arc(cx - headR - 2 * s, headCY - 4 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + headR + 2 * s, headCY - 4 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#2c1a0e';
    ctx.beginPath();
    ctx.ellipse(cx - 4 * s, headCY + 0.5 * s, 2.2 * s, 2.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 4 * s, headCY + 0.5 * s, 2.2 * s, 2.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx - 2.8 * s, headCY - 0.8 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 5.2 * s, headCY - 0.8 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // Cheeks
    ctx.fillStyle = 'rgba(255,100,130,0.32)';
    ctx.beginPath();
    ctx.ellipse(cx - 7 * s, headCY + 4 * s, 4.5 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 7 * s, headCY + 4 * s, 4.5 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#b03060';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.arc(cx, headCY + 4 * s, 4 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // ── Shield aura ───────────────────────────────────────────────────
    if (gameState.hasShield) {
        const auraH = girlFeetY + 3 - (headCY - headR - 4);
        ctx.strokeStyle = 'rgba(80,220,255,0.95)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(80,220,255,0.85)';
        ctx.beginPath();
        ctx.ellipse(cx, (headCY - headR + girlFeetY) / 2, bw / 1.3 + 14, auraH / 2 + 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
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
    const difficultyMultiplier = Math.min(gameState.level * 0.025, 0.20);
    // Fruits shrink as level goes up (harder to catch)
    const sizeShrink = Math.max(0.65, 1 - gameState.level * 0.025);
    // Zigzag kicks in from level 3 onwards
    const zigzagStrength = gameState.level >= 3 ? Math.min((gameState.level - 2) * 0.3, 2.5) : 0;
    const hasZigzag = zigzagStrength > 0 && Math.random() < 0.5;
    
    if (rand < settings.bombChance + difficultyMultiplier) {
        const maxBadIndex = Math.min(badItems.length, 1 + Math.floor(gameState.level / 3));
        const badItem = badItems[Math.floor(Math.random() * maxBadIndex)];
        item = {
            ...badItem,
            x: Math.random() * (displayWidth - 50) + 25,
            y: -50,
            size: Math.round((38 + Math.random() * 8) * sizeShrink),
            speed: settings.baseSpeed + levelSpeedBonus + Math.random() * 2.5,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.18,
            isBad: true,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.06 + Math.random() * 0.06,
            vx: hasZigzag ? (Math.random() - 0.5) * zigzagStrength * 2 : 0,
            zigzag: hasZigzag,
            zigzagPhase: Math.random() * Math.PI * 2,
            zigzagSpeed: 0.04 + Math.random() * 0.03,
            zigzagAmp: zigzagStrength * 1.5
        };
    } else if (rand < settings.bombChance + difficultyMultiplier + 0.08) {
        const special = specialItems[Math.floor(Math.random() * specialItems.length)];
        item = {
            ...special,
            x: Math.random() * (displayWidth - 50) + 25,
            y: -50,
            size: Math.round(44 * sizeShrink),
            speed: settings.baseSpeed + levelSpeedBonus * 0.7 + Math.random() * 1.5,
            rotation: 0,
            rotationSpeed: 0.05,
            isSpecial: true,
            glow: 0,
            glowDir: 1,
            vx: 0,
            zigzag: false
        };
    } else {
        const maxFruitIndex = Math.min(fruitTypes.length, 6 + Math.floor(gameState.level / 2));
        const fruit = fruitTypes[Math.floor(Math.random() * maxFruitIndex)];
        item = {
            ...fruit,
            x: Math.random() * (displayWidth - 50) + 25,
            y: -50,
            size: Math.round((42 + Math.random() * 10) * sizeShrink),
            speed: settings.baseSpeed + levelSpeedBonus + Math.random() * 2.5,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.12,
            isFruit: true,
            vx: hasZigzag ? (Math.random() - 0.5) * zigzagStrength * 1.5 : 0,
            zigzag: hasZigzag,
            zigzagPhase: Math.random() * Math.PI * 2,
            zigzagSpeed: 0.035 + Math.random() * 0.025,
            zigzagAmp: zigzagStrength
        };
    }
    
    fallingItems.push(item);
}

function drawItem(item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    
    if (item.wobble !== undefined) {
        item.wobble += item.wobbleSpeed;
    }
    
    ctx.rotate(item.rotation);
    
    if (item.isSpecial) {
        item.glow += 0.1 * item.glowDir;
        if (item.glow > 1 || item.glow < 0) item.glowDir *= -1;
        ctx.shadowBlur = 18 + item.glow * 14;
        ctx.shadowColor = item.type === 'diamond' ? '#00ffff' : 
                          item.type === 'golden'  ? '#ffd700' : 
                          item.type === 'freeze'  ? '#87ceeb' :
                          item.type === 'magnet'  ? '#ff6b6b' :
                          item.type === 'shield'  ? '#64b5f6' : '#ffff00';
    } else if (item.isBad) {
        ctx.shadowBlur = 14;
        ctx.shadowColor = 'rgba(255,50,50,0.85)';
    } else {
        // Glowing fruits — color based on point value
        const pts = item.points || 10;
        if (pts >= 35) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(255,100,200,0.7)';
        } else if (pts >= 20) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(255,200,50,0.55)';
        } else {
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(100,255,150,0.4)';
        }
    }
    
    ctx.font = `${item.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, 0, 0);
    ctx.shadowBlur = 0;
    
    ctx.restore();
}

function updateItems(dtFactor = 1) {
    const speedMultiplier = (gameState.freezeActive ? 0.3 : 1) * dtFactor;
    
    for (let i = fallingItems.length - 1; i >= 0; i--) {
        const item = fallingItems[i];
        item.y += item.speed * speedMultiplier;
        item.rotation += item.rotationSpeed * speedMultiplier;

        // Zigzag horizontal movement
        if (item.zigzag) {
            item.zigzagPhase += item.zigzagSpeed * speedMultiplier;
            item.x += Math.sin(item.zigzagPhase) * item.zigzagAmp * speedMultiplier;
            // Keep inside canvas bounds
            item.x = Math.max(item.size / 2, Math.min(displayWidth - item.size / 2, item.x));
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
                    if (damage > 0) {
                        gameState.lives -= damage;
                        audio.play('bomb');
                        screenShakeMag = 14;
                    } else {
                        audio.play('bomb');
                        screenShakeMag = 8;
                    }
                    gameState.score = Math.max(0, gameState.score + item.penalty);
                    gameState.combo = 0;
                    createParticles(item.x, item.y, '#ff4444', 28, 'explosion');
                    createParticles(item.x, item.y, '#ff8800', 12, 'explosion');
                    createFloatingText(item.x, item.y, item.penalty.toString(), '#ff4444', 32);
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

                const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#ff9ff3'];
                const col = colors[Math.floor(Math.random() * colors.length)];
                createParticles(item.x, item.y, col, 16);
                createParticles(item.x, item.y, '#ffffff', 4);
                createFloatingText(item.x, item.y, `+${points}`, '#4ade80');
                audio.play('catch');
            }
            
            fallingItems.splice(i, 1);
            updateUI();
            
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

function updateParticles(dtFactor = 1) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dtFactor;
        p.y += p.vy * dtFactor;
        p.vy += 0.2 * dtFactor;
        p.life -= p.decay * dtFactor;
        p.size *= Math.pow(0.97, dtFactor);
        
        if (p.life <= 0 || p.size < 0.5) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function updateFloatingTexts(dtFactor = 1) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy * dtFactor;
        ft.vy *= Math.pow(0.95, dtFactor);
        ft.life -= 0.02 * dtFactor;
        
        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
}

function drawFloatingTexts() {
    floatingTexts.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.life;
        ctx.font = `bold ${ft.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    });
}

function updateWeather(timestamp) {
    if (timestamp - weatherChangeTime > 30000) {
        const weathers = ['clear', 'rain', 'night'];
        gameState.weather = weathers[Math.floor(Math.random() * weathers.length)];
        weatherChangeTime = timestamp;
        
        if (gameState.weather === 'rain') {
            initRainDrops();
        }
    }
    
    gameState.dayPhase = (gameState.dayPhase + 0.0005) % 1;
}

function drawBackground() {
    const time = Date.now() / 1000;
    const isNight = gameState.weather === 'night' || gameState.dayPhase > 0.7;
    
    const skyGradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
    
    if (isNight) {
        skyGradient.addColorStop(0, '#0a0a1a');
        skyGradient.addColorStop(0.3, '#1a1a3e');
        skyGradient.addColorStop(0.6, '#2a2a4e');
        skyGradient.addColorStop(1, '#1a3a2a');
    } else if (gameState.weather === 'rain') {
        skyGradient.addColorStop(0, '#4a5568');
        skyGradient.addColorStop(0.3, '#718096');
        skyGradient.addColorStop(0.6, '#a0aec0');
        skyGradient.addColorStop(1, '#2d5a27');
    } else if (gameState.dayPhase > 0.5) {
        skyGradient.addColorStop(0, '#ff7e5f');
        skyGradient.addColorStop(0.3, '#feb47b');
        skyGradient.addColorStop(0.6, '#98d8c8');
        skyGradient.addColorStop(1, '#2d5a27');
    } else {
        skyGradient.addColorStop(0, '#87ceeb');
        skyGradient.addColorStop(0.4, '#98d8c8');
        skyGradient.addColorStop(0.7, '#90EE90');
        skyGradient.addColorStop(1, '#228B22');
    }
    
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    if (isNight) {
        backgroundStars.forEach(star => {
            star.twinkle += star.speed;
            const alpha = 0.2 + Math.sin(star.twinkle) * 0.8;
            // Colorize some stars
            const hue = (star.x * 1.3 + star.y * 0.7) % 360;
            ctx.fillStyle = hue % 60 < 10 ? `rgba(200,220,255,${alpha})` : `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        drawShootingStars();
        
        ctx.fillStyle = '#fffde7';
        ctx.beginPath();
        ctx.arc(displayWidth - 60, 60, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0a1a';
        ctx.beginPath();
        ctx.arc(displayWidth - 50, 55, 20, 0, Math.PI * 2);
        ctx.fill();
    } else if (!isNight && gameState.weather !== 'rain') {
        ctx.fillStyle = '#fff59d';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(80, 80, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    if (gameState.weather !== 'rain' || !isNight) {
        for (let i = 0; i < 4; i++) {
            const cloudX = ((time * 15 + i * 150) % (displayWidth + 200)) - 100;
            const cloudY = 40 + i * 35 + Math.sin(time + i) * 5;
            drawCloud(cloudX, cloudY, gameState.weather === 'rain' ? 0.4 : 0.7);
        }
    }
    
    if (gameState.weather === 'rain') {
        drawRain();
        
        if (Math.random() < 0.005) {
            lightning.active = true;
            lightning.alpha = 1;
        }
        
        if (lightning.active) {
            ctx.fillStyle = `rgba(255, 255, 255, ${lightning.alpha})`;
            ctx.fillRect(0, 0, displayWidth, displayHeight);
            lightning.alpha -= 0.1;
            if (lightning.alpha <= 0) {
                lightning.active = false;
            }
        }
    }
    
    const groundY = displayHeight - SWIPER_HEIGHT - 20;
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.moveTo(0, displayHeight);
    for (let x = 0; x <= displayWidth; x += 20) {
        ctx.lineTo(x, groundY - Math.sin(x * 0.05 + time) * 5);
    }
    ctx.lineTo(displayWidth, displayHeight);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#32CD32';
    ctx.fillRect(0, groundY + 5, displayWidth, displayHeight - groundY);
    
    if (gameState.freezeActive) {
        ctx.fillStyle = 'rgba(135, 206, 235, 0.2)';
        ctx.fillRect(0, 0, displayWidth, displayHeight);
    }
}

function drawCloud(x, y, alpha = 0.8) {
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 30, y - 10, 30, 0, Math.PI * 2);
    ctx.arc(x + 60, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 30, y + 10, 22, 0, Math.PI * 2);
    ctx.fill();
}

function drawRain() {
    ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
    ctx.lineWidth = 1;
    
    for (let drop of rainDrops) {
        ctx.globalAlpha = drop.opacity;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 2, drop.y + drop.length);
        ctx.stroke();
        
        drop.y += drop.speed;
        drop.x -= 1;
        
        if (drop.y > displayHeight) {
            drop.y = -drop.length;
            drop.x = Math.random() * displayWidth;
        }
    }
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
    ctx.shadowBlur = 4;
    ctx.shadowColor = color;
    ctx.fillText(`${emoji} ${label}`, x + 8, yOffset + h / 2);
    ctx.shadowBlur = 0;
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
    scoreDisplay.textContent = `Score: ${gameState.score}`;
    livesDisplay.textContent = '❤️'.repeat(Math.max(0, gameState.lives));
    levelDisplay.textContent = `Level: ${gameState.level}`;
    
    if (comboDisplay) {
        if (gameState.combo > 1) {
            comboDisplay.textContent = `${gameState.combo}x Combo!`;
            comboDisplay.style.display = 'block';
        } else {
            comboDisplay.style.display = 'none';
        }
    }
}

function gameLoop(timestamp) {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    const rawDelta = timestamp - lastTime;
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

    updateWeather(timestamp);
    drawBackground();
    
    const settings = difficultySettings[selectedDifficulty];
    const newLevel = Math.floor(gameState.score / 250) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        audio.play('levelup');
        createFloatingText(displayWidth / 2, displayHeight / 2, `LEVEL ${gameState.level}!`, '#ffd700', 44);
        createFloatingText(displayWidth / 2, displayHeight / 2 + 50, '⚡ Faster!', '#ff9500', 30);
        spawnInterval = Math.max(380, settings.spawnInterval - (gameState.level * 70));
        lastSpawnTime = timestamp;
    }
    
    if (timestamp - lastSpawnTime > spawnInterval) {
        const extraCount = gameState.level >= 8 ? 2 : gameState.level >= 5 ? 1 : 0;
        spawnItem();
        for (let e = 0; e < extraCount; e++) spawnItem();
        lastSpawnTime = timestamp;
    }
    
    basket.x += (basket.targetX - basket.x) * Math.min(0.92 * dtFactor, 1);
    
    updateItems(dtFactor);
    updateParticles(dtFactor);
    updateFloatingTexts(dtFactor);
    
    fallingItems.forEach(drawItem);
    drawParticles();
    drawCharacter();
    drawFloatingTexts();
    drawPowerUpIndicators();

    // Danger overlay — pulsing red vignette when lives <= 1
    if (gameState.lives <= 1) {
        dangerFlash += 0.07 * dtFactor;
        const dangerAlpha = 0.12 + Math.sin(dangerFlash) * 0.1;
        const vignette = ctx.createRadialGradient(
            displayWidth / 2, displayHeight / 2, displayHeight * 0.2,
            displayWidth / 2, displayHeight / 2, displayHeight * 0.8
        );
        vignette.addColorStop(0, `rgba(255,0,0,0)`);
        vignette.addColorStop(1, `rgba(255,0,0,${dangerAlpha})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, displayWidth, displayHeight);
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
    adMob.hideBanner();
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
        weather: 'clear',
        dayPhase: 0
    };
    
    fallingItems = [];
    particles = [];
    floatingTexts = [];
    shootingStars = [];
    lastSpawnTime = 0;
    spawnInterval = settings.spawnInterval;
    lastTime = performance.now();
    weatherChangeTime = 0;
    dangerFlash = 0;
    catchFlash = 0;
    screenShakeX = 0;
    screenShakeY = 0;
    screenShakeMag = 0;
    
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
    animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
    gameState.isRunning = false;
    cancelAnimationFrame(animationId);
    audio.play('gameover');
    adMob.showBanner();
    adMob.showInterstitialIfReady();
    
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
    adMob.showBanner();

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

window.addEventListener('resize', () => {
    resizeCanvas();
});

window.addEventListener('online', () => {
    leaderboardManager.renderLeaderboard();
    // Retry AdMob if it failed to initialize due to no internet at startup
    adMob.onInternetRestored();
});

window.addEventListener('offline', () => {
    leaderboardManager.renderLeaderboard();
});

resizeCanvas();
leaderboardManager.renderLeaderboard();

// Initialize AdMob (only runs inside native Android app, silently skipped on web)
adMob.init();
