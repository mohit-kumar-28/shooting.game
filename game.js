class Game {
    constructor() {
        // DOM elements
        this.player = document.getElementById('player');
        this.gameArea = document.querySelector('.game-area');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.difficultySelect = document.getElementById('difficulty');
        this.gameOverScreen = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');

        // Game state
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameRunning = false;
        this.isPaused = false;
        this.playerX = 400;
        this.playerSpeed = 5;
        this.bullets = [];
        this.targets = [];
        this.keys = {};
        this.lastFrameTime = 0;
        this.targetSpawnInterval = 2000;
        this.difficultySettings = {
            easy: { targetSpeed: 2, spawnInterval: 2000, pointsPerHit: 10 },
            medium: { targetSpeed: 3, spawnInterval: 1500, pointsPerHit: 15 },
            hard: { targetSpeed: 4, spawnInterval: 1000, pointsPerHit: 20 }
        };

        this.init();
    }

    init() {
        // Event listeners
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.difficultySelect.addEventListener('change', () => this.updateDifficulty());
        
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.code === 'Space' && this.gameRunning && !this.isPaused) {
                this.shoot();
            }
            if (e.code === 'KeyP' && this.gameRunning) {
                this.togglePause();
            }
        });
        document.addEventListener('keyup', (e) => this.keys[e.key] = false);
    }

    startGame() {
        if (this.gameRunning) return;
        
        this.resetGame();
        this.gameRunning = true;
        this.startBtn.textContent = 'Game Running';
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.gameOverScreen.classList.add('hidden');
        
        this.gameLoop();
        this.spawnTargets();
    }

    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.updateUI();
        this.clearGameElements();
    }

    clearGameElements() {
        this.bullets.forEach(bullet => bullet.remove());
        this.targets.forEach(target => target.remove());
        this.bullets = [];
        this.targets = [];
    }

    updateUI() {
        this.scoreElement.textContent = this.score;
        this.livesElement.textContent = this.lives;
        this.levelElement.textContent = this.level;
    }

    gameLoop(currentTime) {
        if (!this.gameRunning || this.isPaused) return;

        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        this.movePlayer();
        this.moveBullets(deltaTime);
        this.moveTargets(deltaTime);
        this.checkCollisions();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    movePlayer() {
        // Calculate boundaries based on sidebar and game area width
        const sidebarWidth = 220; // px (default sidebar width)
        const gameAreaWidth = this.gameArea.offsetWidth;
        const jetWidth = 50; // px
        const minX = 0;
        const maxX = gameAreaWidth - jetWidth;

        if (this.keys['ArrowLeft'] && this.playerX > minX) {
            this.playerX -= this.playerSpeed;
            if (this.playerX < minX) this.playerX = minX;
        }
        if (this.keys['ArrowRight'] && this.playerX < maxX) {
            this.playerX += this.playerSpeed;
            if (this.playerX > maxX) this.playerX = maxX;
        }
        this.player.style.left = this.playerX + 'px';
    }

    shoot() {
        // Unlimited bullets: no limit here
        const bullet = document.createElement('div');
        bullet.className = 'bullet';
        bullet.style.left = (this.playerX + 22) + 'px';
        bullet.style.bottom = '70px';
        this.gameArea.appendChild(bullet);
        this.bullets.push(bullet);

        // Add shooting animation for jet
        this.player.classList.add('shooting');
        setTimeout(() => this.player.classList.remove('shooting'), 100);
    }

    moveBullets(deltaTime) {
        const speed = 0.5; // pixels per millisecond
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            const currentBottom = parseInt(bullet.style.bottom);
            
            if (currentBottom > 600) {
                bullet.remove();
                this.bullets.splice(i, 1);
            } else {
                bullet.style.bottom = (currentBottom + speed * deltaTime) + 'px';
            }
        }
    }

    spawnTargets() {
        if (!this.gameRunning || this.isPaused) return;

        const target = document.createElement('div');
        target.className = 'target';
        const gameAreaWidth = this.gameArea.offsetWidth;
        const targetWidth = 40; // px
        // Ensure the target is fully within the play area
        const minLeft = 0;
        const maxLeft = gameAreaWidth - targetWidth;
        target.style.left = Math.random() * maxLeft + 'px';
        target.style.top = '0px';
        this.gameArea.appendChild(target);
        this.targets.push(target);

        const settings = this.difficultySettings[this.difficultySelect.value];
        setTimeout(() => this.spawnTargets(), settings.spawnInterval);
    }

    moveTargets(deltaTime) {
        const settings = this.difficultySettings[this.difficultySelect.value];
        const speed = settings.targetSpeed * (deltaTime / 16); // Normalize speed

        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const currentTop = parseInt(target.style.top);
            
            if (currentTop > 600) {
                target.remove();
                this.targets.splice(i, 1);
                this.loseLife();
            } else {
                target.style.top = (currentTop + speed) + 'px';
            }
        }
    }

    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            const bulletRect = bullet.getBoundingClientRect();

            for (let j = this.targets.length - 1; j >= 0; j--) {
                const target = this.targets[j];
                const targetRect = target.getBoundingClientRect();

                if (this.isColliding(bulletRect, targetRect)) {
                    this.handleCollision(bullet, target, i, j);
                    break;
                }
            }
        }
    }

    handleCollision(bullet, target, bulletIndex, targetIndex) {
        const settings = this.difficultySettings[this.difficultySelect.value];
        
        // Add hit animation
        target.classList.add('hit');
        setTimeout(() => target.remove(), 300);
        
        bullet.remove();
        this.bullets.splice(bulletIndex, 1);
        this.targets.splice(targetIndex, 1);

        // Update score
        this.score += settings.pointsPerHit;
        this.updateUI();

        // Check for level up
        if (this.score >= this.level * 100) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.updateUI();
        // Increase difficulty
        this.playerSpeed = Math.min(this.playerSpeed + 0.5, 8);
    }

    loseLife() {
        this.lives--;
        this.updateUI();
        
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.gameRunning = false;
        this.finalScoreElement.textContent = this.score;
        this.gameOverScreen.classList.remove('hidden');
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = true;
    }

    togglePause() {
        if (!this.gameRunning) return;
        
        this.isPaused = !this.isPaused;
        this.pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        
        if (!this.isPaused) {
            this.lastFrameTime = performance.now();
            this.gameLoop(this.lastFrameTime);
        }
    }

    restartGame() {
        this.gameOverScreen.classList.add('hidden');
        this.startGame();
    }

    updateDifficulty() {
        if (!this.gameRunning) return;
        this.clearGameElements();
        this.spawnTargets();
    }

    isColliding(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
}; 