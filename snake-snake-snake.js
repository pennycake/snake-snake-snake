// Get the canvas element from HTML and its 2D rendering context
// The canvas is where we'll draw our game graphics
const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');

// ====== GAME CONSTANTS AND STATE VARIABLES ======
// CELL_SIZE: How many pixels each grid cell takes up on screen
// A bigger number means bigger snake and food pieces
const CELL_SIZE = 20;

// SNAKE_SPEED: Time between snake movements in milliseconds
// Lower number = faster snake (150 means snake moves about 6-7 times per second)
const SNAKE_SPEED = 150;

// Grid dimensions will be calculated based on window size
// These variables store how many cells fit in the window width and height
let GRID_WIDTH, GRID_HEIGHT;

// Main game objects - declared but not initialized yet
// We'll set these up properly in initializeGame()
let snakes = [];  // Array to store multiple snakes
let food;   // Will store the food's position
let gameOver = false;  // Game state flag
let inputProcessed = false;  // Prevents multiple inputs per frame
let lastInputTime = 0;  // Track when last input was processed
let minInputInterval = 50;  // Minimum time between inputs (ms)
let highScore = 0;  // Track highest number of snakes achieved
let showSettings = false;  // Settings menu state
let showLiveCounter = false;  // Show/hide live score counter
let speedIncrease = true;  // Make snakes faster with each fruit eaten
let individualSpeeds = true;  // Each snake speeds up independently
let gamePaused = false;  // Game pause state
let speedSettingChanged = false;  // Track if speed settings were changed while paused
let originalSpeedIncrease = false;  // Speed increase setting when game was paused
let originalIndividualSpeeds = false;  // Individual speeds setting when game was paused

// ====== SETTINGS PERSISTENCE ======
// Load settings from localStorage on page load
function loadSettings() {
    const savedLiveCounter = localStorage.getItem('snake_showLiveCounter');
    const savedSpeedIncrease = localStorage.getItem('snake_speedIncrease');
    const savedIndividualSpeeds = localStorage.getItem('snake_individualSpeeds');
    const savedHighScore = localStorage.getItem('snake_highScore');
    
    if (savedLiveCounter !== null) {
        showLiveCounter = savedLiveCounter === 'true';
    }
    if (savedSpeedIncrease !== null) {
        speedIncrease = savedSpeedIncrease === 'true';
    }
    if (savedIndividualSpeeds !== null) {
        individualSpeeds = savedIndividualSpeeds === 'true';
    }
    if (savedHighScore !== null) {
        highScore = parseInt(savedHighScore) || 0;
    }
    
    console.log('Settings loaded:', { showLiveCounter, speedIncrease, individualSpeeds, highScore });
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('snake_showLiveCounter', showLiveCounter.toString());
    localStorage.setItem('snake_speedIncrease', speedIncrease.toString());
    localStorage.setItem('snake_individualSpeeds', individualSpeeds.toString());
    localStorage.setItem('snake_highScore', highScore.toString());
    console.log('Settings saved:', { showLiveCounter, speedIncrease, individualSpeeds, highScore });
}

// Save high score to localStorage
function saveHighScore() {
    localStorage.setItem('snake_highScore', highScore.toString());
    console.log('High score saved:', highScore);
}

// ====== FULLSCREEN FUNCTIONALITY ======
// Toggle fullscreen mode
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        // Enter fullscreen
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Error attempting to enable fullscreen:', err);
        });
    } else {
        // Exit fullscreen
        document.exitFullscreen().catch(err => {
            console.log('Error attempting to exit fullscreen:', err);
        });
    }
}

// Handle fullscreen changes (when user presses F11 or uses browser controls)
function handleFullscreenChange() {
    // Resize canvas when entering/exiting fullscreen
    resizeCanvas();
    console.log('Fullscreen changed, canvas resized');
}

// Animation timing variables
// lastTime: Stores the timestamp of the previous frame
// deltaTime: Accumulates time passed between frames
let lastTime = 0;
let deltaTime = 0;

