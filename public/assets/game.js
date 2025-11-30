const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
const appOpenAd = document.getElementById('app-open-ad');
const gameoverAd = document.getElementById('gameover-ad');

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
        baseSpeed: 1.5, 
        spawnInterval: 2000, 
        bombChance: 0.08,
        speedIncrement: 0.2,
        label: 'EASY'
    },
    medium: { 
        lives: 3, 
        baseSpeed: 2.5, 
        spawnInterval: 1500, 
        bombChance: 0.12,
        speedIncrement: 0.35,
        label: 'MEDIUM'
    },
    hard: { 
        lives: 2, 
        baseSpeed: 3.5, 
        spawnInterval: 1000, 
        bombChance: 0.18,
        speedIncrement: 0.5,
        label: 'HARD'
    }
};

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.bgMusicOsc = null;
        this.bgMusicGain = null;
        this.isPlayingMusic = false;
    }

    init() {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    startBackgroundMusic() {
        if (!this.audioContext || !this.musicEnabled || this.isPlayingMusic) return;
        
        this.bgMusicGain = this.audioContext.createGain();
        this.bgMusicGain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
        this.bgMusicGain.connect(this.audioContext.destination);
        
        this.isPlayingMusic = true;
        this.playMusicLoop();
    }

    playMusicLoop() {
        if (!this.isPlayingMusic || !this.musicEnabled) return;
        
        const now = this.audioContext.currentTime;
        const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 349.23, 329.63, 293.66];
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.4);
            
            gain.gain.setValueAtTime(0, now + i * 0.4);
            gain.gain.linearRampToValueAtTime(0.06, now + i * 0.4 + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.4 + 0.35);
            
            osc.connect(gain);
            gain.connect(this.bgMusicGain);
            
            osc.start(now + i * 0.4);
            osc.stop(now + i * 0.4 + 0.4);
        });
        
        setTimeout(() => {
            if (this.isPlayingMusic && this.musicEnabled) {
                this.playMusicLoop();
            }
        }, notes.length * 400);
    }

    stopBackgroundMusic() {
        this.isPlayingMusic = false;
        if (this.bgMusicGain) {
            this.bgMusicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        }
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled && !gameState.isRunning) {
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
let lightning = { active: false, alpha: 0 };
let animationId = null;
let lastSpawnTime = 0;
let spawnInterval = 1500;
let lastTime = 0;
let weatherChangeTime = 0;

const SWIPER_HEIGHT = 0;
const BASKET_OFFSET = 60;

let displayWidth = window.innerWidth;
let displayHeight = window.innerHeight;

class AdManager {
    constructor() {
        this.appOpenAdLoaded = false;
        this.gameOverAdLoaded = false;
    }

    loadAppOpenAd() {
        try {
            if (typeof adsbygoogle !== 'undefined' && appOpenAd) {
                (adsbygoogle = window.adsbygoogle || []).push({});
                this.appOpenAdLoaded = true;
                console.log('App open ad loaded');
            }
        } catch (e) {
            console.log('AdMob not available:', e.message);
        }
    }

    loadGameOverAd() {
        try {
            if (typeof adsbygoogle !== 'undefined' && gameoverAd && !this.gameOverAdLoaded) {
                (adsbygoogle = window.adsbygoogle || []).push({});
                this.gameOverAdLoaded = true;
                console.log('Game over ad loaded');
            }
        } catch (e) {
            console.log('AdMob not available:', e.message);
        }
    }

    showGameOverAd() {
        if (gameoverAd) {
            gameoverAd.style.display = 'flex';
        }
    }

    hideGameOverAd() {
        if (gameoverAd) {
            gameoverAd.style.display = 'none';
        }
    }
}

const adManager = new AdManager();

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
        
        if (!navigator.onLine) {
            leaderboardContainer.innerHTML = `
                <div class="leaderboard-offline">
                    <span>📡 Connect to internet to see leaderboard</span>
                </div>
            `;
            return;
        }
        
        let html = '';
        const displayCount = Math.min(10, this.leaderboard.length);
        
        for (let i = 0; i < displayCount; i++) {
            const player = this.leaderboard[i];
            const isCurrentUser = player.name === this.playerName;
            const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';
            const isTop3 = i < 3;
            
            html += `
                <div class="leaderboard-item ${isTop3 ? 'top-3' : ''} ${isCurrentUser ? 'current-user' : ''}">
                    <div class="leaderboard-rank ${rankClass}">${player.rank}</div>
                    <div class="leaderboard-name">${player.name}</div>
                    <div class="leaderboard-score">${player.score.toLocaleString()}</div>
                </div>
            `;
        }
        
        if (displayCount < this.leaderboard.length) {
            html += `<div style="text-align: center; color: rgba(255,255,255,0.4); font-size: 0.75rem; padding: 8px;">Scroll to see more...</div>`;
            
            for (let i = displayCount; i < this.leaderboard.length; i++) {
                const player = this.leaderboard[i];
                const isCurrentUser = player.name === this.playerName;
                
                html += `
                    <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                        <div class="leaderboard-rank normal">${player.rank}</div>
                        <div class="leaderboard-name">${player.name}</div>
                        <div class="leaderboard-score">${player.score.toLocaleString()}</div>
                    </div>
                `;
            }
        }
        
        leaderboardContainer.innerHTML = html;
    }
}

