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
        if (this.gameOverCount % 5 !== 0) return;
        if (this._isNative() && window.NativeUnityAds.isVideoReady()) {
            window.NativeUnityAds.showVideo();
        }
    },

    onInternetRestored() {
        if (this._isNative() && !this.ready) this.init();
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
    weather: 'clear',
    dayPhase: 0
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
let pendingSpawns = [];
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

    // Choose X with firm spacing from all existing items near the top
    let spawnX;
    const minSpacing = 120;
    let attempts = 0;
    do {
        spawnX = Math.random() * (displayWidth - 120) + 60;
        attempts++;
    } while (
        attempts < 16 &&
        fallingItems.some(fi => Math.abs(fi.x - spawnX) < minSpacing && fi.y < displayHeight * 0.55)
    );

    const baseY = -55;

    if (rand < settings.bombChance + difficultyMultiplier) {
        const maxBadIndex = Math.min(badItems.length, 1 + Math.floor(gameState.level / 5));
        const badItem = badItems[Math.floor(Math.random() * maxBadIndex)];
        item = {
            ...badItem,
            x: spawnX,
            y: baseY,
            size: Math.round(44 + Math.random() * 6),
            speed: settings.baseSpeed + levelSpeedBonus + Math.random() * 1.2,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.10,
            isBad: true,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.05 + Math.random() * 0.05,
            vx: hasZigzag ? (Math.random() - 0.5) * zigzagStrength * 1.5 : 0,
            zigzag: hasZigzag,
            zigzagPhase: Math.random() * Math.PI * 2,
            zigzagSpeed: 0.035 + Math.random() * 0.025,
            zigzagAmp: zigzagStrength * 1.2
        };
    } else if (rand < settings.bombChance + difficultyMultiplier + 0.08) {
        const special = specialItems[Math.floor(Math.random() * specialItems.length)];
        item = {
            ...special,
            x: spawnX,
            y: baseY,
            size: 50,
            speed: settings.baseSpeed + levelSpeedBonus * 0.65 + Math.random() * 0.8,
            rotation: 0,
            rotationSpeed: 0.04,
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
            x: spawnX,
            y: baseY,
            size: Math.round(54 + Math.random() * 10),
            speed: settings.baseSpeed + levelSpeedBonus + Math.random() * 1.2,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.09,
            isFruit: true,
            vx: hasZigzag ? (Math.random() - 0.5) * zigzagStrength * 1.2 : 0,
            zigzag: hasZigzag,
            zigzagPhase: Math.random() * Math.PI * 2,
            zigzagSpeed: 0.03 + Math.random() * 0.02,
            zigzagAmp: zigzagStrength * 0.9
        };
    }

    fallingItems.push(item);
}

// ─── Canvas shape renderers (no emoji — works on all Android WebViews) ─────

function _fGlow(color, r) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1.0;
}
function _fCircleGrad(c1, c2, r) {
    const g = ctx.createRadialGradient(-r*0.3,-r*0.3,r*0.05,0,0,r);
    g.addColorStop(0,c1); g.addColorStop(1,c2);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
}
function _fShine(r) {
    ctx.fillStyle='rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(-r*0.25,-r*0.3,r*0.26,r*0.16,-0.5,0,Math.PI*2); ctx.fill();
}
function _fStem(r,c='#388e3c') {
    ctx.strokeStyle=c; ctx.lineWidth=r*0.14; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,-r); ctx.quadraticCurveTo(r*0.3,-r*1.35,r*0.15,-r*1.55); ctx.stroke();
}
function _fLeaf(r) {
    ctx.fillStyle='#4caf50';
    ctx.beginPath(); ctx.ellipse(r*0.35,-r*1.1,r*0.32,r*0.16,0.6,0,Math.PI*2); ctx.fill();
}
function _drawStar5(r,c1,c2,inner=0.44) {
    const g=ctx.createRadialGradient(0,0,r*0.1,0,0,r);
    g.addColorStop(0,c1); g.addColorStop(1,c2);
    ctx.fillStyle=g; ctx.beginPath();
    for(let i=0;i<10;i++){
        const a=(i*Math.PI/5)-Math.PI/2;
        const rad=i%2===0?r:r*inner;
        i===0?ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad):ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);
    }
    ctx.closePath(); ctx.fill();
}