// ====== WINDOW RESIZE HANDLING ======
// This function recalculates the game grid when the window size changes
function resizeCanvas() {
    // Calculate how many cells can fit in the window
    // Math.floor ensures we have whole numbers of cells
    GRID_WIDTH = Math.floor(window.innerWidth / CELL_SIZE);
    GRID_HEIGHT = Math.floor(window.innerHeight / CELL_SIZE);
    
    // Set canvas size to match our grid dimensions
    // This ensures pixels align perfectly with our grid
    canvas.width = GRID_WIDTH * CELL_SIZE;
    canvas.height = GRID_HEIGHT * CELL_SIZE;
}

// ====== FOOD GENERATION ======
// Creates new food at a random position in the grid
function generateFood() {
    return {
        // Random x position between 0 and grid width
        x: Math.floor(Math.random() * GRID_WIDTH),
        // Random y position between 0 and grid height
        y: Math.floor(Math.random() * GRID_HEIGHT)
    };
}

// ====== SNAKE INITIALIZATION ======
// Creates a new snake at the specified position
function createSnake(startX, startY, direction = { x: 1, y: 0 }) {
    return {
        // body: Array of segments, each with x,y coordinates
        // First segment (index 0) is the head
        body: [
            { x: startX, y: startY },           // Head
            { x: startX - direction.x, y: startY - direction.y },     // Body
            { x: startX - 2 * direction.x, y: startY - 2 * direction.y }  // Tail
        ],
        // Direction: moving in specified direction
        direction: direction,
        // growing: true when snake eats food, false otherwise
        growing: false,
        // Individual speed for this snake
        speed: SNAKE_SPEED,
        // Time accumulator for individual timing
        deltaTime: 0
    };
}

// Creates the initial snake in the center of the screen
function initializeSnake() {
    // Find the center of the grid
    const centerX = Math.floor(GRID_WIDTH / 2);
    const centerY = Math.floor(GRID_HEIGHT / 2);
    
    // Create the first snake
    snakes = [createSnake(centerX, centerY, { x: 1, y: 0 })];
}

// ====== BOUNDARY MANAGEMENT ======
// Ensures snakes and food stay within the game boundaries
function constrainSnakeAndFood() {
    // For each snake, wrap segments around the grid boundaries
    snakes.forEach(snake => {
        if (snake && snake.body) {
            snake.body = snake.body.map(segment => ({
                x: segment.x % GRID_WIDTH,   // Wrap around horizontally
                y: segment.y % GRID_HEIGHT   // Wrap around vertically
            }));
        }
    });
    
    // If food is outside the grid (can happen after resize),
    // generate new food in a valid position
    if (food && (food.x >= GRID_WIDTH || food.y >= GRID_HEIGHT)) {
        food = generateFood();
    }
}

// ====== GAME INITIALIZATION ======
// Sets up everything needed to start the game
function initializeGame() {
    // Load saved settings first
    loadSettings();
    
    // Set up the game area
    resizeCanvas();
    
    // Create snake and food
    initializeSnake();
    food = generateFood();
    
    // Reset game state
    gameOver = false;
    lastTime = 0;
    deltaTime = 0;
    
    // Start the game loop
    requestAnimationFrame(animate);
    
    // Log initial game state (helpful for debugging)
    console.log('Game initialized:', {
        gridSize: { width: GRID_WIDTH, height: GRID_HEIGHT },
        canvasSize: { width: canvas.width, height: canvas.height },
        cellSize: CELL_SIZE,
        snakes: snakes,
        food: food,
        settings: { showLiveCounter, speedIncrease, individualSpeeds }
    });
}

// ====== WINDOW RESIZE EVENT HANDLER ======
// Handles what happens when the window is resized
window.addEventListener('resize', () => {
    // Remember how many snakes we had and their directions
    const snakeCount = snakes.length;
    const directions = snakes.map(snake => snake.direction);
    
    // Rebuild the game grid
    resizeCanvas();
    initializeSnake();
    
    // Restore the original snake count and directions
    for (let i = 1; i < snakeCount; i++) {
        const randomX = Math.floor(Math.random() * GRID_WIDTH);
        const randomY = Math.floor(Math.random() * GRID_HEIGHT);
        snakes.push(createSnake(randomX, randomY, directions[i] || { x: 1, y: 0 }));
    }
    
    // Make sure everything is still in bounds
    constrainSnakeAndFood();
    
    // Log resize info (helpful for debugging)
    console.log('Resized:', {
        gridSize: { width: GRID_WIDTH, height: GRID_HEIGHT },
        canvasSize: { width: canvas.width, height: canvas.height },
        snakeCount: snakes.length
    });
});

