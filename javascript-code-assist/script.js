// Game setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timerDisplay = document.getElementById('timer');
const winScreen = document.getElementById('winScreen');
const loseScreen = document.getElementById('loseScreen');
const gameSetup = document.getElementById('gameSetup');
const difficultySelection = document.getElementById('difficultySelection');
const easyButton = document.getElementById('easyButton');
const mediumButton = document.getElementById('mediumButton');
const hardButton = document.getElementById('hardButton');
const startButton = document.getElementById('startButton');

const gameSettings = {
    easy: {
        timer: 90,
        moonParticles: 300,
        shotCooldown: 200,
        regenerationDelay: 8000,
        bulletSize: 10,
    },
    medium: {
        timer: 60,
        moonParticles: 500,
        shotCooldown: 250,
        regenerationDelay: 5000,
        bulletSize: 5,
    },
    hard: {
        timer: 45,
        moonParticles: 700,
        shotCooldown: 300,
        regenerationDelay: 3000,
        bulletSize: 3,
    }
};

let currentDifficulty = 'medium';

// Game state
let timer = 60;
let gameOver = false;
const keys = {};
let lastTime = 0;
let lastHitTime = 0;
let regenerationDelay = 5000; // 5 seconds
const regenerationRate = 0.01;
let bulletSize = 5;

let animationFrameId;

const restartButtonWin = document.getElementById('restartButtonWin');
const restartButtonLose = document.getElementById('restartButtonLose');

let timerInterval;
function startTimer() {
    timerDisplay.textContent = `Time: ${timer}`;
    timerInterval = setInterval(() => {
        timer--;
        timerDisplay.textContent = `Time: ${timer}`;
        if (timer <= 0) {
            clearInterval(timerInterval);
            if (!gameOver) {
                gameOver = true;
                loseScreen.style.display = 'block';
                projectiles.length = 0; // Clear projectiles on loss
            }
        }
    }, 1000);
}

function restartGame() {
    cancelAnimationFrame(animationFrameId);
    gameOver = false;
    winScreen.style.display = 'none';
    loseScreen.style.display = 'none';
    gameSetup.style.display = 'block';
    canvas.style.display = 'none';
    timerDisplay.style.display = 'none';

    player.x = canvas.width / 2;
    player.y = canvas.height - 50;
    player.angle = 0;
    projectiles.length = 0;
    moonParticles.length = 0;
    player.lastShot = 0;
    lastHitTime = 0;
    for (let key in keys) {
        delete keys[key];
    }
    clearInterval(timerInterval);
    lastTime = 0;
}

restartButtonWin.addEventListener('click', restartGame);
restartButtonLose.addEventListener('click', restartGame);

easyButton.addEventListener('click', () => selectDifficulty('easy'));
mediumButton.addEventListener('click', () => selectDifficulty('medium'));
hardButton.addEventListener('click', () => selectDifficulty('hard'));
startButton.addEventListener('click', startGame);

function selectDifficulty(difficulty) {
    currentDifficulty = difficulty;
    easyButton.classList.remove('selected');
    mediumButton.classList.remove('selected');
    hardButton.classList.remove('selected');
    document.getElementById(difficulty + 'Button').classList.add('selected');
}

function startGame() {
    gameSetup.style.display = 'none';
    canvas.style.display = 'block';
    timerDisplay.style.display = 'block';

    const settings = gameSettings[currentDifficulty];
    timer = settings.timer;
    player.shotCooldown = settings.shotCooldown;
    regenerationDelay = settings.regenerationDelay;
    bulletSize = settings.bulletSize;
    
    initGrid();
    initMoon(settings.moonParticles);
    startTimer();
    lastTime = 0;
    gameLoop(0);
}

// Game Objects
const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    size: 20,
    angle: 0,
    rotationSpeed: Math.PI, // radians per second
    moveSpeed: 200, // pixels per second
    color: '#f00',
    lastShot: 0,
    shotCooldown: 250, // milliseconds
};

const projectiles = [];
const moonParticles = [];
const moonRadius = 100;

function initMoon(particleCount) {
    moonParticles.length = 0;
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * moonRadius;
        moonParticles.push({
            x: canvas.width / 2 + Math.cos(angle) * radius,
            y: canvas.height / 2 + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
            size: 2,
            color: '#ccc',
            active: true,
            isShot: false,
        });
    }
}

function drawParticles() {
    for (const p of moonParticles) {
        if (p.active) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.closePath();
        }
    }
}