function _drawItemShape(item) {
    const r = item.size * 0.46;
    const n = item.name || '';
    const t = item.type || '';

    if (item.isBad) {
        if (t === 'bomb') {
            ctx.fillStyle='#37474f'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#78909c'; ctx.beginPath(); ctx.arc(-r*0.28,-r*0.28,r*0.22,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='#8d6e63'; ctx.lineWidth=r*0.12; ctx.lineCap='round';
            ctx.beginPath(); ctx.moveTo(r*0.5,-r*0.5); ctx.quadraticCurveTo(r*0.35,-r*0.9,r*0.55,-r*1.1); ctx.stroke();
            ctx.fillStyle='#ffeb3b'; ctx.beginPath(); ctx.arc(r*0.55,-r*1.1,r*0.14,0,Math.PI*2); ctx.fill();
        } else if (t === 'fire') {
            ctx.fillStyle='#ff6f00';
            ctx.beginPath(); ctx.moveTo(0,r); ctx.bezierCurveTo(-r*1.1,r*0.2,-r*0.5,-r*0.4,-r*0.1,-r);
            ctx.bezierCurveTo(r*0.05,-r*0.1,r*0.1,-r*0.7,r*0.2,-r*0.9);
            ctx.bezierCurveTo(r*0.8,-r*0.2,r*1.1,r*0.3,r,r); ctx.closePath(); ctx.fill();
            ctx.fillStyle='#ffcc02';
            ctx.beginPath(); ctx.moveTo(0,r*0.4); ctx.bezierCurveTo(-r*0.45,r*0.1,-r*0.35,-r*0.5,-r*0.05,-r*0.6);
            ctx.bezierCurveTo(r*0.05,0,r*0.15,-r*0.55,r*0.15,-r*0.65);
            ctx.bezierCurveTo(r*0.45,-r*0.1,r*0.5,r*0.2,r*0.3,r*0.4); ctx.closePath(); ctx.fill();
        } else if (t === 'skull') {
            ctx.fillStyle='#f5f5f5'; ctx.beginPath(); ctx.arc(0,-r*0.1,r*0.88,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(0,r*0.52,r*0.52,0,Math.PI); ctx.fill();
            ctx.fillStyle='#222';
            ctx.beginPath(); ctx.ellipse(-r*0.3,-r*0.15,r*0.22,r*0.27,0,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(r*0.3,-r*0.15,r*0.22,r*0.27,0,0,Math.PI*2); ctx.fill();
            [-r*0.32,0,r*0.32].forEach(x=>{ctx.fillStyle='#222'; ctx.fillRect(x-r*0.09,r*0.27,r*0.17,r*0.22);});
        } else { // scorpion
            const sc = '#c62828', sl = '#b71c1c', ss = '#ff1744';
            // Glow aura
            ctx.fillStyle='rgba(198,40,40,0.22)'; ctx.beginPath(); ctx.arc(0,0,r*1.22,0,Math.PI*2); ctx.fill();
            // Body segments
            ctx.fillStyle=sc;
            ctx.beginPath(); ctx.ellipse(0,r*0.18,r*0.52,r*0.38,0,0,Math.PI*2); ctx.fill();
            ctx.fillStyle=sl;
            ctx.beginPath(); ctx.ellipse(0,-r*0.28,r*0.38,r*0.3,0,0,Math.PI*2); ctx.fill();
            // Head
            ctx.fillStyle=sc;
            ctx.beginPath(); ctx.ellipse(0,-r*0.68,r*0.24,r*0.2,0,0,Math.PI*2); ctx.fill();
            // Eyes
            ctx.fillStyle=ss;
            ctx.beginPath(); ctx.arc(-r*0.1,-r*0.72,r*0.07,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(r*0.1,-r*0.72,r*0.07,0,Math.PI*2); ctx.fill();
            // Claws (left & right)
            ctx.strokeStyle=sc; ctx.lineWidth=r*0.18; ctx.lineCap='round';
            ctx.beginPath(); ctx.moveTo(-r*0.38,-r*0.3); ctx.quadraticCurveTo(-r*0.9,-r*0.5,-r*0.82,-r*0.82); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(r*0.38,-r*0.3); ctx.quadraticCurveTo(r*0.9,-r*0.5,r*0.82,-r*0.82); ctx.stroke();
            // Claw pincers
            ctx.lineWidth=r*0.13;
            ctx.beginPath(); ctx.moveTo(-r*0.82,-r*0.82); ctx.lineTo(-r*1.05,-r*0.7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-r*0.82,-r*0.82); ctx.lineTo(-r*0.72,-r*1.02); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(r*0.82,-r*0.82); ctx.lineTo(r*1.05,-r*0.7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(r*0.82,-r*0.82); ctx.lineTo(r*0.72,-r*1.02); ctx.stroke();
            // Tail (curved upward with stinger)
            ctx.strokeStyle=sl; ctx.lineWidth=r*0.2; ctx.lineCap='round';
            ctx.beginPath(); ctx.moveTo(0,r*0.52); ctx.quadraticCurveTo(r*0.7,r*0.7,r*0.85,r*0.2); ctx.quadraticCurveTo(r,r*-0.1,r*0.6,-r*0.5); ctx.stroke();
            // Stinger tip
            ctx.fillStyle=ss;
            ctx.beginPath(); ctx.arc(r*0.6,-r*0.5,r*0.14,0,Math.PI*2); ctx.fill();
            // Legs (3 per side)
            ctx.strokeStyle=sl; ctx.lineWidth=r*0.09;
            [[-r*0.25,r*0.05],[-r*0.35,r*0.22],[-r*0.28,r*0.4]].forEach(([lx,ly])=>{
                ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx-r*0.4,ly-r*0.18); ctx.stroke();
            });
            [[r*0.25,r*0.05],[r*0.35,r*0.22],[r*0.28,r*0.4]].forEach(([lx,ly])=>{
                ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx+r*0.4,ly-r*0.18); ctx.stroke();
            });
        }
    } else if (item.isSpecial) {
        if (t === 'star') {
            _drawStar5(r,'#fff176','#f9a825'); _fShine(r);
        } else if (t === 'diamond') {
            const g=ctx.createLinearGradient(-r,0,r,0);
            g.addColorStop(0,'#4fc3f7'); g.addColorStop(0.45,'#e0f7fa'); g.addColorStop(1,'#0288d1');
            ctx.fillStyle=g; ctx.beginPath();
            ctx.moveTo(0,-r); ctx.lineTo(r*0.72,0); ctx.lineTo(0,r); ctx.lineTo(-r*0.72,0);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle='rgba(255,255,255,0.55)';
            ctx.beginPath(); ctx.moveTo(0,-r); ctx.lineTo(r*0.36,-r*0.18); ctx.lineTo(0,0); ctx.lineTo(-r*0.36,-r*0.18); ctx.closePath(); ctx.fill();
        } else if (t === 'golden') {
            _drawStar5(r,'#ffee00','#ff8f00',0.36); _fShine(r);
        } else if (t === 'freeze') {
            ctx.fillStyle='#b3e5fc'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='#0288d1'; ctx.lineWidth=r*0.14; ctx.lineCap='round';
            for(let i=0;i<6;i++){
                const a=i*Math.PI/3;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*r*0.85,Math.sin(a)*r*0.85); ctx.stroke();
                const bx=Math.cos(a)*r*0.52, by=Math.sin(a)*r*0.52;
                const px=Math.cos(a+Math.PI/2)*r*0.22, py=Math.sin(a+Math.PI/2)*r*0.22;
                ctx.beginPath(); ctx.moveTo(bx+px,by+py); ctx.lineTo(bx-px,by-py); ctx.stroke();
            }
            ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(0,0,r*0.18,0,Math.PI*2); ctx.fill();
        } else if (t === 'magnet') {
            ctx.strokeStyle='#e53935'; ctx.lineWidth=r*0.42; ctx.lineCap='butt';
            ctx.beginPath(); ctx.arc(0,r*0.12,r*0.58,Math.PI,0); ctx.stroke();
            ctx.fillStyle='#e53935';
            ctx.fillRect(-r*0.79,-r*0.08,r*0.38,r*0.7); ctx.fillRect(r*0.41,-r*0.08,r*0.38,r*0.7);
            ctx.fillStyle='#bdbdbd';
            ctx.fillRect(-r*0.79,r*0.46,r*0.38,r*0.26); ctx.fillRect(r*0.41,r*0.46,r*0.38,r*0.26);
        } else { // shield
            const g=ctx.createLinearGradient(0,-r,0,r);
            g.addColorStop(0,'#1e88e5'); g.addColorStop(1,'#0d47a1');
            ctx.fillStyle=g; ctx.beginPath();
            ctx.moveTo(0,-r); ctx.lineTo(r,-r*0.5); ctx.lineTo(r,r*0.1);
            ctx.quadraticCurveTo(r,r*0.72,0,r); ctx.quadraticCurveTo(-r,r*0.72,-r,r*0.1);
            ctx.lineTo(-r,-r*0.5); ctx.closePath(); ctx.fill();
            ctx.fillStyle='rgba(255,255,255,0.65)';
            ctx.beginPath(); ctx.moveTo(-r*0.08,-r*0.52); ctx.lineTo(-r*0.38,-r*0.0); ctx.lineTo(-r*0.08,r*0.38); ctx.lineTo(r*0.22,-r*0.52); ctx.closePath(); ctx.fill();
        }
    } else {
        // Fruits (no glow — cleaner look + better performance)
        switch(n) {
            case 'Apple':
                _fCircleGrad('#ff5555','#b71c1c',r); _fShine(r); _fStem(r); _fLeaf(r); break;
            case 'Orange':
                _fCircleGrad('#ffb74d','#e65100',r);
                ctx.strokeStyle='rgba(220,100,0,0.3)'; ctx.lineWidth=r*0.07;
                for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(i*Math.PI/3)*r,Math.sin(i*Math.PI/3)*r);ctx.stroke();}
                _fShine(r); _fStem(r,'#5d4037'); break;
            case 'Lemon':
                ctx.fillStyle='#fff176'; ctx.save(); ctx.scale(1.22,0.88);
                ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill(); ctx.restore(); _fShine(r); break;
            case 'Grapes': {
                const gpos=[[-r*0.38,r*0.18],[r*0.38,r*0.18],[0,r*0.42],[-r*0.55,-r*0.12],[r*0.55,-r*0.12],[0,-r*0.38],[-r*0.18,-r*0.06],[r*0.18,-r*0.06]];
                ctx.fillStyle='#7b1fa2';
                gpos.forEach(([gx,gy])=>{ctx.beginPath();ctx.arc(gx,gy,r*0.32,0,Math.PI*2);ctx.fill();});
                ctx.fillStyle='rgba(255,255,255,0.22)';
                gpos.slice(0,5).forEach(([gx,gy])=>{ctx.beginPath();ctx.arc(gx-r*0.08,gy-r*0.1,r*0.1,0,Math.PI*2);ctx.fill();});
                ctx.strokeStyle='#4a148c'; ctx.lineWidth=r*0.09;
                ctx.beginPath(); ctx.moveTo(0,-r*0.72); ctx.lineTo(0,-r*0.5); ctx.stroke(); break;
            }
            case 'Strawberry':
                ctx.fillStyle='#e53935';
                ctx.beginPath(); ctx.moveTo(0,r); ctx.quadraticCurveTo(-r*1.1,r*0.1,-r*0.58,-r*0.5);
                ctx.quadraticCurveTo(0,-r*0.72,r*0.58,-r*0.5); ctx.quadraticCurveTo(r*1.1,r*0.1,0,r); ctx.fill();
                ctx.fillStyle='#fdd835';
                [[-r*0.25,-r*0.1],[r*0.2,-r*0.28],[0,r*0.15],[-r*0.15,r*0.35],[r*0.25,r*0.2]].forEach(([sx,sy])=>{
                    ctx.beginPath();ctx.ellipse(sx,sy,r*0.06,r*0.09,0.5,0,Math.PI*2);ctx.fill();
                });
                ctx.fillStyle='#4caf50';
                ctx.beginPath(); ctx.ellipse(0,-r*0.65,r*0.45,r*0.2,0,0,Math.PI*2); ctx.fill(); break;
            case 'Peach':
                _fCircleGrad('#ffccbc','#e64a19',r);
                ctx.strokeStyle='rgba(230,100,60,0.35)'; ctx.lineWidth=r*0.1;
                ctx.beginPath(); ctx.moveTo(0,-r*0.9); ctx.lineTo(0,r*0.8); ctx.stroke();
                _fShine(r); _fStem(r,'#5d4037'); break;
            case 'Mango':
                {const g=ctx.createRadialGradient(-r*0.2,-r*0.3,r*0.05,0,0,r*1.1);
                g.addColorStop(0,'#fff176'); g.addColorStop(0.5,'#ff9800'); g.addColorStop(1,'#e65100');
                ctx.fillStyle=g; ctx.save(); ctx.scale(0.84,1.2); ctx.beginPath(); ctx.arc(0,r*0.08,r,0,Math.PI*2); ctx.fill(); ctx.restore();}
                _fShine(r); _fStem(r,'#4caf50'); break;
            case 'Cherry': {
                const cr=r*0.52;
                ctx.fillStyle='#c62828';
                ctx.beginPath(); ctx.arc(-cr*0.58,cr*0.18,cr,0,Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(cr*0.58,cr*0.18,cr,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='rgba(255,255,255,0.3)';
                ctx.beginPath(); ctx.arc(-cr*0.78,-cr*0.02,cr*0.35,0,Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(cr*0.42,-cr*0.02,cr*0.35,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle='#388e3c'; ctx.lineWidth=r*0.1; ctx.lineCap='round';
                ctx.beginPath(); ctx.moveTo(-cr*0.58,-cr*0.7); ctx.quadraticCurveTo(0,-r*1.3,cr*0.58,-cr*0.7); ctx.stroke();
                ctx.fillStyle='#388e3c'; ctx.beginPath(); ctx.ellipse(0,-r*1.3,r*0.2,r*0.1,0.3,0,Math.PI*2); ctx.fill(); break;
            }
            case 'Banana':
                ctx.strokeStyle='#f9a825'; ctx.lineWidth=r*0.6; ctx.lineCap='round';
                ctx.beginPath(); ctx.moveTo(-r*0.62,r*0.38); ctx.quadraticCurveTo(0,-r*0.95,r*0.62,r*0.38); ctx.stroke();
                ctx.strokeStyle='#fdd835'; ctx.lineWidth=r*0.32;
                ctx.beginPath(); ctx.moveTo(-r*0.54,r*0.28); ctx.quadraticCurveTo(0,-r*0.76,r*0.54,r*0.28); ctx.stroke(); break;
            case 'Kiwi':
                ctx.fillStyle='#6d4c41'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#66bb6a'; ctx.beginPath(); ctx.arc(0,0,r*0.78,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle='#a5d6a7'; ctx.lineWidth=r*0.08;
                for(let i=0;i<6;i++){const a=i*Math.PI/3; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*r*0.72,Math.sin(a)*r*0.72); ctx.stroke();}
                ctx.fillStyle='#f5f5f5'; ctx.beginPath(); ctx.arc(0,0,r*0.18,0,Math.PI*2); ctx.fill(); break;
            case 'Watermelon':
                ctx.fillStyle='#2e7d32'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#a5d6a7'; ctx.beginPath(); ctx.arc(0,0,r*0.87,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#e53935'; ctx.beginPath(); ctx.arc(0,0,r*0.75,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#1a1a1a';
                [{x:-r*0.35,y:-r*0.22},{x:r*0.22,y:-r*0.38},{x:r*0.42,y:r*0.18},{x:-r*0.12,y:r*0.42},{x:-r*0.44,y:r*0.22}].forEach(p=>{
                    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(Math.atan2(p.y,p.x)+Math.PI/2);
                    ctx.beginPath(); ctx.ellipse(0,0,r*0.06,r*0.12,0,0,Math.PI*2); ctx.fill(); ctx.restore();
                }); break;
            default: // Pineapple + fallback
                {const g=ctx.createRadialGradient(-r*0.2,-r*0.25,r*0.05,0,0,r);
                g.addColorStop(0,'#fff176'); g.addColorStop(1,'#f57f17');
                ctx.fillStyle=g; ctx.save(); ctx.scale(0.82,1.18); ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill(); ctx.restore();}
                ctx.strokeStyle='rgba(180,100,0,0.3)'; ctx.lineWidth=r*0.07;
                for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*r*0.38,-r);ctx.lineTo(i*r*0.38+r*0.38,r);ctx.stroke();}
                for(let j=-2;j<=2;j++){ctx.beginPath();ctx.moveTo(-r,j*r*0.36);ctx.lineTo(r,j*r*0.36);ctx.stroke();}
                ctx.fillStyle='#388e3c';
                ctx.beginPath(); ctx.moveTo(-r*0.42,-r*0.9); ctx.bezierCurveTo(-r*0.7,-r*1.5,0,-r*1.8,0,-r*2.0);
                ctx.bezierCurveTo(0,-r*1.8,r*0.7,-r*1.5,r*0.42,-r*0.9); ctx.closePath(); ctx.fill(); break;
        }
    }
}