// ====== COLLISION DETECTION ======
// Checks if a position collides with any snake's body
function checkCollision(x, y, excludeSnakeIndex = -1, excludeHeadIndex = -1) {
    for (let snakeIndex = 0; snakeIndex < snakes.length; snakeIndex++) {
        const snake = snakes[snakeIndex];
        if (!snake || !snake.body) continue;
        
        for (let segmentIndex = 0; segmentIndex < snake.body.length; segmentIndex++) {
            // Skip the head of the snake that just moved (to avoid self-collision on first move)
            if (snakeIndex === excludeSnakeIndex && segmentIndex === excludeHeadIndex) {
                continue;
            }
            
            const segment = snake.body[segmentIndex];
            if (segment.x === x && segment.y === y) {
                return true;
            }
        }
    }
    return false;
}

// Checks if any snake has collided with itself or another snake
function checkSnakeCollisions() {
    for (let snakeIndex = 0; snakeIndex < snakes.length; snakeIndex++) {
        const snake = snakes[snakeIndex];
        if (!snake || !snake.body || snake.body.length === 0) continue;
        
        const head = snake.body[0];
        
        // Check collision with any snake body (including self-collision)
        if (checkCollision(head.x, head.y, snakeIndex, 0)) {
            return true;
        }
    }
    return false;
}

// ====== SNAKE MOVEMENT ======
// Updates individual snake positions and handles food collision
function moveSnake(snake, deltaTime) {
    if (gameOver || gamePaused) return; // Don't move snakes if game is over or paused
    
    // Update snake's individual time accumulator
    snake.deltaTime += deltaTime;
    
    // Only move if enough time has passed for this snake
    if (snake.deltaTime >= snake.speed) {
        snake.deltaTime = 0; // Reset time accumulator
        
        // Get current head position
        const head = snake.body[0];
        
        // Calculate new head position
        // The modulo (%) makes the snake wrap around the edges
        const newHead = {
            x: (head.x + snake.direction.x + GRID_WIDTH) % GRID_WIDTH,
            y: (head.y + snake.direction.y + GRID_HEIGHT) % GRID_HEIGHT
        };

        // Add new head to start of body array
        snake.body.unshift(newHead);

        // Check if snake hit food
        if (newHead.x === food.x && newHead.y === food.y) {
            food = generateFood();    // Create new food
            snake.growing = true;     // Snake will grow next frame
            
            // Spawn a new snake at a random position
            const newSnakeX = Math.floor(Math.random() * GRID_WIDTH);
            const newSnakeY = Math.floor(Math.random() * GRID_HEIGHT);
            const newSnake = createSnake(newSnakeX, newSnakeY, snake.direction);
            snakes.push(newSnake);
            
            // Increase speed based on settings
            if (speedIncrease) {
                if (individualSpeeds) {
                    // Each snake speeds up independently
                    snake.speed = Math.max(50, snake.speed - 5); // Decrease delay (faster), minimum 50ms
                    console.log(`Individual snake speed increased! New speed: ${snake.speed}ms`);
                } else {
                    // All snakes speed up together (global speed increase)
                    snakes.forEach(s => {
                        s.speed = Math.max(50, s.speed - 5);
                    });
                    console.log(`Global snake speed increased! All snakes now at: ${snake.speed}ms`);
                }
            }
        }

        // If snake isn't growing, remove tail
        // This creates the illusion of movement
        if (!snake.growing) {
            snake.body.pop();
        } else {
            snake.growing = false;    // Reset growing flag
        }
    }
}

