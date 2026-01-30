// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const COLORS = ['#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3677FF'];

// Tetromino shapes
const TETROMINOES = [
    [[1, 1, 1, 1]],                           // I
    [[1, 1], [1, 1]],                         // O
    [[0, 1, 1], [1, 1, 0]],                   // S
    [[1, 1, 0], [0, 1, 1]],                   // Z
    [[1, 0, 0], [1, 1, 1]],                   // J
    [[0, 0, 1], [1, 1, 1]],                   // L
    [[0, 1, 0], [1, 1, 1]]                    // T
];

class Tetris {
    constructor(canvasId, nextCanvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById(nextCanvasId);
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.cols = COLS;
        this.rows = ROWS;
        this.blockSize = BLOCK_SIZE;

        this.grid = this.createGrid();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameRunning = false;
        this.gamePaused = false;
        this.dropCounter = 0;
        this.dropInterval = 500;

        this.currentPiece = null;
        this.nextPiece = null;
        this.spawnPiece();

        this.setupControls();
        this.updateDisplay();
    }

    createGrid() {
        return Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
    }

    spawnPiece() {
        if (!this.nextPiece) {
            this.nextPiece = this.createPiece();
        }

        this.currentPiece = this.nextPiece;
        this.nextPiece = this.createPiece();

        if (!this.isValidMove(this.currentPiece, 0, 0)) {
            this.endGame();
        }

        this.drawNextPiece();
    }

    createPiece() {
        const shapeIndex = Math.floor(Math.random() * TETROMINOES.length);
        return {
            shape: TETROMINOES[shapeIndex],
            color: COLORS[shapeIndex],
            x: Math.floor(this.cols / 2) - 1,
            y: 0
        };
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning || this.gamePaused) return;

            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.isValidMove(this.currentPiece, -1, 0)) {
                        this.currentPiece.x--;
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.isValidMove(this.currentPiece, 1, 0)) {
                        this.currentPiece.x++;
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.softDrop();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.rotatePiece();
                    break;
                case ' ':
                    e.preventDefault();
                    this.hardDrop();
                    break;
            }
        });

        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    }

    start() {
        if (this.gameRunning) return;
        this.gameRunning = true;
        this.gamePaused = false;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        this.gameLoop();
    }

    togglePause() {
        this.gamePaused = !this.gamePaused;
        document.getElementById('pauseBtn').textContent = this.gamePaused ? 'Resume' : 'Pause';
        if (!this.gamePaused) {
            this.gameLoop();
        }
    }

    reset() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.grid = this.createGrid();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = 500;
        this.currentPiece = null;
        this.nextPiece = null;
        this.spawnPiece();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'Pause';
        this.updateDisplay();
        this.draw();
    }

    gameLoop = (timestamp = 0) => {
        if (!this.gameRunning || this.gamePaused) return;

        this.dropCounter += 16; // Approximate time since last call

        if (this.dropCounter > this.dropInterval) {
            this.dropCounter = 0;
            if (!this.isValidMove(this.currentPiece, 0, 1)) {
                this.lockPiece();
                const linesCleared = this.clearLines();
                if (linesCleared > 0) {
                    this.score += this.getLineScore(linesCleared);
                    this.lines += linesCleared;
                    this.level = Math.floor(this.lines / 10) + 1;
                    this.dropInterval = Math.max(100, 500 - (this.level - 1) * 30);
                }
                this.spawnPiece();
            } else {
                this.currentPiece.y++;
            }
        }

        this.updateDisplay();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }

    softDrop() {
        if (this.isValidMove(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
            this.score += 1;
        }
    }

    hardDrop() {
        while (this.isValidMove(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
            this.score += 2;
        }
    }

    rotatePiece() {
        const rotated = this.currentPiece.shape[0].length === this.currentPiece.shape.length
            ? this.rotateMatrix(this.currentPiece.shape)
            : this.rotateMatrix(this.currentPiece.shape);

        const prevShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;

        if (!this.isValidMove(this.currentPiece, 0, 0)) {
            this.currentPiece.shape = prevShape;
        }
    }

    rotateMatrix(matrix) {
        const n = matrix.length;
        const m = matrix[0].length;
        const rotated = Array(m).fill(null).map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                rotated[j][n - 1 - i] = matrix[i][j];
            }
        }

        return rotated;
    }

    isValidMove(piece, offsetX, offsetY) {
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (!piece.shape[row][col]) continue;

                const x = piece.x + col + offsetX;
                const y = piece.y + row + offsetY;

                if (x < 0 || x >= this.cols || y >= this.rows) {
                    return false;
                }

                if (y >= 0 && this.grid[y][x] !== 0) {
                    return false;
                }
            }
        }

        return true;
    }

    lockPiece() {
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (!this.currentPiece.shape[row][col]) continue;

                const x = this.currentPiece.x + col;
                const y = this.currentPiece.y + row;

                if (y >= 0) {
                    this.grid[y][x] = this.currentPiece.color;
                }
            }
        }
    }

    clearLines() {
        let lineCount = 0;

        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.grid[row].every(cell => cell !== 0)) {
                this.grid.splice(row, 1);
                this.grid.unshift(Array(this.cols).fill(0));
                lineCount++;
                row++; // Check this row again
            }
        }

        return lineCount;
    }

    getLineScore(lines) {
        const scores = [100, 300, 500, 800];
        return scores[Math.min(lines - 1, 3)];
    }

    endGame() {
        this.gameRunning = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        alert(`Game Over!\n\nFinal Score: ${this.score}\nLines Cleared: ${this.lines}\nLevel: ${this.level}`);
    }

    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lines').textContent = this.lines;
        document.getElementById('level').textContent = this.level;
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 0.5;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.ctx.strokeRect(
                    col * this.blockSize,
                    row * this.blockSize,
                    this.blockSize,
                    this.blockSize
                );
            }
        }

        // Draw locked pieces
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.grid[row][col] !== 0) {
                    this.ctx.fillStyle = this.grid[row][col];
                    this.ctx.fillRect(
                        col * this.blockSize,
                        row * this.blockSize,
                        this.blockSize,
                        this.blockSize
                    );
                }
            }
        }

        // Draw current piece
        if (this.currentPiece) {
            this.ctx.fillStyle = this.currentPiece.color;

            for (let row = 0; row < this.currentPiece.shape.length; row++) {
                for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                    if (!this.currentPiece.shape[row][col]) continue;

                    this.ctx.fillRect(
                        (this.currentPiece.x + col) * this.blockSize,
                        (this.currentPiece.y + row) * this.blockSize,
                        this.blockSize,
                        this.blockSize
                    );
                }
            }
        }
    }

    drawNextPiece() {
        this.nextCtx.fillStyle = 'white';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (this.nextPiece) {
            this.nextCtx.fillStyle = this.nextPiece.color;
            const offsetX = (4 - this.nextPiece.shape[0].length) / 2;
            const offsetY = (4 - this.nextPiece.shape.length) / 2;

            for (let row = 0; row < this.nextPiece.shape.length; row++) {
                for (let col = 0; col < this.nextPiece.shape[row].length; col++) {
                    if (!this.nextPiece.shape[row][col]) continue;

                    this.nextCtx.fillRect(
                        (offsetX + col) * 20,
                        (offsetY + row) * 20,
                        20,
                        20
                    );
                }
            }
        }
    }
}

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    const game = new Tetris('gameCanvas', 'nextCanvas');
});