function drawItem(item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    if (item.wobble !== undefined) item.wobble += item.wobbleSpeed;
    ctx.rotate(item.rotation);

    const r = item.size * 0.5;

    if (item.isSpecial) {
        item.glow += 0.1 * item.glowDir;
        if (item.glow > 1 || item.glow < 0) item.glowDir *= -1;
        // Cheap pulsing glow: just a colored circle behind the emoji
        const pulse = 0.3 + item.glow * 0.35;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    } else if (item.isBad && item.type === 'scorpion') {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    } else if (item.isBad) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ff5500';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Draw emoji — no shadowBlur (too expensive), emoji is vivid enough on its own
    ctx.font = `${item.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, 0, 0);

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

                const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#ff9ff3'];
                const col = colors[Math.floor(Math.random() * colors.length)];
                createParticles(item.x, item.y, col, 16);
                createParticles(item.x, item.y, '#ffffff', 4);
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
    const isRain  = gameState.weather === 'rain';
    const groundY = displayHeight - SWIPER_HEIGHT - 20;

    // ── Jungle sky gradient ──────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, displayHeight);
    if (isNight) {
        sky.addColorStop(0,   '#020d04');
        sky.addColorStop(0.5, '#051a08');
        sky.addColorStop(1,   '#0a2210');
    } else if (isRain) {
        sky.addColorStop(0,   '#1a2a18');
        sky.addColorStop(0.5, '#253825');
        sky.addColorStop(1,   '#1a2a18');
    } else {
        sky.addColorStop(0,   '#1a6e2e');
        sky.addColorStop(0.4, '#228b36');
        sky.addColorStop(0.75,'#1b5e20');
        sky.addColorStop(1,   '#0d3b12');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // ── Sunlight shaft (daytime only) ──────────────────────────────
    if (!isNight && !isRain) {
        ctx.save();
        ctx.globalAlpha = 0.06 + Math.sin(time * 0.4) * 0.025;
        const shaft = ctx.createLinearGradient(displayWidth * 0.3, 0, displayWidth * 0.7, displayHeight * 0.75);
        shaft.addColorStop(0, 'rgba(255,255,160,1)');
        shaft.addColorStop(1, 'rgba(255,255,160,0)');
        ctx.fillStyle = shaft;
        ctx.beginPath();
        ctx.moveTo(displayWidth * 0.3, 0);
        ctx.lineTo(displayWidth * 0.7, 0);
        ctx.lineTo(displayWidth * 0.9, displayHeight * 0.75);
        ctx.lineTo(displayWidth * 0.1, displayHeight * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // ── Background jungle trees ─────────────────────────────────────
    _drawJungleTree(ctx, -25, groundY, 44, 175, time,       isNight);
    _drawJungleTree(ctx, displayWidth * 0.07, groundY, 28, 130, time+1.1, isNight);
    _drawJungleTree(ctx, displayWidth + 25, groundY, 46, 180, time+0.5,  isNight);
    _drawJungleTree(ctx, displayWidth * 0.88, groundY, 30, 138, time+1.8,isNight);
    _drawJungleTree(ctx, displayWidth * 0.22, groundY, 16,  95, time+2.2, isNight);
    _drawJungleTree(ctx, displayWidth * 0.74, groundY, 18, 100, time+0.9, isNight);

    // ── Hanging vines ───────────────────────────────────────────────
    _drawVines(ctx, time, isNight);

    // ── Night: fireflies ────────────────────────────────────────────
    if (isNight) {
        backgroundStars.forEach(star => {
            star.twinkle += star.speed;
            const a = Math.max(0, Math.sin(star.twinkle));
            if (a > 0.15) {
                ctx.save();
                ctx.globalAlpha = a * 0.85;
                ctx.fillStyle   = '#ccff88';
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
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
    const _waveY = (x) => groundY - Math.sin(x * 0.055 + time * 0.6) * 6 - Math.sin(x * 0.028) * 4;
    // Soil
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(0, groundY + 12, displayWidth, displayHeight - groundY);
    // Dark base grass
    ctx.fillStyle = '#145214';
    ctx.beginPath();
    ctx.moveTo(0, displayHeight);
    for (let x = 0; x <= displayWidth; x += 18) ctx.lineTo(x, _waveY(x));
    ctx.lineTo(displayWidth, displayHeight);
    ctx.closePath();
    ctx.fill();
    // Bright top strip
    ctx.fillStyle = isNight ? '#0d3d0d' : '#22a822';
    ctx.beginPath();
    ctx.moveTo(0, groundY + 3);
    for (let x = 0; x <= displayWidth; x += 18) ctx.lineTo(x, _waveY(x));
    ctx.lineTo(displayWidth, groundY + 3);
    ctx.closePath();
    ctx.fill();
    // Small grass blades
    ctx.strokeStyle = isNight ? '#0d4a0d' : '#33cc33';
    ctx.lineWidth = 1.5;
    for (let x = 8; x < displayWidth; x += 14) {
        const baseY = _waveY(x);
        const sway  = Math.sin(x * 0.1 + time * 1.2) * 3;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.quadraticCurveTo(x + sway, baseY - 9, x + sway * 1.4, baseY - 14);
        ctx.stroke();
    }
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
    for (let i = 0; i < positions.length; i++) {
        const vx  = displayWidth * positions[i];
        const len = displayHeight * lengths[i];
        const sway = Math.sin(time * 0.22 + i * 1.8) * 10;
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = lc;
        ctx.lineWidth   = 2.5;
        // Smooth bezier vine
        ctx.beginPath();
        ctx.moveTo(vx, 0);
        ctx.bezierCurveTo(
            vx + sway * 1.5, len * 0.25,
            vx - sway * 1.5, len * 0.6,
            vx + sway * 0.8, len
        );
        ctx.stroke();
        // Leaves along vine
        for (let t = 0.2; t <= 1; t += 0.35) {
            const lx = vx + sway * (t < 0.4 ? 1.5 : t < 0.7 ? -1.5 : 0.8) * t;
            const ly = len * t;
            ctx.fillStyle = leafC;
            ctx.beginPath();
            ctx.ellipse(lx + 10, ly, 12, 5, 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(lx - 10, ly + 5, 12, 5, -0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
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
    // Level up every pointsPerLevel points (slower, more satisfying ramp)
    const newLevel = Math.floor(gameState.score / settings.pointsPerLevel) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        audio.play('levelup');
        createFloatingText(displayWidth / 2, displayHeight / 2, `LEVEL ${gameState.level}!`, '#ffd700', 44);
        createFloatingText(displayWidth / 2, displayHeight / 2 + 50, '⚡ Faster!', '#ff9500', 30);
        // Spawn interval shrinks by 35ms per level, minimum 900ms — no more overwhelming bursts
        spawnInterval = Math.max(900, settings.spawnInterval - (gameState.level * 35));
    }

    // Process timed spawn queue — fire any item whose scheduled time has arrived
    for (let i = pendingSpawns.length - 1; i >= 0; i--) {
        if (timestamp >= pendingSpawns[i]) {
            if (fallingItems.length < settings.maxItems) spawnItem();
            pendingSpawns.splice(i, 1);
        }
    }

    // Main spawn timer — schedule this wave's items with real time gaps
    if (timestamp - lastSpawnTime > spawnInterval) {
        const extraCount = gameState.level >= settings.extraTwoAtLevel ? 2
                         : gameState.level >= settings.extraAtLevel    ? 1 : 0;
        // Always spawn the first item immediately if under item cap
        if (fallingItems.length < settings.maxItems) spawnItem();
        // Schedule extra items 650ms and 1300ms later — genuinely separated in time
        for (let e = 0; e < extraCount; e++) {
            pendingSpawns.push(timestamp + (e + 1) * 650);
        }
        lastSpawnTime = timestamp;
    }
    
    const _prevX = basket.x;
    basket.x += (basket.targetX - basket.x) * Math.min(0.92 * dtFactor, 1);
    const _dx = basket.x - _prevX;
    if (Math.abs(_dx) > 0.4) basket.facing = _dx > 0 ? 1 : -1;
    
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
        weather: 'clear',
        dayPhase: 0
    };
    
    fallingItems = [];
    particles = [];
    floatingTexts = [];
    shootingStars = [];
    pendingSpawns = [];
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
    pendingSpawns = [];
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
    pendingSpawns = [];
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

resizeCanvas();
leaderboardManager.renderLeaderboard();

// Initialize Unity Ads — Game ID 6082243
unityAds.init();