// ====== DRAWING ======
// Renders the game state to the canvas
function draw() {
    // Clear the canvas with background color
    ctx.fillStyle = '#152';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw subtle checkerboard pattern around the edges only
    ctx.fillStyle = '#141';  // Darker version of #152
    const borderWidth = 2; // How many cells from the edge to draw pattern
    
    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            // Only draw pattern in border area
            const isBorder = x < borderWidth || x >= GRID_WIDTH - borderWidth || 
                           y < borderWidth || y >= GRID_HEIGHT - borderWidth;
            
            if (isBorder && (x + y) % 2 === 0) {
                ctx.fillRect(
                    x * CELL_SIZE,
                    y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                );
            }
        }
    }
 
    // Find the maximum length among all snakes
    const maxLength = Math.max(...snakes.map(snake => snake ? snake.body.length : 0));
    
    // Draw all snakes
    snakes.forEach((snake, snakeIndex) => {
        if (snake && snake.body) {
            // Use light green for longest snake(s), other colors for shorter snakes
            let color;
            if (snake.body.length === maxLength) {
                color = '#0f0';  // Light green for longest snake(s)
            } else {
                // Use different colors for shorter snakes (avoiding greens, reds, pinks)
                const colors = ['#0ff', '#ff0', '#00f', '#f80', '#08f', '#880', '#808', '#088'];
                color = colors[snakeIndex % colors.length];
            }
            ctx.fillStyle = color;
            
            snake.body.forEach((segment, index) => {
                const x = segment.x * CELL_SIZE;
                const y = segment.y * CELL_SIZE;
                const size = CELL_SIZE - 1;
                
                if (index === 0) {
                    // HEAD: Draw main body square
                    ctx.fillRect(x, y, size, size);
                    
                    // Add eyes based on direction
                    ctx.fillStyle = '#000'; // Black eyes
                    const eyeSize = 3;
                    const eyeOffset = 4;
                    
                    if (snake.direction.x === 1) { // Moving right
                        ctx.fillRect(x + size - eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                        ctx.fillRect(x + size - eyeOffset, y + size - eyeOffset - eyeSize, eyeSize, eyeSize);
                    } else if (snake.direction.x === -1) { // Moving left
                        ctx.fillRect(x + eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
                        ctx.fillRect(x + eyeOffset - eyeSize, y + size - eyeOffset - eyeSize, eyeSize, eyeSize);
                    } else if (snake.direction.y === -1) { // Moving up
                        ctx.fillRect(x + eyeOffset, y + eyeOffset - eyeSize, eyeSize, eyeSize);
                        ctx.fillRect(x + size - eyeOffset - eyeSize, y + eyeOffset - eyeSize, eyeSize, eyeSize);
                    } else if (snake.direction.y === 1) { // Moving down
                        ctx.fillRect(x + eyeOffset, y + size - eyeOffset, eyeSize, eyeSize);
                        ctx.fillRect(x + size - eyeOffset - eyeSize, y + size - eyeOffset, eyeSize, eyeSize);
                    }
                    
                    // Reset color for next segment
                    ctx.fillStyle = color;
                    
                } else {
                    // TAIL AND BODY: Draw regular square
                    ctx.fillRect(x, y, size, size);
                }
            });
            
            // Log snake info for debugging
            console.log(`Snake ${snakeIndex} position:`, snake.body[0], 'Direction:', snake.direction, 'Length:', snake.body.length);
        }
    });

    // Draw food if it exists
    if (food) {
        const x = food.x * CELL_SIZE;
        const y = food.y * CELL_SIZE;
        const size = CELL_SIZE - 1;
        
        // Draw the main apple body
        ctx.fillStyle = '#f00';  // Red apple
        ctx.fillRect(x, y, size, size);
        
        // Draw a brown stem on top
        ctx.fillStyle = '#8B4513';  // Brown stem color
        const stemWidth = 4;
        const stemHeight = 6;
        const stemX = x + size/2 - stemWidth/2;
        const stemY = y - stemHeight;
        ctx.fillRect(stemX, stemY, stemWidth, stemHeight);
        
        // Draw a small green leaf sticking out to the side of the stem
        ctx.fillStyle = '#228B22';  // Forest green leaf color
        const leafSize = 3;
        const leafX = stemX + stemWidth;  // Position leaf to the right of the stem
        const leafY = stemY + 1;  // Slightly below the top of the stem
        ctx.fillRect(leafX, leafY, leafSize, leafSize);
        
        // Log food position for debugging
        console.log('Food position:', food);
    }

    // Draw live snake counter at the top of the screen (if enabled)
    if (showLiveCounter) {
        ctx.fillStyle = '#fff';  // White text
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        // Position 3 cells from top (1 row above the border pattern which starts at 2 cells)
        const counterY = 3 * CELL_SIZE + 25; // 3 cells down + font offset
        ctx.fillText(snakes.length.toString(), canvas.width / 2, counterY);
    }

    // Draw game over screen if game is over
    if (gameOver) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!showSettings) {
            // Game over text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 80);

            // Current score text
            ctx.font = '24px Arial';
            ctx.fillText(`Snakes: ${snakes.length}`, canvas.width / 2, canvas.height / 2 - 40);

            // High score text
            ctx.font = '20px Arial';
            ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 - 10);

            // Settings button
            ctx.font = '18px Arial';
            ctx.fillText('Press S for Settings', canvas.width / 2, canvas.height / 2 + 20);

            // Restart instruction
            ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 50);
        } else {
            // Settings menu
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('SETTINGS', canvas.width / 2, canvas.height / 2 - 60);

            // Live counter setting
            ctx.font = '20px Arial';
            ctx.fillText('Live Score Counter:', canvas.width / 2, canvas.height / 2 - 40);
            ctx.fillText(showLiveCounter ? 'ON' : 'OFF', canvas.width / 2, canvas.height / 2 - 15);

            // Speed increase setting
            ctx.fillText('Speed Increase:', canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillText(speedIncrease ? 'ON' : 'OFF', canvas.width / 2, canvas.height / 2 + 35);

            // Individual speeds setting (only show if speed increase is on)
            if (speedIncrease) {
                ctx.fillText('Individual Speeds:', canvas.width / 2, canvas.height / 2 + 60);
                ctx.fillText(individualSpeeds ? 'ON' : 'OFF', canvas.width / 2, canvas.height / 2 + 85);
            }

            // Instructions
            ctx.font = '16px Arial';
            ctx.fillText('Press T to Toggle Counter', canvas.width / 2, canvas.height / 2 + 110);
            ctx.fillText('Press Y to Toggle Speed', canvas.width / 2, canvas.height / 2 + 130);
            if (speedIncrease) {
                ctx.fillText('Press I to Toggle Individual', canvas.width / 2, canvas.height / 2 + 150);
                ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 170);
                ctx.fillText('Press ESC to Close', canvas.width / 2, canvas.height / 2 + 190);
            } else {
                ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 150);
                ctx.fillText('Press ESC to Close', canvas.width / 2, canvas.height / 2 + 170);
            }
            
            // Warning message if speed settings were changed while paused
            if (gamePaused && speedSettingChanged) {
                ctx.fillStyle = '#ff6b6b';  // Red color for warning
                ctx.font = '14px Arial';
                // Adjust warning position based on whether individual speeds is shown
                const warningY = speedIncrease ? canvas.height / 2 + 220 : canvas.height / 2 + 200;
                ctx.fillText('⚠️ Restart required due to speed setting change', canvas.width / 2, warningY);
                ctx.fillStyle = '#fff';  // Reset to white
            }
        }
    }

    // Draw pause screen if game is paused
    if (gamePaused) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!showSettings) {
            // Pause text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 80);

            // Current score text
            ctx.font = '24px Arial';
            ctx.fillText(`Snakes: ${snakes.length}`, canvas.width / 2, canvas.height / 2 - 40);

            // High score text
            ctx.font = '20px Arial';
            ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 - 10);

            // Settings button
            ctx.font = '18px Arial';
            ctx.fillText('Press S for Settings', canvas.width / 2, canvas.height / 2 + 20);

            // Resume instruction
            ctx.fillText('Press P to Play', canvas.width / 2, canvas.height / 2 + 50);
            
            // Restart instruction
            ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 80);
        } else {
            // Settings menu (same as game over)
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('SETTINGS', canvas.width / 2, canvas.height / 2 - 60);

            // Live counter setting
            ctx.font = '20px Arial';
            ctx.fillText('Live Score Counter:', canvas.width / 2, canvas.height / 2 - 40);
            ctx.fillText(showLiveCounter ? 'ON' : 'OFF', canvas.width / 2, canvas.height / 2 - 15);

            // Speed increase setting
            ctx.fillText('Speed Increase:', canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillText(speedIncrease ? 'ON' : 'OFF', canvas.width / 2, canvas.height / 2 + 35);

            // Individual speeds setting (only show if speed increase is on)
            if (speedIncrease) {
                ctx.fillText('Individual Speeds:', canvas.width / 2, canvas.height / 2 + 60);
                ctx.fillText(individualSpeeds ? 'ON' : 'OFF', canvas.width / 2, canvas.height / 2 + 85);
            }

            // Instructions
            ctx.font = '16px Arial';
            ctx.fillText('Press T to Toggle Counter', canvas.width / 2, canvas.height / 2 + 110);
            ctx.fillText('Press Y to Toggle Speed', canvas.width / 2, canvas.height / 2 + 130);
            if (speedIncrease) {
                ctx.fillText('Press I to Toggle Individual', canvas.width / 2, canvas.height / 2 + 150);
                ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 170);
                ctx.fillText('Press ESC to Close', canvas.width / 2, canvas.height / 2 + 190);
            } else {
                ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 150);
                ctx.fillText('Press ESC to Close', canvas.width / 2, canvas.height / 2 + 170);
            }
            
            // Warning message if speed settings were changed while paused
            if (gamePaused && speedSettingChanged) {
                ctx.fillStyle = '#ff6b6b';  // Red color for warning
                ctx.font = '14px Arial';
                // Adjust warning position based on whether individual speeds is shown
                const warningY = speedIncrease ? canvas.height / 2 + 220 : canvas.height / 2 + 200;
                ctx.fillText('⚠️ Restart required due to speed setting change', canvas.width / 2, warningY);
                ctx.fillStyle = '#fff';  // Reset to white
            }
        }
    }
}