const leaderboardManager = new LeaderboardManager();

function initBackgroundStars() {
    backgroundStars = [];
    for (let i = 0; i < 60; i++) {
        backgroundStars.push({
            x: Math.random() * displayWidth,
            y: Math.random() * displayHeight * 0.5,
            size: Math.random() * 2 + 0.5,
            twinkle: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.03 + 0.01
        });
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
    displayWidth = window.innerWidth;
    displayHeight = window.innerHeight;
    
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    basket.width = Math.min(displayWidth * 0.18, 90);
    basket.height = basket.width * 0.55;
    basket.y = displayHeight - basket.height - SWIPER_HEIGHT - BASKET_OFFSET;
    basket.x = (displayWidth - basket.width) / 2;
    basket.targetX = basket.x;
    
    initBackgroundStars();
    initRainDrops();
}

function drawBasket() {
    const glowIntensity = gameState.hasShield ? 20 : (gameState.magnetActive ? 15 : 0);
    const glowColor = gameState.hasShield ? 'rgba(100, 200, 255, 0.5)' : 'rgba(255, 200, 100, 0.5)';
    
    if (glowIntensity > 0) {
        ctx.shadowBlur = glowIntensity;
        ctx.shadowColor = glowColor;
    }
    
    const gradient = ctx.createLinearGradient(basket.x, basket.y, basket.x, basket.y + basket.height);
    gradient.addColorStop(0, '#D2691E');
    gradient.addColorStop(0.5, '#8B4513');
    gradient.addColorStop(1, '#654321');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(basket.x + 5, basket.y);
    ctx.lineTo(basket.x + basket.width - 5, basket.y);
    ctx.quadraticCurveTo(basket.x + basket.width, basket.y, basket.x + basket.width - 8, basket.y + basket.height);
    ctx.lineTo(basket.x + 8, basket.y + basket.height);
    ctx.quadraticCurveTo(basket.x, basket.y, basket.x + 5, basket.y);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(basket.x + 3, basket.y, basket.width - 6, 10);
    
    ctx.strokeStyle = '#5D3A1A';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
        const xPos = basket.x + (basket.width / 4) * i;
        ctx.beginPath();
        ctx.moveTo(xPos, basket.y + 12);
        ctx.lineTo(xPos + (i - 2) * 3, basket.y + basket.height - 5);
        ctx.stroke();
    }
    
    if (gameState.hasShield) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(basket.x + basket.width / 2, basket.y + basket.height / 2, basket.width / 1.5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
}

function createParticles(x, y, color, count = 10, type = 'normal') {
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
    const difficultyMultiplier = Math.min(gameState.level * 0.02, 0.15);
    
    if (rand < settings.bombChance + difficultyMultiplier) {
        const maxBadIndex = Math.min(badItems.length, 1 + Math.floor(gameState.level / 4));
        const badItem = badItems[Math.floor(Math.random() * maxBadIndex)];
        item = {
            ...badItem,
            x: Math.random() * (displayWidth - 50) + 25,
            y: -50,
            size: 40 + Math.random() * 10,
            speed: settings.baseSpeed + levelSpeedBonus + Math.random() * 2,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.15,
            isBad: true,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.05 + Math.random() * 0.05
        };
    } else if (rand < settings.bombChance + difficultyMultiplier + 0.08) {
        const special = specialItems[Math.floor(Math.random() * specialItems.length)];
        item = {
            ...special,
            x: Math.random() * (displayWidth - 50) + 25,
            y: -50,
            size: 45,
            speed: settings.baseSpeed + levelSpeedBonus * 0.7 + Math.random() * 1.5,
            rotation: 0,
            rotationSpeed: 0.05,
            isSpecial: true,
            glow: 0,
            glowDir: 1
        };
    } else {
        const maxFruitIndex = Math.min(fruitTypes.length, 6 + Math.floor(gameState.level / 2));
        const fruit = fruitTypes[Math.floor(Math.random() * maxFruitIndex)];
        item = {
            ...fruit,
            x: Math.random() * (displayWidth - 50) + 25,
            y: -50,
            size: 38 + Math.random() * 12,
            speed: settings.baseSpeed + levelSpeedBonus + Math.random() * 2,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            isFruit: true
        };
    }
    
    fallingItems.push(item);
}

function drawItem(item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    
    if (item.wobble !== undefined) {
        item.x += Math.sin(item.wobble) * 0.5;
        item.wobble += item.wobbleSpeed;
    }
    
    ctx.rotate(item.rotation);
    
    if (item.isSpecial) {
        item.glow += 0.1 * item.glowDir;
        if (item.glow > 1 || item.glow < 0) item.glowDir *= -1;
        
        ctx.shadowBlur = 15 + item.glow * 10;
        ctx.shadowColor = item.type === 'diamond' ? '#00ffff' : 
                          item.type === 'golden' ? '#ffd700' : 
                          item.type === 'freeze' ? '#87ceeb' :
                          item.type === 'magnet' ? '#ff6b6b' :
                          item.type === 'shield' ? '#64b5f6' : '#ffff00';
    }
    
    if (item.isBad) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = item.type === 'skull' ? '#800080' : '#ff4444';
    }
    
    ctx.font = `${item.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, 0, 0);
    
    ctx.restore();
}

function updateItems() {
    const speedMultiplier = gameState.freezeActive ? 0.3 : 1;
    
    for (let i = fallingItems.length - 1; i >= 0; i--) {
        const item = fallingItems[i];
        item.y += item.speed * speedMultiplier;
        item.rotation += item.rotationSpeed * speedMultiplier;
        
        if (gameState.magnetActive && !item.isBad) {
            const dx = (basket.x + basket.width / 2) - item.x;
            const dy = (basket.y) - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150 && dist > 0) {
                item.x += (dx / dist) * 3;
                item.y += (dy / dist) * 2;
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
                        canvas.style.animation = 'shake 0.3s ease-in-out';
                        setTimeout(() => canvas.style.animation = '', 300);
                    }
                    gameState.score = Math.max(0, gameState.score + item.penalty);
                    gameState.combo = 0;
                    createParticles(item.x, item.y, '#ff4444', 20, 'explosion');
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
                
                const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
                createParticles(item.x, item.y, colors[Math.floor(Math.random() * colors.length)], 12);
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

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= p.decay;
        p.size *= 0.97;
        
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

function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.vy *= 0.95;
        ft.life -= 0.02;
        
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
            const alpha = 0.3 + Math.sin(star.twinkle) * 0.7;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
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

function drawPowerUpIndicators() {
    const now = Date.now();
    let yOffset = 80;
    
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    
    if (gameState.multiplier > 1 && now < gameState.multiplierEnd) {
        const remaining = (gameState.multiplierEnd - now) / 1000;
        ctx.fillStyle = gameState.multiplier === 3 ? '#00ffff' : '#ffd700';
        ctx.fillText(`${gameState.multiplier}x Points: ${remaining.toFixed(1)}s`, 10, yOffset);
        yOffset += 18;
    } else {
        gameState.multiplier = 1;
    }
    
    if (gameState.freezeActive && now < gameState.freezeEnd) {
        const remaining = (gameState.freezeEnd - now) / 1000;
        ctx.fillStyle = '#87ceeb';
        ctx.fillText(`❄️ Freeze: ${remaining.toFixed(1)}s`, 10, yOffset);
        yOffset += 18;
    } else {
        gameState.freezeActive = false;
    }
    
    if (gameState.magnetActive && now < gameState.magnetEnd) {
        const remaining = (gameState.magnetEnd - now) / 1000;
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText(`🧲 Magnet: ${remaining.toFixed(1)}s`, 10, yOffset);
        yOffset += 18;
    } else {
        gameState.magnetActive = false;
    }
    
    if (gameState.hasShield) {
        ctx.fillStyle = '#64b5f6';
        ctx.fillText('🛡️ Shield Active', 10, yOffset);
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
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    gameState.gameTime += deltaTime;
    
    updateWeather(timestamp);
    drawBackground();
    
    const settings = difficultySettings[selectedDifficulty];
    const newLevel = Math.floor(gameState.score / 200) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        audio.play('levelup');
        createFloatingText(displayWidth / 2, displayHeight / 2, `LEVEL ${gameState.level}!`, '#ffd700', 40);
        
        spawnInterval = Math.max(400, settings.spawnInterval - (gameState.level * 80));
    }
    
    if (timestamp - lastSpawnTime > spawnInterval) {
        spawnItem();
        if (gameState.level > 3 && Math.random() < 0.3) {
            setTimeout(() => {
                if (gameState.isRunning) spawnItem();
            }, 200);
        }
        lastSpawnTime = timestamp;
    }
    
    basket.x += (basket.targetX - basket.x) * 0.15;
    
    updateItems();
    updateParticles();
    updateFloatingTexts();
    
    fallingItems.forEach(drawItem);
    drawParticles();
    drawBasket();
    drawFloatingTexts();
    drawPowerUpIndicators();
    
    updateUI();
    
    animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
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
    lastSpawnTime = 0;
    spawnInterval = settings.spawnInterval;
    lastTime = performance.now();
    weatherChangeTime = 0;
    
    resizeCanvas();
    updateUI();
    
    difficultyBadge.textContent = settings.label;
    difficultyBadge.className = selectedDifficulty;
    
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    adManager.hideGameOverAd();
    
    animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
    gameState.isPaused = true;
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
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('fruitCatcherHighScore', gameState.highScore);
    }
    
    leaderboardManager.updateLeaderboard(leaderboardManager.playerName, gameState.score);
    
    finalScoreDisplay.innerHTML = `
        <div style="margin-bottom: 10px">Your Score: <span style="color: #4ade80; font-size: 1.8rem">${gameState.score}</span></div>
        <div style="font-size: 1rem; color: #aaa">Level: ${gameState.level} | Max Combo: ${gameState.maxCombo}x</div>
    `;
    highScoreDisplay.textContent = `🏆 High Score: ${gameState.highScore}`;
    
    gameScreen.classList.add('hidden');
    gameoverScreen.classList.remove('hidden');
    
    adManager.showGameOverAd();
    adManager.loadGameOverAd();
}

function goHome() {
    gameState.isRunning = false;
    cancelAnimationFrame(animationId);
    
    gameScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    
    adManager.hideGameOverAd();
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
});

window.addEventListener('offline', () => {
    leaderboardManager.renderLeaderboard();
});

resizeCanvas();
leaderboardManager.renderLeaderboard();

window.addEventListener('load', () => {
    setTimeout(() => {
        adManager.loadAppOpenAd();
    }, 100);
});