function updateParticles(deltaTime) {
    const friction = 20;
    const minSpeedSq = 100;
    const moonRadiusSq = moonRadius * moonRadius;

    for (const p of moonParticles) {
        if (p.active) {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;

            const speedSq = p.vx * p.vx + p.vy * p.vy;
            if (speedSq > 0) {
                const speed = Math.sqrt(speedSq);
                const frictionX = (p.vx / speed) * friction * deltaTime;
                const frictionY = (p.vy / speed) * friction * deltaTime;
                if (Math.abs(p.vx) > Math.abs(frictionX)) {
                    p.vx -= frictionX;
                } else {
                    p.vx = 0;
                }
                if (Math.abs(p.vy) > Math.abs(frictionY)) {
                    p.vy -= frictionY;
                } else {
                    p.vy = 0;
                }
            }


            if (speedSq < minSpeedSq) {
                const dx = p.x - (canvas.width / 2);
                const dy = p.y - (canvas.height / 2);
                const distanceSq = dx * dx + dy * dy;
                if (distanceSq > moonRadiusSq) {
                    p.active = false;
                    checkWinCondition();
                }
            }
        } else {
            if (!p.isShot && Date.now() - lastHitTime > regenerationDelay) {
                const dx = (canvas.width / 2) - p.x;
                const dy = (canvas.height / 2) - p.y;
                const distanceSq = dx * dx + dy * dy;
                if (distanceSq > 1) {
                    const distance = Math.sqrt(distanceSq);
                    p.x += (dx / distance) * regenerationRate * 100 * deltaTime;
                    p.y += (dy / distance) * regenerationRate * 100 * deltaTime;
                } else {
                    p.active = true;
                    p.vx = 0;
                    p.vy = 0;
                }
            }
        }
    }
}


function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.beginPath();
    ctx.moveTo(0, -player.size);
    ctx.lineTo(player.size / 2, player.size / 2);
    ctx.lineTo(-player.size / 2, player.size / 2);
    ctx.closePath();
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.restore();
}

function updatePlayer(deltaTime) {
    if (gameOver) {
        return;
    }
    if (keys['ArrowLeft']) {
        player.angle -= player.rotationSpeed * deltaTime;
    }
    if (keys['ArrowRight']) {
        player.angle += player.rotationSpeed * deltaTime;
    }
    if (keys['ArrowUp']) {
        player.x += Math.sin(player.angle) * player.moveSpeed * deltaTime;
        player.y -= Math.cos(player.angle) * player.moveSpeed * deltaTime;
    }
    if (keys['ArrowDown']) {
        player.x -= Math.sin(player.angle) * player.moveSpeed * deltaTime;
        player.y += Math.cos(player.angle) * player.moveSpeed * deltaTime;
    }

    // Boundary checks
    if (player.x < player.size) {
        player.x = player.size;
    }
    if (player.x > canvas.width - player.size) {
        player.x = canvas.width - player.size;
    }
    if (player.y < player.size) {
        player.y = player.size;
    }
    if (player.y > canvas.height - player.size) {
        player.y = canvas.height - player.size;
    }
}

function shoot() {
    if (gameOver) {
        return;
    }
    const now = Date.now();
    if (now - player.lastShot > player.shotCooldown) {
        player.lastShot = now;
        projectiles.push({
            x: player.x,
            y: player.y,
            size: bulletSize,
            speed: 500, // pixels per second
            angle: player.angle,
            color: '#ff0',
        });
    }
}

const gridSize = 50;
const grid = [];

function initGrid() {
    grid.length = 0;
    for (let i = 0; i < Math.ceil(canvas.width / gridSize); i++) {
        grid[i] = [];
        for (let j = 0; j < Math.ceil(canvas.height / gridSize); j++) {
            grid[i][j] = [];
        }
    }
}

function getGridCell(x, y) {
    const i = Math.floor(x / gridSize);
    const j = Math.floor(y / gridSize);
    return { i, j };
}

function populateGrid() {
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            grid[i][j].length = 0;
        }
    }
    for (const p of moonParticles) {
        if (p.active) {
            const { i, j } = getGridCell(p.x, p.y);
            if (grid[i] && grid[i][j]) {
                grid[i][j].push(p);
            }
        }
    }
}
function updateProjectiles(deltaTime) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += Math.sin(p.angle) * p.speed * deltaTime;
        p.y -= Math.cos(p.angle) * p.speed * deltaTime;

        const { i: gridI, j: gridJ } = getGridCell(p.x, p.y);
        for (let i = Math.max(0, gridI - 1); i <= Math.min(grid.length - 1, gridI + 1); i++) {
            for (let j = Math.max(0, gridJ - 1); j <= Math.min(grid[0].length - 1, gridJ + 1); j++) {
                for (const moonP of grid[i][j]) {
                    if (moonP.active) {
                        const dx = p.x - moonP.x;
                        const dy = p.y - moonP.y;
                        const distanceSq = dx * dx + dy * dy;
                        const radiiSq = (p.size + moonP.size) * (p.size + moonP.size);
                        if (distanceSq < radiiSq) {
                            moonP.active = false;
                            moonP.isShot = true;
                            lastHitTime = Date.now();
                            checkWinCondition();
                        }
                    }
                }
            }
        }

        // Remove projectiles that go off-screen
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            projectiles.splice(i, 1);
        }
    }
}

function drawProjectiles() {
    for (const p of projectiles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.closePath();
    }
}

function checkWinCondition() {
    const activeParticles = moonParticles.filter(p => p.active);
    if (activeParticles.length === 0 && !gameOver) {
        gameOver = true;
        clearInterval(timerInterval);
        winScreen.style.display = 'block';
        projectiles.length = 0; // Clear projectiles on win
    }
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' && !gameOver && !e.repeat) {
        shoot();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Game loop
function gameLoop(currentTime) {
    if (!lastTime) {
        lastTime = currentTime;
    }
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (gameOver) {
        return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw game objects
    populateGrid();
    updatePlayer(deltaTime);
    updateProjectiles(deltaTime);
    updateParticles(deltaTime);
    drawParticles();
    drawPlayer();
    drawProjectiles();

    checkWinCondition();

    // Request next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}