// ====== GAME LOOP ======
// Main game update function
function gameLoop() {
    // Move each snake individually
    snakes.forEach(snake => {
        moveSnake(snake, deltaTime);
    });
    
    // Check for collisions after all snakes have moved
    if (checkSnakeCollisions()) {
        gameOver = true;
        
        // Update high score if current score is higher
        if (snakes.length > highScore) {
            highScore = snakes.length;
            saveHighScore();  // Save the new high score
        }
        
        console.log('Game Over! Snake collision detected.');
        console.log('Final score:', snakes.length, 'High score:', highScore);
    }
    
    draw();         // Draw everything
}

// ====== ANIMATION LOOP ======
// Handles the timing of the game updates
function animate(currentTime) {
    // On first frame, just set up timing
    if (lastTime === 0) {
        lastTime = currentTime;
        requestAnimationFrame(animate);
        return;  // Skip first frame
    }
    
    // Calculate how much time has passed
    deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Always update game loop (individual snakes handle their own timing)
    gameLoop();
    
    // Request next frame
    requestAnimationFrame(animate);
}

// ====== GAME RESTART ======
// Restarts the game from the beginning
function restartGame() {
    gameOver = false;
    gamePaused = false;  // Reset pause state
    showSettings = false;  // Close settings menu
    speedSettingChanged = false;  // Reset speed setting change flag
    originalSpeedIncrease = false;  // Reset original speed settings
    originalIndividualSpeeds = false;  // Reset original individual speeds
    initializeSnake();
    food = generateFood();
    lastTime = 0;
    deltaTime = 0;
    console.log('Game restarted!');
}

// ====== KEYBOARD CONTROLS ======
// Handles arrow key presses to control all snakes' direction
function handleKeyPress(event) {
    // Prevent default behavior (like scrolling the page)
    event.preventDefault();
    
    // Handle pause key (works anytime during gameplay)
    if (event.key.toLowerCase() === 'p' && !gameOver) {
        if (!gamePaused) {
            // Pausing - capture original speed settings
            originalSpeedIncrease = speedIncrease;
            originalIndividualSpeeds = individualSpeeds;
            speedSettingChanged = false;  // Reset change flag
        }
        gamePaused = !gamePaused;
        showSettings = false;  // Close settings when pausing/unpausing
        return;
    }
    
    // Handle fullscreen toggle (F11 key)
    if (event.key === 'F11') {
        event.preventDefault(); // Prevent browser's default F11 behavior
        toggleFullscreen();
        return;
    }
    
    // Handle restart key (works in both game over and pause states)
    if (event.key.toLowerCase() === 'r' && (gameOver || gamePaused) && !showSettings) {
        restartGame();
        return;
    }
    
    // Handle restart from settings menu (force restart if speed settings changed)
    if (event.key.toLowerCase() === 'r' && (gameOver || gamePaused) && showSettings) {
        restartGame();
        return;
    }
    
    // Handle settings key (works in both game over and pause states)
    if (event.key.toLowerCase() === 's' && (gameOver || gamePaused) && !showSettings) {
        showSettings = true;
        return;
    }
    
    // Handle settings toggle (works in both game over and pause states)
    if (event.key.toLowerCase() === 't' && (gameOver || gamePaused) && showSettings) {
        showLiveCounter = !showLiveCounter;
        saveSettings();  // Save the setting change
        return;
    }
    
    // Handle speed increase toggle (works in both game over and pause states)
    if (event.key.toLowerCase() === 'y' && (gameOver || gamePaused) && showSettings) {
        speedIncrease = !speedIncrease;
        // If speed increase is turned off, also turn off individual speeds
        if (!speedIncrease) {
            individualSpeeds = false;
        }
        saveSettings();  // Save the setting change
        // Check if speed settings differ from original when paused
        if (gamePaused) {
            speedSettingChanged = (speedIncrease !== originalSpeedIncrease) || (individualSpeeds !== originalIndividualSpeeds);
        }
        return;
    }
    
    // Handle individual speeds toggle (works in both game over and pause states)
    if (event.key.toLowerCase() === 'i' && (gameOver || gamePaused) && showSettings) {
        individualSpeeds = !individualSpeeds;
        saveSettings();  // Save the setting change
        // Check if speed settings differ from original when paused
        if (gamePaused) {
            speedSettingChanged = (speedIncrease !== originalSpeedIncrease) || (individualSpeeds !== originalIndividualSpeeds);
        }
        return;
    }
    
    // Handle settings close (works in both game over and pause states)
    if (event.key === 'Escape' && (gameOver || gamePaused) && showSettings) {
        showSettings = false;
        return;
    }
    
    // Only handle movement keys if game is not over and not paused
    if (gameOver || gamePaused) return;
    
    // Only change direction if snakes exist
    if (snakes.length === 0) return;
    
    // Get the current direction of the first snake (all snakes move together)
    const currentDir = snakes[0].direction;
    let newDirection = null;
    
    // Handle each arrow key
    switch(event.key) {
        case 'ArrowUp':
            // Only change to up if not currently moving down
            if (currentDir.y !== 1) {
                newDirection = { x: 0, y: -1 };
            }
            break;
        case 'ArrowDown':
            // Only change to down if not currently moving up
            if (currentDir.y !== -1) {
                newDirection = { x: 0, y: 1 };
            }
            break;
        case 'ArrowLeft':
            // Only change to left if not currently moving right
            if (currentDir.x !== 1) {
                newDirection = { x: -1, y: 0 };
            }
            break;
        case 'ArrowRight':
            // Only change to right if not currently moving left
            if (currentDir.x !== -1) {
                newDirection = { x: 1, y: 0 };
            }
            break;
    }
    
    // Apply the new direction to all snakes if it's valid AND enough time has passed
    if (newDirection) {
        const currentTime = performance.now();
        if (currentTime - lastInputTime >= minInputInterval) {
            snakes.forEach(snake => {
                snake.direction = newDirection;
            });
            lastInputTime = currentTime;  // Record when this input was processed
        }
    }
}

// Add keyboard event listener
document.addEventListener('keydown', handleKeyPress);

// Add fullscreen event listeners (F11, browser controls, etc.)
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
document.addEventListener('mozfullscreenchange', handleFullscreenChange); // Firefox
document.addEventListener('MSFullscreenChange', handleFullscreenChange); // IE/Edge

// ====== START THE GAME ======
// Initialize everything and start the game loop
initializeGame();