/**
 * Braille Quest - Main Application
 * Game engine, navigation, accessibility, and state management
 * 
 * ================================
 * MODULAR ARCHITECTURE NOTE
 * ================================
 * 
 * A modular structure is being introduced in src/:
 * 
 * src/
 * ├── services/           # ✅ StateService, AudioService, HapticService, PWAService
 * ├── games/              # ✅ GuessLetterGame, FormWordGame, MemoryGame
 * │   ├── index.js        # Barrel export
 * │   └── *.js            # Individual game modules
 * ├── engines/            # 🔲 InstructionEngine, GameEngine (pending)
 * └── utils/              # ✅ timing.js
 * 
 * This monolithic file remains the active entry point until full migration.
 * Games use dependency injection for testability - see src/games/ for examples.
 */
// ================================
// INLINED MODULES (GitHub Pages compatibility)
// These were moved from src/ because GitHub Pages cannot serve that folder
// ================================

// State migration helper (from src/lib/stateMigration.js)
function migrateProgress(parsedProgress = {}, defaultProgress = {}) {
    const mergedProgress = { ...defaultProgress, ...parsedProgress };
    let migrated = false;

    if (Array.isArray(parsedProgress?.completedLevels)) {
        const currentLevels = Array.isArray(mergedProgress.levelsCompleted)
            ? mergedProgress.levelsCompleted
            : [];
        const mergedLevels = Array.from(new Set([...currentLevels, ...parsedProgress.completedLevels]));
        if (mergedLevels.length !== currentLevels.length) {
            mergedProgress.levelsCompleted = mergedLevels;
        }
        migrated = true;
    }

    if (typeof parsedProgress?.xp === 'number' && !Number.isNaN(parsedProgress.xp)) {
        mergedProgress.totalXP = (mergedProgress.totalXP || 0) + parsedProgress.xp;
        migrated = true;
    }

    if (Object.prototype.hasOwnProperty.call(mergedProgress, 'xp')) {
        delete mergedProgress.xp;
        migrated = true;
    }
    if (Object.prototype.hasOwnProperty.call(mergedProgress, 'completedLevels')) {
        delete mergedProgress.completedLevels;
        migrated = true;
    }

    return { progress: mergedProgress, migrated };
}

// Guess Letter Game (from src/games/GuessLetterGame.js)
function createGuessLetterGame(dependencies) {
    const { BrailleData, HapticService, AudioService, state, saveState, navigateTo } = dependencies;

    return {
        currentRound: 0,
        totalRounds: 10,
        score: 0,
        lives: 3,
        correctAnswers: 0,
        currentLetter: null,
        letters: [],
        answered: false,

        init() {
            this.setupEventListeners();
        },

        setupEventListeners() {
            const playBtn = document.getElementById('play-guess-letter');
            if (playBtn) {
                playBtn.addEventListener('click', () => this.startGame());
            }

            const backBtn = document.getElementById('guess-letter-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.exitGame());
            }

            const nextBtn = document.getElementById('guess-letter-next');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.nextRound());
            }

            const optionsContainer = document.getElementById('guess-letter-options');
            if (optionsContainer) {
                optionsContainer.addEventListener('click', (e) => {
                    const btn = e.target.closest('.game-answer-btn');
                    if (btn && !this.answered) {
                        this.checkAnswer(btn.dataset.letter);
                    }
                });
            }

            const playAgainBtn = document.getElementById('game-over-play-again');
            if (playAgainBtn) {
                playAgainBtn.addEventListener('click', () => this.startGame());
            }

            const backToGamesBtn = document.getElementById('game-over-back');
            if (backToGamesBtn) {
                backToGamesBtn.addEventListener('click', () => {
                    navigateTo('games-screen');
                });
            }

            const gamesBackBtn = document.getElementById('games-back-btn');
            if (gamesBackBtn) {
                gamesBackBtn.addEventListener('click', () => {
                    navigateTo('dashboard-screen');
                });
            }
        },

        startGame() {
            this.currentRound = 0;
            this.score = 0;
            this.lives = 3;
            this.correctAnswers = 0;
            this.answered = false;

            const learnedLetters = this.getLearnedLetters();
            this.letters = learnedLetters.length >= 4
                ? learnedLetters
                : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

            this.updateScoreDisplay();
            this.updateLivesDisplay();
            document.getElementById('guess-letter-total').textContent = this.totalRounds;

            navigateTo('guess-letter-screen');
            this.nextRound();
        },

        getLearnedLetters() {
            const completedLevelIds = state.progress?.levelsCompleted || [];
            const learnedLetters = new Set();

            completedLevelIds.forEach(levelId => {
                const level = BrailleData.LEVELS.find(l => l.id === levelId);
                if (level && level.letters) {
                    level.letters.forEach(letter => {
                        if (typeof letter === 'string' && /^[a-z]$/i.test(letter)) {
                            learnedLetters.add(letter.toLowerCase());
                        }
                    });
                }
            });

            return Array.from(learnedLetters);
        },

        nextRound() {
            this.currentRound++;
            this.answered = false;

            if (this.currentRound > this.totalRounds || this.lives <= 0) {
                this.endGame();
                return;
            }

            document.getElementById('guess-letter-round').textContent = this.currentRound;

            document.getElementById('guess-letter-footer')?.classList.add('hidden');
            const feedback = document.getElementById('guess-letter-feedback');
            if (feedback) {
                feedback.classList.add('hidden');
                feedback.classList.remove('correct', 'incorrect');
            }

            const buttons = document.querySelectorAll('.game-answer-btn');
            buttons.forEach(btn => {
                btn.classList.remove('correct', 'incorrect');
                btn.disabled = false;
            });

            this.currentLetter = this.letters[Math.floor(Math.random() * this.letters.length)];
            this.displayBraillePattern(this.currentLetter);
            this.displayOptions();
        },

        displayBraillePattern(letter) {
            const dots = BrailleData.BRAILLE_ALPHABET[letter.toLowerCase()];
            const cellDots = document.querySelectorAll('#guess-braille-cell .game-braille-dot');

            cellDots.forEach(dot => {
                const dotNum = parseInt(dot.dataset.dot);
                if (dots && dots.includes(dotNum)) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        },

        displayOptions() {
            const optionsContainer = document.getElementById('guess-letter-options');
            if (!optionsContainer) return;

            const distractors = BrailleData.generateDistractors(this.currentLetter, 3, this.letters);
            const options = [this.currentLetter, ...distractors];
            this.shuffleArray(options);

            const buttons = optionsContainer.querySelectorAll('.game-answer-btn');
            buttons.forEach((btn, index) => {
                btn.textContent = options[index].toUpperCase();
                btn.dataset.letter = options[index].toLowerCase();
            });
        },

        shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        },

        checkAnswer(selectedLetter) {
            if (this.answered) return;
            this.answered = true;

            const isCorrect = selectedLetter.toLowerCase() === this.currentLetter.toLowerCase();
            const buttons = document.querySelectorAll('.game-answer-btn');
            const feedback = document.getElementById('guess-letter-feedback');
            const feedbackIcon = feedback?.querySelector('.game-feedback-icon');
            const feedbackText = feedback?.querySelector('.game-feedback-text');

            buttons.forEach(btn => btn.disabled = true);

            buttons.forEach(btn => {
                if (btn.dataset.letter === selectedLetter.toLowerCase()) {
                    btn.classList.add(isCorrect ? 'correct' : 'incorrect');
                }
                if (btn.dataset.letter === this.currentLetter.toLowerCase()) {
                    btn.classList.add('correct');
                }
            });

            if (isCorrect) {
                this.score += 10;
                this.correctAnswers++;
                HapticService.success();
                AudioService.playSound('correct');

                if (feedback) {
                    feedback.classList.remove('hidden', 'incorrect');
                    feedback.classList.add('correct');
                    if (feedbackIcon) feedbackIcon.textContent = '✓';
                    if (feedbackText) feedbackText.textContent = '¡Correcto!';
                }
            } else {
                this.lives--;
                HapticService.error();
                AudioService.playSound('incorrect');

                if (feedback) {
                    feedback.classList.remove('hidden', 'correct');
                    feedback.classList.add('incorrect');
                    if (feedbackIcon) feedbackIcon.textContent = '✗';
                    if (feedbackText) feedbackText.textContent = `Era la letra ${this.currentLetter.toUpperCase()}`;
                }

                this.updateLivesDisplay();

                if (this.lives <= 0) {
                    setTimeout(() => this.endGame(), 1500);
                    return;
                }
            }

            this.updateScoreDisplay();
            document.getElementById('guess-letter-footer')?.classList.remove('hidden');
        },

        updateScoreDisplay() {
            const scoreEl = document.getElementById('guess-letter-score');
            if (scoreEl) scoreEl.textContent = this.score;
        },

        updateLivesDisplay() {
            const livesEl = document.getElementById('guess-letter-lives');
            if (livesEl) {
                livesEl.textContent = '❤️'.repeat(this.lives) + '🖤'.repeat(Math.max(0, 3 - this.lives));
            }
        },

        exitGame() {
            navigateTo('games-screen');
        },

        endGame() {
            const accuracy = this.currentRound > 0
                ? Math.round((this.correctAnswers / Math.min(this.currentRound, this.totalRounds)) * 100)
                : 0;

            const baseXP = this.score;
            const accuracyBonus = accuracy >= 80 ? 20 : (accuracy >= 60 ? 10 : 0);
            const completionBonus = this.lives > 0 ? 30 : 0;
            const totalXP = baseXP + accuracyBonus + completionBonus;

            state.progress.totalXP = (state.progress.totalXP || 0) + totalXP;
            saveState();

            let icon, title, subtitle;
            if (this.lives <= 0) {
                icon = '😢';
                title = '¡Se acabaron las vidas!';
                subtitle = 'Sigue practicando';
            } else if (accuracy >= 80) {
                icon = '🎉';
                title = '¡Excelente!';
                subtitle = '¡Eres un experto!';
            } else if (accuracy >= 60) {
                icon = '👍';
                title = '¡Bien hecho!';
                subtitle = 'Sigue mejorando';
            } else {
                icon = '💪';
                title = '¡Buen intento!';
                subtitle = 'Practica más para mejorar';
            }

            document.getElementById('game-over-icon').textContent = icon;
            document.getElementById('game-over-title').textContent = title;
            document.getElementById('game-over-subtitle').textContent = subtitle;
            document.getElementById('game-over-score').textContent = this.score;
            document.getElementById('game-over-correct').textContent = this.correctAnswers;
            document.getElementById('game-over-accuracy').textContent = accuracy + '%';
            document.getElementById('game-over-xp-value').textContent = '+' + totalXP + ' XP';

            navigateTo('game-over-screen');
        }
    };
}

// Form Word Game (from src/games/FormWordGame.js)
function createFormWordGame(dependencies) {
    const { BrailleData, HapticService, AudioService, state, saveState, navigateTo } = dependencies;

    return {
        currentRound: 0,
        totalRounds: 5,
        score: 0,
        lives: 3,
        correctAnswers: 0,
        currentWord: null,
        words: ['sol', 'mar', 'pan', 'luz', 'rio', 'dia', 'mes', 'ojo', 'pie', 'fin'],
        selectedLetters: [],
        answered: false,

        init() {
            this.setupEventListeners();
        },

        setupEventListeners() {
            const playBtn = document.getElementById('play-form-word');
            if (playBtn) {
                playBtn.addEventListener('click', () => this.startGame());
            }

            const backBtn = document.getElementById('form-word-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.exitGame());
            }

            const checkBtn = document.getElementById('form-word-check');
            if (checkBtn) {
                checkBtn.addEventListener('click', () => this.checkAnswer());
            }

            const nextBtn = document.getElementById('form-word-next');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.nextRound());
            }
        },

        startGame() {
            this.currentRound = 0;
            this.score = 0;
            this.lives = 3;
            this.correctAnswers = 0;
            this.answered = false;

            this.shuffleArray(this.words);
            this.updateScoreDisplay();
            this.updateLivesDisplay();
            document.getElementById('form-word-total').textContent = this.totalRounds;

            navigateTo('form-word-screen');
            this.nextRound();
        },

        shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        },

        nextRound() {
            this.currentRound++;
            this.selectedLetters = [];
            this.answered = false;

            if (this.currentRound > this.totalRounds || this.lives <= 0) {
                this.endGame();
                return;
            }

            document.getElementById('form-word-round').textContent = this.currentRound;
            document.getElementById('form-word-check').disabled = true;
            document.getElementById('form-word-check').classList.remove('hidden');
            document.getElementById('form-word-next').classList.add('hidden');

            const feedback = document.getElementById('form-word-feedback');
            if (feedback) {
                feedback.classList.add('hidden');
                feedback.classList.remove('correct', 'incorrect');
            }

            this.currentWord = this.words[(this.currentRound - 1) % this.words.length];
            document.getElementById('form-word-target').textContent = this.currentWord.toUpperCase();

            this.createSlots();
            this.createOptions();
        },

        createSlots() {
            const slotsContainer = document.getElementById('form-word-slots');
            slotsContainer.innerHTML = '';

            for (let i = 0; i < this.currentWord.length; i++) {
                const slot = document.createElement('div');
                slot.className = 'form-word-slot';
                slot.dataset.index = i;
                slot.innerHTML = `<span class="form-word-slot-letter">${i + 1}</span>`;
                slot.addEventListener('click', () => this.removeFromSlot(i));
                slotsContainer.appendChild(slot);
            }
        },

        createOptions() {
            const optionsContainer = document.getElementById('form-word-options');
            optionsContainer.innerHTML = '';

            const letters = this.currentWord.split('');
            this.shuffleArray(letters);

            letters.forEach((letter, index) => {
                const option = document.createElement('div');
                option.className = 'form-word-option';
                option.dataset.letter = letter;
                option.dataset.originalIndex = index;

                const dots = BrailleData.BRAILLE_ALPHABET[letter.toLowerCase()] || [];
                const dotsHtml = [1, 4, 2, 5, 3, 6].map(dotNum =>
                    `<div class="form-word-option-dot ${dots.includes(dotNum) ? 'active' : ''}" data-dot="${dotNum}"></div>`
                ).join('');

                option.innerHTML = `
                    <div class="form-word-option-cell">${dotsHtml}</div>
                    <span class="form-word-option-label">${letter.toUpperCase()}</span>
                `;
                option.addEventListener('click', () => this.selectLetter(option, letter));
                optionsContainer.appendChild(option);
            });
        },

        selectLetter(optionEl, letter) {
            if (optionEl.classList.contains('used') || this.answered) return;

            const slots = document.querySelectorAll('.form-word-slot');
            const emptySlot = Array.from(slots).find((_, i) => !this.selectedLetters[i]);

            if (!emptySlot) return;

            const slotIndex = parseInt(emptySlot.dataset.index);
            this.selectedLetters[slotIndex] = { letter, optionEl };

            optionEl.classList.add('used');
            emptySlot.classList.add('filled');

            const dotsHtml = optionEl.querySelector('.form-word-option-cell').outerHTML;
            emptySlot.innerHTML = `
                <span class="form-word-slot-letter">${slotIndex + 1}</span>
                ${dotsHtml}
            `;

            const allFilled = this.selectedLetters.filter(Boolean).length === this.currentWord.length;
            document.getElementById('form-word-check').disabled = !allFilled;
        },

        removeFromSlot(slotIndex) {
            if (this.answered) return;
            const slotData = this.selectedLetters[slotIndex];
            if (!slotData) return;

            slotData.optionEl.classList.remove('used');

            const slot = document.querySelector(`.form-word-slot[data-index="${slotIndex}"]`);
            slot.classList.remove('filled');
            slot.innerHTML = `<span class="form-word-slot-letter">${slotIndex + 1}</span>`;

            this.selectedLetters[slotIndex] = null;
            document.getElementById('form-word-check').disabled = true;
        },

        checkAnswer() {
            this.answered = true;
            const userWord = this.selectedLetters.map(s => s.letter).join('');
            const isCorrect = userWord === this.currentWord;

            const slots = document.querySelectorAll('.form-word-slot');
            const feedback = document.getElementById('form-word-feedback');
            const feedbackIcon = feedback?.querySelector('.game-feedback-icon');
            const feedbackText = feedback?.querySelector('.game-feedback-text');

            slots.forEach((slot, i) => {
                if (this.selectedLetters[i]?.letter === this.currentWord[i]) {
                    slot.classList.add('correct');
                } else {
                    slot.classList.add('incorrect');
                }
            });

            if (isCorrect) {
                this.score += 20;
                this.correctAnswers++;
                HapticService.success();
                AudioService.playSound('correct');

                if (feedback) {
                    feedback.classList.remove('hidden', 'incorrect');
                    feedback.classList.add('correct');
                    if (feedbackIcon) feedbackIcon.textContent = '✓';
                    if (feedbackText) feedbackText.textContent = '¡Excelente!';
                }
            } else {
                this.lives--;
                HapticService.error();
                AudioService.playSound('incorrect');

                if (feedback) {
                    feedback.classList.remove('hidden', 'correct');
                    feedback.classList.add('incorrect');
                    if (feedbackIcon) feedbackIcon.textContent = '✗';
                    if (feedbackText) feedbackText.textContent = 'Inténtalo de nuevo';
                }

                this.updateLivesDisplay();

                if (this.lives <= 0) {
                    setTimeout(() => this.endGame(), 1500);
                    return;
                }
            }

            this.updateScoreDisplay();
            document.getElementById('form-word-check').classList.add('hidden');
            document.getElementById('form-word-next').classList.remove('hidden');
        },

        updateScoreDisplay() {
            document.getElementById('form-word-score').textContent = this.score;
        },

        updateLivesDisplay() {
            const livesEl = document.getElementById('form-word-lives');
            if (livesEl) {
                livesEl.textContent = '❤️'.repeat(this.lives) + '🖤'.repeat(Math.max(0, 3 - this.lives));
            }
        },

        exitGame() {
            navigateTo('games-screen');
        },

        endGame() {
            const accuracy = this.currentRound > 0
                ? Math.round((this.correctAnswers / Math.min(this.currentRound, this.totalRounds)) * 100)
                : 0;

            const baseXP = this.score;
            const accuracyBonus = accuracy >= 80 ? 30 : (accuracy >= 60 ? 15 : 0);
            const completionBonus = this.lives > 0 ? 40 : 0;
            const totalXP = baseXP + accuracyBonus + completionBonus;

            state.progress.totalXP = (state.progress.totalXP || 0) + totalXP;
            saveState();

            let icon, title, subtitle;
            if (this.lives <= 0) {
                icon = '😢';
                title = '¡Se acabaron las vidas!';
                subtitle = 'Sigue practicando';
            } else if (accuracy >= 80) {
                icon = '🎉';
                title = '¡Excelente!';
                subtitle = '¡Dominas las palabras!';
            } else if (accuracy >= 60) {
                icon = '👍';
                title = '¡Bien hecho!';
                subtitle = 'Sigue mejorando';
            } else {
                icon = '💪';
                title = '¡Buen intento!';
                subtitle = 'Practica más para mejorar';
            }

            document.getElementById('game-over-icon').textContent = icon;
            document.getElementById('game-over-title').textContent = title;
            document.getElementById('game-over-subtitle').textContent = subtitle;
            document.getElementById('game-over-score').textContent = this.score;
            document.getElementById('game-over-correct').textContent = this.correctAnswers;
            document.getElementById('game-over-accuracy').textContent = accuracy + '%';
            document.getElementById('game-over-xp-value').textContent = '+' + totalXP + ' XP';

            navigateTo('game-over-screen');
        }
    };
}

// Memory Game (from src/games/MemoryGame.js)
function createMemoryGame(dependencies) {
    const { BrailleData, HapticService, AudioService, state, saveState, navigateTo } = dependencies;

    return {
        cards: [],
        flippedCards: [],
        matchedPairs: 0,
        totalPairs: 6,
        moves: 0,
        timer: 0,
        timerInterval: null,
        isProcessing: false,

        init() {
            this.setupEventListeners();
        },

        setupEventListeners() {
            const playBtn = document.getElementById('play-memory');
            if (playBtn) {
                playBtn.addEventListener('click', () => this.startGame());
            }

            const backBtn = document.getElementById('memory-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.exitGame());
            }
        },

        startGame() {
            this.matchedPairs = 0;
            this.moves = 0;
            this.timer = 0;
            this.flippedCards = [];
            this.isProcessing = false;

            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            this.updateUI();
            navigateTo('memory-screen');
            this.createCards();
            this.startTimer();
        },

        startTimer() {
            this.timerInterval = setInterval(() => {
                this.timer++;
                const minutes = Math.floor(this.timer / 60);
                const seconds = this.timer % 60;
                document.getElementById('memory-timer').textContent =
                    `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        },

        createCards() {
            const grid = document.getElementById('memory-grid');
            grid.innerHTML = '';

            const allLetters = Object.keys(BrailleData.BRAILLE_ALPHABET);
            const selectedLetters = this.shuffleArray([...allLetters]).slice(0, this.totalPairs);

            this.cards = [];
            selectedLetters.forEach((letter, i) => {
                this.cards.push({ type: 'letter', value: letter, pairId: i });
                this.cards.push({ type: 'braille', value: letter, pairId: i });
            });

            this.shuffleArray(this.cards);

            this.cards.forEach((card, index) => {
                const cardEl = document.createElement('div');
                cardEl.className = 'memory-card';
                cardEl.dataset.index = index;

                let backContent;
                if (card.type === 'letter') {
                    backContent = `<div class="memory-card-back letter">${card.value.toUpperCase()}</div>`;
                } else {
                    const dots = BrailleData.BRAILLE_ALPHABET[card.value] || [];
                    const dotsHtml = [1, 4, 2, 5, 3, 6].map(dotNum =>
                        `<div class="memory-braille-dot ${dots.includes(dotNum) ? 'active' : ''}"></div>`
                    ).join('');
                    backContent = `<div class="memory-card-back braille"><div class="memory-braille-cell">${dotsHtml}</div></div>`;
                }

                cardEl.innerHTML = `
                    <div class="memory-card-inner">
                        <div class="memory-card-front">
                            <span class="material-symbols-outlined">question_mark</span>
                        </div>
                        ${backContent}
                    </div>
                `;

                cardEl.addEventListener('click', () => this.flipCard(index));
                grid.appendChild(cardEl);
            });
        },

        shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        },

        flipCard(index) {
            if (this.isProcessing) return;

            const cardEl = document.querySelectorAll('.memory-card')[index];
            const card = this.cards[index];

            if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;
            if (this.flippedCards.length >= 2) return;

            cardEl.classList.add('flipped');
            this.flippedCards.push({ index, card, element: cardEl });
            HapticService.tap();

            if (this.flippedCards.length === 2) {
                this.moves++;
                document.getElementById('memory-moves').textContent = this.moves;
                this.checkMatch();
            }
        },

        checkMatch() {
            this.isProcessing = true;
            const [first, second] = this.flippedCards;

            const isMatch = first.card.pairId === second.card.pairId && first.card.type !== second.card.type;

            setTimeout(() => {
                if (isMatch) {
                    first.element.classList.add('matched');
                    second.element.classList.add('matched');
                    this.matchedPairs++;
                    document.getElementById('memory-pairs').textContent = this.matchedPairs;
                    HapticService.success();
                    AudioService.playSound('correct');

                    if (this.matchedPairs === this.totalPairs) {
                        setTimeout(() => this.endGame(), 500);
                    }
                } else {
                    first.element.classList.remove('flipped');
                    second.element.classList.remove('flipped');
                    HapticService.error();
                }

                this.flippedCards = [];
                this.isProcessing = false;
            }, isMatch ? 500 : 1000);
        },

        updateUI() {
            document.getElementById('memory-pairs').textContent = '0';
            document.getElementById('memory-total-pairs').textContent = this.totalPairs;
            document.getElementById('memory-moves').textContent = '0';
            document.getElementById('memory-timer').textContent = '0:00';
        },

        exitGame() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            navigateTo('games-screen');
        },

        endGame() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            const moveScore = Math.max(0, 100 - (this.moves - this.totalPairs) * 5);
            const timeScore = Math.max(0, 100 - this.timer);
            const totalScore = Math.round((moveScore + timeScore) / 2);

            const baseXP = 50;
            const moveBonus = this.moves <= this.totalPairs + 4 ? 30 : (this.moves <= this.totalPairs + 8 ? 15 : 0);
            const timeBonus = this.timer <= 60 ? 30 : (this.timer <= 120 ? 15 : 0);
            const totalXP = baseXP + moveBonus + timeBonus;

            state.progress.totalXP = (state.progress.totalXP || 0) + totalXP;
            saveState();

            let icon, title, subtitle;
            if (this.moves <= this.totalPairs + 2) {
                icon = '🧠';
                title = '¡Memoria perfecta!';
                subtitle = 'Increíble concentración';
            } else if (this.moves <= this.totalPairs + 6) {
                icon = '🎉';
                title = '¡Excelente!';
                subtitle = 'Gran memoria';
            } else {
                icon = '👍';
                title = '¡Completado!';
                subtitle = 'Sigue practicando';
            }

            document.getElementById('game-over-icon').textContent = icon;
            document.getElementById('game-over-title').textContent = title;
            document.getElementById('game-over-subtitle').textContent = subtitle;
            document.getElementById('game-over-score').textContent = totalScore;
            document.getElementById('game-over-correct').textContent = this.matchedPairs;
            document.getElementById('game-over-accuracy').textContent = `${this.moves} mov.`;
            document.getElementById('game-over-xp-value').textContent = '+' + totalXP + ' XP';

            navigateTo('game-over-screen');
        }
    };
}

// ================================
// END INLINED MODULES
// ================================


(function () {
    'use strict';

    // ================================
    // Timing Constants
    // ================================
    const TIMING = {
        INTRO_PAUSE: 200,      // Pause after intro speech
        PREFIX_DOT: 280,       // Prefix cell dot animation
        INTER_CELL: 350,       // Pause between cells
        MAIN_DOT: 400,         // Main cell dot animation
        DOT_GAP: 100,          // Gap between dots
        AUTO_ADVANCE: 8000,    // Auto-advance to next letter
        FEEDBACK_DELAY: 1500,  // Feedback display time
        DEBOUNCE_SAVE: 500,    // State save debounce
        LESSON_INIT_TIMEOUT: 7000, // Lesson init watchdog
        AUDIO_STEP_TIMEOUT: 7000   // Max wait for a TTS step
    };

    const DEBUG_LESSON = (() => {
        try {
            return Boolean(window.__DEBUG_LESSON || localStorage.getItem('debugLesson') === 'true');
        } catch (error) {
            return Boolean(window.__DEBUG_LESSON);
        }
    })();

    function debugLesson(event, data = {}) {
        if (DEBUG_LESSON) {
            const meta = {
                screenReader: state?.settings?.screenReader ?? 'unknown',
                lessonAudioEnabled: state?.settings?.lessonAudioEnabled ?? 'unknown',
                activeEngine: typeof SpeechController !== 'undefined' ? SpeechController.getActiveEngine() : 'pre-init',
                lessonStatus: typeof InstructionEngine !== 'undefined' ? InstructionEngine.lessonStatus : 'pre-init'
            };
            console.log('[lesson]', event, { ...data, _meta: meta });
        }
    }

    // ================================
    // State Management
    // ================================

    const defaultState = {
        // User profile
        profile: {
            name: '',
            avatar: '🐶',
            role: null,
            brailleExperience: null,
            learningGoals: [],
            learningPreferences: [],
            ageRange: null,
            createdAt: null,
            onboardingCompleted: false // Explicit flag for onboarding status
        },

        // Settings
        settings: {
            screenReader: false,
            lessonAudioEnabled: true, // Lesson narration (separate from screenReader)
            hapticFeedback: true,
            highContrast: false,
            fontSize: 'large',
            audioSpeed: 1,
            timedChallenges: false,
            reminders: true,
            newsUpdates: false
        },

        // Progress
        progress: {
            totalXP: 0,
            currentStreak: 0,
            bestStreak: 0,
            lastPlayedAt: null,
            levelsCompleted: [],
            levelStars: {},
            lettersLearned: [],
            achievements: []
        },

        // Daily challenge
        dailyChallenge: {
            date: null,
            completed: false
        },

        // Session state (not persisted)
        session: {
            currentScreen: 'splash',
            currentLevel: null,
            isFirstLaunch: true,
            practiceSetup: {
                gameType: 'build',
                filter: 'learned',
                customLetters: [],
                rounds: 10,
                timedMode: false,
                hints: true
            },
            currentPetStage: 1
        },

        // Pet (Puppy) state
        pet: {
            type: 'puppy',
            name: 'Buddy',
            level: 1,
            xp: 0,
            happiness: 100,
            stage: 1,
            lastInteraction: null,
            labStats: {
                totalIdentify: 0,
                totalChallengeSuccess: 0
            }
        }
    };

    let state = JSON.parse(JSON.stringify(defaultState));
    // Track last successful cloud load to avoid overwriting remote data after a failed fetch
    let lastCloudLoadSucceeded = true;

    // Load state from localStorage
    function loadState() {
        try {
            const saved = localStorage.getItem('braillequest_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                const { progress: mergedProgress, migrated } = migrateProgress(parsed.progress, defaultState.progress);

                // Merge with defaults to handle new properties
                state = {
                    ...defaultState,
                    ...parsed,
                    settings: { ...defaultState.settings, ...parsed.settings },
                    progress: mergedProgress,
                    pet: { ...defaultState.pet, ...parsed.pet },
                    session: { ...defaultState.session }
                };
                state.session.isFirstLaunch = false;

                if (migrated) {
                    saveState();
                }
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }

    // Save state to localStorage (internal) and sync to Supabase if authenticated
    async function _saveStateImmediate() {
        try {
            const toSave = {
                profile: state.profile,
                settings: state.settings,
                progress: state.progress,
                dailyChallenge: state.dailyChallenge,
                pet: state.pet
            };
            localStorage.setItem('braillequest_state', JSON.stringify(toSave));

            // Sync to Supabase if user is authenticated and last cloud load succeeded
            if (state.profile.supabaseUserId) {
                if (!lastCloudLoadSucceeded) {
                    console.warn('Skipping cloud sync: last cloud load failed');
                } else {
                    try {
                        const dataSyncModule = await import('./src/lib/dataSync.js');
                        await dataSyncModule.syncAllData(state, state.profile.supabaseUserId);
                        console.log('✅ Synced to Supabase');
                    } catch (syncError) {
                        console.warn('Could not sync to Supabase:', syncError);
                        // Continue - localStorage save succeeded
                    }
                }
            }
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    // Debounce utility
    function debounce(fn, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Debounced saveState - batches rapid changes
    const saveState = debounce(_saveStateImmediate, TIMING.DEBOUNCE_SAVE);

    // ================================
    // Audio Service
    // ================================

    const AudioService = {
        synth: window.speechSynthesis,
        currentAudio: null,
        speakingPromise: null, // Track current speech completion
        resolveSpeakingPromise: null,
        _audioCtx: null, // Shared AudioContext to prevent memory leaks

        // Get or create shared AudioContext (lazy initialization)
        _getAudioContext() {
            if (!this._audioCtx || this._audioCtx.state === 'closed') {
                this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            // Resume if suspended (required by browser autoplay policies)
            if (this._audioCtx.state === 'suspended') {
                this._audioCtx.resume().catch(() => { });
            }
            return this._audioCtx;
        },

        // Main speak method - interrupts current speech by default
        async speak(text, interrupt = true) {
            debugLesson('speak_entry', { text: text.substring(0, 40), interrupt });

            // Stop any current audio and cancel pending requests
            if (interrupt) {
                this.stop();
            }

            debugLesson('tts_start', {
                text,
                interrupt,
                screenReader: state.settings.screenReader,
                engine: 'native'
            });

            // Use native Web Speech API directly
            return this._speakWithWebSpeech(text);
        },

        // Speak and wait for completion - use this to prevent overlaps
        async speakAndWait(text) {
            const speakResult = this.speak(text, true);
            await speakResult;
            if (this.speakingPromise) {
                await this.speakingPromise;
            }
        },

        _speakWithWebSpeech(text) {
            if (!this.synth || typeof SpeechSynthesisUtterance === 'undefined') {
                debugLesson('tts_webspeech_unavailable', { text });
                return Promise.resolve();
            }
            if (this.synth.speaking) {
                this.synth.cancel();
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = state.settings.audioSpeed;
            utterance.pitch = 1;
            utterance.volume = 1;
            utterance.lang = 'es-ES';

            // Return a promise that resolves when speech ends
            this.speakingPromise = new Promise(resolve => {
                this.resolveSpeakingPromise = resolve;
                // Safety timeout for Web Speech
                const safetyTimeout = setTimeout(() => {
                    debugLesson('tts_webspeech_safety_timeout', { text: text.substring(0, 20) });
                    if (this.resolveSpeakingPromise === resolve) {
                        this.resolveSpeakingPromise();
                        this.resolveSpeakingPromise = null;
                        this.speakingPromise = null;
                        if (this.synth.speaking) this.synth.cancel();
                    }
                }, 10000);

                utterance.onend = () => {
                    clearTimeout(safetyTimeout);
                    if (this.resolveSpeakingPromise === resolve) {
                        this.resolveSpeakingPromise = null;
                        this.speakingPromise = null;
                        resolve();
                    }
                };
                utterance.onerror = () => {
                    clearTimeout(safetyTimeout);
                    if (this.resolveSpeakingPromise === resolve) {
                        this.resolveSpeakingPromise = null;
                        this.speakingPromise = null;
                        resolve();
                    }
                };
            });

            this.synth.speak(utterance);
            return this.speakingPromise;
        },

        stop() {
            if (this.synth && typeof this.synth.cancel === 'function') {
                this.synth.cancel();
            }
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
            }
            if (this.resolveSpeakingPromise) {
                this.resolveSpeakingPromise();
                this.resolveSpeakingPromise = null;
            }
            this.speakingPromise = null;
        },

        _base64ToBlob(base64, mimeType) {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: mimeType });
        },

        playSound(type) {
            // Use shared AudioContext to prevent memory leaks (browsers limit to ~6 instances)
            const audioCtx = this._getAudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            switch (type) {
                case 'correct':
                    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
                    oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
                    oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.4);
                    break;

                case 'incorrect':
                    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
                    oscillator.frequency.setValueAtTime(180, audioCtx.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.3);
                    break;

                case 'tap':
                    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.05);
                    break;

                case 'achievement':
                    oscillator.type = 'sine';
                    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                    notes.forEach((freq, i) => {
                        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15);
                    });
                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.8);
                    break;

                case 'navigate':
                    // Gentle rising chime for screen transitions
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
                    oscillator.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.08); // C#5
                    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.2);
                    break;
            }
        }
    };

    // ================================
    // PWA Service & Install Gate
    // ================================

    const PWAService = {
        deferredPrompt: null,

        init() {
            this.registerServiceWorker();
            this.setupListeners();
            this.checkStandalone();
        },

        registerServiceWorker() {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(reg => console.log('SW Registered', reg))
                    .catch(err => console.error('SW Registration Failed', err));
            }
        },

        setupListeners() {
            // Android / Chrome: Capture the install prompt
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
                this.updateUI('android');
            });

            // Listen for successful install
            window.addEventListener('appinstalled', (evt) => {
                console.log('App was installed');
                this.hideGate();
            });

            // Primary install button (Android)
            const installBtn = document.getElementById('install-button');
            if (installBtn) {
                installBtn.addEventListener('click', async () => {
                    if (this.deferredPrompt) {
                        this.deferredPrompt.prompt();
                        const { outcome } = await this.deferredPrompt.userChoice;
                        console.log(`User response to install: ${outcome}`);
                        this.deferredPrompt = null;

                        if (outcome === 'accepted') {
                            installBtn.textContent = '¡Instalada! Ábrela desde tu inicio.';
                            installBtn.disabled = true;
                        }
                    }
                });
            }

            // iOS "Ready" button
            const iosReadyBtn = document.getElementById('ios-ready-btn');
            if (iosReadyBtn) {
                iosReadyBtn.addEventListener('click', () => {
                    document.getElementById('ios-final-msg')?.classList.remove('hidden');
                    iosReadyBtn.classList.add('hidden');
                });
            }

            // Skip button (Continue in Browser)
            const skipBtn = document.getElementById('install-skip-btn');
            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    this.hideGate();
                });
            }
        },

        checkStandalone() {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true;

            // Check if iOS
            const ua = window.navigator.userAgent;
            const isIOS = /iPhone|iPad|iPod/.test(ua);

            // Check if install modal was already shown (desktop only)
            const installModalShown = localStorage.getItem('braillito_install_modal_shown');

            if (isStandalone || isIOS || installModalShown) {
                // Skip install gate for standalone mode, iOS devices, or if already shown
                this.hideGate();
            } else {
                this.showGate();
                this.detectPlatform();
                // Mark as shown so it won't appear again on refresh
                localStorage.setItem('braillito_install_modal_shown', 'true');
            }
        },

        detectPlatform() {
            const ua = window.navigator.userAgent;
            const isIOS = /iPhone|iPad|iPod/.test(ua);

            if (isIOS) {
                // Show iOS hint instead of install button
                document.getElementById('install-button')?.classList.add('hidden');
                document.getElementById('ios-hint')?.classList.remove('hidden');
            }
        },

        updateUI(platform) {
            // Hide all platforms first
            document.querySelectorAll('.install-platform').forEach(el => el.classList.add('hidden'));

            // Show the current one
            if (platform === 'android') {
                document.getElementById('install-android')?.classList.remove('hidden');
            } else if (platform === 'ios') {
                document.getElementById('install-ios')?.classList.remove('hidden');
            } else {
                document.getElementById('install-fallback')?.classList.remove('hidden');
            }
        },

        showGate() {
            const screen = document.getElementById('install-screen');
            if (screen) {
                screen.classList.remove('hidden');
            }
        },

        hideGate() {
            const screen = document.getElementById('install-screen');
            if (screen) {
                screen.classList.add('hidden');
            }
        }
    };


    // ================================
    // Haptic Service
    // ================================

    const HapticService = {
        vibrate(pattern) {
            if (!state.settings.hapticFeedback) return;
            if (!navigator.vibrate) return;

            navigator.vibrate(pattern);
        },

        tap() {
            this.vibrate(10);
        },

        success() {
            this.vibrate([50, 30, 50]);
        },

        error() {
            this.vibrate([100, 50, 100]);
        },

        dots(dotPattern) {
            // Create a vibration pattern based on dot positions
            const pattern = [];
            for (let i = 1; i <= 6; i++) {
                if (dotPattern.includes(i)) {
                    pattern.push(40);
                } else {
                    pattern.push(0);
                }
                pattern.push(30);
            }
            this.vibrate(pattern);
        }
    };

    // ================================
    // Typewriter Controller
    // ================================

    const TypewriterController = (() => {
        let currentInterval = null;
        let currentElement = null;
        let currentMessages = [];
        let currentMessageIndex = 0;
        let currentCharIndex = 0;
        let fullText = '';
        let isTyping = false;
        let onComplete = null;
        let tapHandler = null;
        const DEFAULT_SPEED = 40; // ms per character (30-50 range)

        function start(element, messages, options = {}) {
            // Stop any existing typewriter
            stop();

            if (!element || !messages || messages.length === 0) return;

            currentElement = element;
            currentMessages = Array.isArray(messages) ? messages : [messages];
            currentMessageIndex = 0;
            const speed = options.speed || DEFAULT_SPEED;
            onComplete = options.onComplete || null;

            // Reserve layout space with invisible placeholder
            fullText = currentMessages[0];
            element.style.visibility = 'hidden';
            element.textContent = fullText;
            element.offsetHeight; // force layout
            element.style.visibility = 'visible';
            element.textContent = '';

            // Attach tap handler to bubble container
            const container = element.closest('.puppy-bubble, .lesson-speech-bubble, .mascot-speech-bubble');
            if (container) {
                tapHandler = () => handleTap();
                container.addEventListener('click', tapHandler);
                container._typewriterContainer = true;
            }

            startTyping(speed);
        }

        function startTyping(speed) {
            currentCharIndex = 0;
            fullText = currentMessages[currentMessageIndex];

            // Reserve space for new message
            if (currentElement) {
                currentElement.style.visibility = 'hidden';
                currentElement.textContent = fullText;
                currentElement.offsetHeight;
                currentElement.style.visibility = 'visible';
                currentElement.textContent = '';
            }

            isTyping = true;

            currentInterval = setInterval(() => {
                if (currentCharIndex < fullText.length) {
                    currentElement.textContent = fullText.substring(0, currentCharIndex + 1);
                    currentCharIndex++;
                } else {
                    clearInterval(currentInterval);
                    currentInterval = null;
                    isTyping = false;
                    if (onComplete) onComplete(currentMessageIndex, currentMessages.length);
                }
            }, speed);
        }

        function handleTap() {
            if (!currentElement) return false;

            if (isTyping) {
                // Complete current message instantly
                clearInterval(currentInterval);
                currentInterval = null;
                currentElement.textContent = fullText;
                isTyping = false;
                if (onComplete) onComplete(currentMessageIndex, currentMessages.length);
                return true;
            } else if (currentMessageIndex < currentMessages.length - 1) {
                // Advance to next message
                currentMessageIndex++;
                startTyping(DEFAULT_SPEED);
                return true;
            }
            return false; // No more messages
        }

        function stop() {
            if (currentInterval) {
                clearInterval(currentInterval);
                currentInterval = null;
            }

            // Remove tap handler from container
            if (currentElement && tapHandler) {
                const container = currentElement.closest('.puppy-bubble, .lesson-speech-bubble, .mascot-speech-bubble');
                if (container) {
                    container.removeEventListener('click', tapHandler);
                }
            }

            isTyping = false;
            currentElement = null;
            currentMessages = [];
            currentMessageIndex = 0;
            currentCharIndex = 0;
            fullText = '';
            onComplete = null;
            tapHandler = null;
        }

        function isActive() {
            return currentElement !== null;
        }

        return { start, stop, handleTap, isActive };
    })();

    // ================================
    // Speech Controller (Single Source of Truth)
    // ================================

    const SpeechController = {
        /**
         * Get the active speech engine based on current settings
         * @returns {'screenReader' | 'lesson' | 'none'}
         */
        getActiveEngine() {
            if (state.settings.screenReader) return 'screenReader';
            if (state.settings.lessonAudioEnabled) return 'lesson';
            return 'none';
        },

        /**
         * Check if lesson audio should play
         * Lesson audio is only enabled when:
         * 1. Screen reader is OFF (to prevent overlap)
         * 2. Lesson audio preference is ON
         */
        isLessonAudioEnabled() {
            return !state.settings.screenReader && state.settings.lessonAudioEnabled;
        },

        /**
         * Check if speech should be used for lesson narration
         * Returns true for BOTH screenReader mode and lessonAudio mode
         * Only returns false when engine is 'none'
         */
        shouldSpeakForLesson() {
            const engine = this.getActiveEngine();
            debugLesson('shouldSpeakForLesson', { engine, result: engine !== 'none' });
            return engine !== 'none';
        },

        /**
         * Ensure lesson audio is ON by default when screen reader is off.
         * Useful to keep narration active even if the user disables the reader.
         */
        ensureLessonAudioEnabled(reason = 'auto') {
            // Auto-enable lesson audio in these cases:
            // 1. 'init' - App initialization (ensure audio is enabled by default)
            // 2. 'mode_switch' - User toggled screen reader OFF (re-enable lesson audio)
            //
            // Only acts when screenReader is OFF and lessonAudioEnabled is currently OFF.
            // This respects user preference if they explicitly turned it off during a session.
            const shouldAutoEnable = (reason === 'init' || reason === 'mode_switch') &&
                !state.settings.screenReader &&
                !state.settings.lessonAudioEnabled;

            if (shouldAutoEnable) {
                state.settings.lessonAudioEnabled = true;
                debugLesson('lesson_audio_auto_enable', { reason });
                saveState();
                this.updateToggleUI();
            }
        },

        /**
         * Toggle lesson audio on/off
         */
        toggleLessonAudio() {
            state.settings.lessonAudioEnabled = !state.settings.lessonAudioEnabled;
            saveState();
            this.updateToggleUI();
            // Stop current audio if turning off
            if (!state.settings.lessonAudioEnabled) {
                AudioService.stop();
            }
        },

        /**
         * Update all audio toggle button UIs to reflect current state
         */
        updateToggleUI() {
            const toggles = document.querySelectorAll('.lesson-audio-toggle');
            toggles.forEach(btn => {
                const icon = btn.querySelector('.material-symbols-outlined');
                if (icon) {
                    icon.textContent = state.settings.lessonAudioEnabled ? 'volume_up' : 'volume_off';
                }
                btn.setAttribute('aria-checked', String(state.settings.lessonAudioEnabled));
            });
        }
    };

    // ================================
    // Lesson Pacer (Deterministic Timing)
    // ================================

    const LessonPacer = {
        pendingTimerId: null,

        /**
         * Estimate speech duration for a text string
         * @param {string} text - Text to estimate
         * @returns {number} Duration in milliseconds
         */
        estimateSpeechDuration(text) {
            // ~150 words per minute at rate 1.0, adjusted by audioSpeed
            const wordsPerMin = 150 / state.settings.audioSpeed;
            const words = text.split(/\s+/).length;
            const baseDuration = (words / wordsPerMin) * 60 * 1000;

            // Add punctuation pauses
            const commas = (text.match(/,/g) || []).length * 150;
            const periods = (text.match(/[.!?]/g) || []).length * 300;

            return Math.max(baseDuration + commas + periods, 400);
        },

        /**
         * Cancel any pending pacing timer
         */
        cancel() {
            if (this.pendingTimerId) {
                clearTimeout(this.pendingTimerId);
                this.pendingTimerId = null;
            }
        },

        /**
         * Pace the lesson step - either with audio or silent timing
         * @param {string} text - Text to speak/pace
         * @returns {Promise<void>}
         */
        async pace(text) {
            // Use shouldSpeakForLesson() to include BOTH screenReader and lesson modes
            const shouldSpeak = SpeechController.shouldSpeakForLesson();
            const estimatedDuration = this.estimateSpeechDuration(text);
            debugLesson('pacer_pace', { text: text.substring(0, 40), shouldSpeak, estimatedDuration });

            if (shouldSpeak) {
                // Use actual TTS
                const startTime = Date.now();
                await AudioService.speakAndWait(text);
                const elapsed = Date.now() - startTime;

                // If TTS was faster than estimated, wait the difference for consistency
                if (elapsed < estimatedDuration) {
                    await new Promise(resolve => {
                        this.pendingTimerId = setTimeout(resolve, estimatedDuration - elapsed);
                    });
                    this.pendingTimerId = null;
                }
            } else {
                // Silent mode: just wait the estimated duration
                await new Promise(resolve => {
                    this.pendingTimerId = setTimeout(resolve, estimatedDuration);
                });
                this.pendingTimerId = null;
            }
        }
    };

    // ================================
    // Instruction Engine
    // ================================

    const InstructionEngine = {
        currentLevel: null,
        currentLetterIdx: 0,
        isAnimationRunning: false,
        currentRunId: 0,
        lessonStatus: 'idle',
        lessonInitToken: 0,
        lessonInitRetryCount: 0,
        initWatchdogId: null,
        hasStartedOnce: false,

        start(level, options = {}) {
            this.startLesson(level, { reason: options.reason || 'auto' });
        },

        startLesson(level, options = {}) {
            const { reason = 'auto', force = false, keepRetry = false } = options;
            if (!level) {
                this._setLessonStatus('error', { reason: 'missing_level', source: reason });
                return;
            }

            // Only auto-enable if we are switching modes or if it's a first-time lesson start
            // and NOT every time a lesson starts, to respect user preference of turning it off.
            // SpeechController.ensureLessonAudioEnabled('startLesson');

            if (!force &&
                (this.lessonStatus === 'loading' || this.lessonStatus === 'ready') &&
                this.currentLevel &&
                this.currentLevel.id === level.id) {
                debugLesson('lesson_init_skipped', { reason, lessonId: level.id, status: this.lessonStatus });
                return;
            }

            debugLesson('lesson_init', {
                reason,
                lessonId: level.id,
                userId: state.profile.supabaseUserId || null,
                progress: {
                    totalXP: state.progress.totalXP,
                    levelsCompleted: state.progress.levelsCompleted.length
                }
            });

            if (!keepRetry) {
                this.lessonInitRetryCount = 0;
            }
            this.lessonInitToken += 1;
            const initToken = this.lessonInitToken;

            if (state.session.currentScreen === 'instruction-screen') {
                this.stop();
            } else {
                navigateTo('instruction-screen');
            }

            this.currentLevel = level;
            this.currentLetterIdx = 0;
            this.hasStartedOnce = false;
            this._setLessonStatus('loading', { reason, initToken, lessonId: level.id });
            this._resetInitUi();

            // Update title to show current level info
            const titleEl = document.querySelector('.lesson-phase-title');
            if (titleEl) {
                titleEl.textContent = `Observa: ${level.title}`;
            }

            try {
                this.setupProgressDots();
                this.clearDots();
            } catch (error) {
                debugLesson('lesson_init_error', { error: error?.message || error });
                this._setLessonStatus('error', { reason: 'init_exception', initToken });
                return;
            }

            this._startInitWatchdog(initToken);
            this.playNextLetter();
        },

        stop() {
            this.isAnimationRunning = false;
            this.currentRunId++; // Invalidate current run
            clearTimeout(this.animationTimeout);
            this._clearInitWatchdog();
            this.hasStartedOnce = false;
            AudioService.stop();
            LessonPacer.cancel(); // Cancel any pending pacing timers
            if (this.lessonStatus !== 'idle') {
                this._setLessonStatus('idle', { reason: 'stop' });
            }
        },

        _setLessonStatus(status, meta = {}) {
            const prev = this.lessonStatus;
            if (prev !== status || meta.force) {
                this.lessonStatus = status;
                debugLesson('lesson_status', { from: prev, to: status, ...meta });
            }
            if (status === 'ready' || status === 'error') {
                this._clearInitWatchdog();
            }
            if (status === 'error') {
                this._showInitError();
            }
        },

        _startInitWatchdog(initToken) {
            this._clearInitWatchdog();
            this.initWatchdogId = setTimeout(() => {
                if (this.lessonInitToken !== initToken) return;
                if (this.lessonStatus !== 'loading') return;

                if (this.lessonInitRetryCount < 1 && this.currentLevel) {
                    this.lessonInitRetryCount += 1;
                    debugLesson('lesson_init_retry', {
                        lessonId: this.currentLevel.id,
                        retryCount: this.lessonInitRetryCount
                    });
                    this.startLesson(this.currentLevel, { reason: 'watchdog-retry', force: true, keepRetry: true });
                    return;
                }

                this._setLessonStatus('error', { reason: 'watchdog-timeout', initToken });
            }, TIMING.LESSON_INIT_TIMEOUT);
        },

        _clearInitWatchdog() {
            if (this.initWatchdogId) {
                clearTimeout(this.initWatchdogId);
                this.initWatchdogId = null;
            }
        },

        _resetInitUi() {
            const repeatBtn = document.getElementById('instruction-repeat-btn');
            if (repeatBtn) repeatBtn.textContent = 'REPETIR';

            const nextBtn = document.getElementById('instruction-next-btn');
            if (nextBtn) {
                nextBtn.textContent = 'SIGUIENTE';
                nextBtn.disabled = false;
            }

            const letterSpan = document.getElementById('instruction-letter');
            if (letterSpan) letterSpan.textContent = '...';

            const instructionText = document.getElementById('instruction-text');
            if (instructionText) instructionText.textContent = 'Preparando la lección';

            const progressBar = document.getElementById('lesson-progress-bar');
            if (progressBar) progressBar.style.width = '0%';
        },

        _showInitError() {
            const titleEl = document.querySelector('.lesson-phase-title');
            if (titleEl) titleEl.textContent = 'No pudimos iniciar la lección';

            const repeatBtn = document.getElementById('instruction-repeat-btn');
            if (repeatBtn) repeatBtn.textContent = 'REINTENTAR';

            const nextBtn = document.getElementById('instruction-next-btn');
            if (nextBtn) nextBtn.disabled = true;

            const instructionText = document.getElementById('instruction-text');
            if (instructionText) {
                instructionText.textContent = 'No pudimos iniciar la lección. Presiona Reintentar.';
            }
        },

        async _safeSpeakAndWait(text, meta = {}) {
            // Use LessonPacer for deterministic timing (audio ON or OFF)
            let timeoutId;
            const timeoutPromise = new Promise(resolve => {
                timeoutId = setTimeout(() => resolve('timeout'), TIMING.AUDIO_STEP_TIMEOUT);
            });

            try {
                const result = await Promise.race([
                    LessonPacer.pace(text),
                    timeoutPromise
                ]);

                if (result === 'timeout') {
                    debugLesson('pacer_timeout', { text, ...meta });
                    AudioService.stop();
                    LessonPacer.cancel();
                }
            } catch (error) {
                debugLesson('pacer_error', { error: error?.message || error, ...meta });
                AudioService.stop();
                LessonPacer.cancel();
            } finally {
                clearTimeout(timeoutId);
            }
        },


        setupProgressDots() {
            const container = document.getElementById('instruction-progress-dots');
            container.innerHTML = '';
            this.currentLevel.letters.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.className = 'progress-dot';
                if (i === 0) dot.classList.add('active');
                container.appendChild(dot);
            });
        },

        updateProgressDots() {
            const dots = document.querySelectorAll('#instruction-progress-dots .progress-dot');
            dots.forEach((dot, i) => {
                dot.classList.remove('active', 'completed');
                if (i < this.currentLetterIdx) dot.classList.add('completed');
                if (i === this.currentLetterIdx) dot.classList.add('active');
            });
        },

        async playNextLetter() {
            if (!this.currentLevel || !Array.isArray(this.currentLevel.letters)) {
                this._setLessonStatus('error', { reason: 'missing_level' });
                return;
            }

            if (this.currentLetterIdx >= this.currentLevel.letters.length) {
                this.finish();
                return;
            }

            const char = this.currentLevel.letters[this.currentLetterIdx];
            const container = document.getElementById('instruction-cell-container');
            const prefixCell = document.getElementById('instruction-cell-prefix');
            const mainCell = document.getElementById('instruction-cell');
            let prefixDots = null;
            let mainDots = null;
            let prefixLabel = '';
            let mainLabel = '';
            let isMultiCell = false;

            if (/[A-Z]/.test(char)) {
                isMultiCell = true;
                prefixDots = BrailleData.SPECIAL_SIGNS.capital;
                mainDots = BrailleData.BRAILLE_ALPHABET[char.toLowerCase()];
                prefixLabel = 'Mayúscula';
                mainLabel = char.toLowerCase();
            } else if (/[0-9]/.test(char)) {
                isMultiCell = true;
                prefixDots = BrailleData.SPECIAL_SIGNS.number;
                mainDots = BrailleData.BRAILLE_NUMBERS[char];
                prefixLabel = 'Número';
                mainLabel = char;
            } else if (BrailleData.BRAILLE_SYMBOLS[char]) {
                mainDots = BrailleData.BRAILLE_SYMBOLS[char];
                mainLabel = char;
            } else {
                mainDots = BrailleData.BRAILLE_ALPHABET[char.toLowerCase()];
                mainLabel = char;
            }

            if (!container || !mainCell || (isMultiCell && !prefixCell)) {
                this._setLessonStatus('error', { reason: 'missing_dom', lessonId: this.currentLevel.id });
                return;
            }

            if (this.lessonStatus === 'loading') {
                this._setLessonStatus('ready', {
                    lessonId: this.currentLevel.id,
                    stepIndex: this.currentLetterIdx
                });
            }

            if (!this.hasStartedOnce) {
                this.hasStartedOnce = true;
                debugLesson('lesson_started', {
                    lessonId: this.currentLevel.id,
                    stepIndex: this.currentLetterIdx
                });
            }

            debugLesson('lesson_step', {
                lessonId: this.currentLevel.id,
                stepIndex: this.currentLetterIdx,
                letter: char
            });

            // Toggle single/dual cell display - show/hide prefix cell
            container.classList.toggle('single-cell', !isMultiCell);
            if (prefixCell) {
                prefixCell.classList.toggle('hidden', !isMultiCell);
            }

            // Update the speech bubble with new format
            const instructionLetter = document.getElementById('instruction-letter');
            if (instructionLetter) {
                instructionLetter.textContent = `letra ${char}`;
            }
            // Also update the large letter circle display (hidden but used for updates)
            const largeLetter = document.getElementById('instruction-letter-large');
            if (largeLetter) {
                largeLetter.textContent = char;
            }

            // Update lesson progress bar
            const progressPercent = ((this.currentLetterIdx + 1) / this.currentLevel.letters.length) * 100;
            const lessonProgressBar = document.getElementById('lesson-progress-bar');
            if (lessonProgressBar) {
                lessonProgressBar.style.width = `${progressPercent}%`;
            }

            // Generate position-based intro phrase
            const getIntroPhrase = (char, idx, total) => {
                if (idx === 0) {
                    return `Comencemos con la ${char}`;
                } else if (idx === total - 1) {
                    return `Y por último, la ${char}`;
                } else {
                    // Rotate through middle phrases
                    const middlePhrases = [
                        `Ahora, la ${char}`,
                        `Siguiente: ${char}`,
                        `Vamos con la ${char}`,
                        `Continuamos con la ${char}`
                    ];
                    return middlePhrases[(idx - 1) % middlePhrases.length];
                }
            };

            const introPhrase = getIntroPhrase(char, this.currentLetterIdx, this.currentLevel.letters.length);

            const instructionText = document.getElementById('instruction-text');
            if (instructionText) {
                instructionText.textContent = `${introPhrase}...`;
            }
            // Buttons now stay visible during animation

            this.updateProgressDots();
            this.clearDots();

            this.isAnimationRunning = true;
            const currentIdx = this.currentLetterIdx;
            const runId = this.currentRunId;
            const initToken = this.lessonInitToken;
            const isStale = () => (
                !this.isAnimationRunning ||
                this.currentLetterIdx !== currentIdx ||
                this.currentRunId !== runId ||
                this.lessonInitToken !== initToken
            );

            // Speak intro - Buddy's message appears at the SAME TIME as the audio
            showPuppyMessage(introPhrase);
            await this._safeSpeakAndWait(introPhrase, { phase: 'intro', lessonId: this.currentLevel.id });
            if (isStale()) return;
            await new Promise(r => setTimeout(r, TIMING.INTRO_PAUSE));

            if (isStale()) return;

            // Animate prefix cell dots (if applicable)
            if (isMultiCell && prefixDots) {
                await this._safeSpeakAndWait(
                    prefixLabel === 'Mayúscula' ? 'Signo de mayúscula' : 'Signo de número',
                    { phase: 'prefix_label', lessonId: this.currentLevel.id }
                );
                if (isStale()) return;
                for (const dotNum of prefixDots) {
                    if (isStale()) return;
                    const dotEl = prefixCell.querySelector(`[data-dot="${dotNum}"]`);
                    if (dotEl) {
                        dotEl.classList.add('animating');
                        HapticService.tap();
                        await new Promise(r => setTimeout(r, TIMING.PREFIX_DOT));
                        if (isStale()) return;
                        dotEl.classList.remove('animating');
                        dotEl.classList.add('filled');
                    }
                }
                await new Promise(r => setTimeout(r, TIMING.INTER_CELL));
                if (isStale()) return;
            }

            if (isStale()) return;

            // Animate main cell dots
            await this._safeSpeakAndWait(`Letra ${mainLabel}`, { phase: 'main_label', lessonId: this.currentLevel.id });
            if (isStale()) return;
            for (const dotNum of mainDots) {
                if (isStale()) return;
                const dotEl = mainCell.querySelector(`[data-dot="${dotNum}"]`);
                if (dotEl) {
                    dotEl.classList.add('animating');
                    const pos = BrailleData.DOT_POSITIONS[dotNum];
                    await this._safeSpeakAndWait(`Punto ${dotNum}, ${pos}`, {
                        phase: 'main_dot',
                        lessonId: this.currentLevel.id
                    });
                    if (isStale()) return;
                    HapticService.tap();
                    await new Promise(r => setTimeout(r, TIMING.MAIN_DOT));
                    if (isStale()) return;
                    dotEl.classList.remove('animating');
                    dotEl.classList.add('filled');
                }
                await new Promise(r => setTimeout(r, TIMING.DOT_GAP));
                if (isStale()) return;
            }

            if (isStale()) return;

            const desc = BrailleData.getDotsDescription(char);
            const buddyMsg = `${char} es ${desc}`;
            if (instructionText) {
                instructionText.textContent = buddyMsg;
            }
            showPuppyMessage(buddyMsg); // Buddy talks in instruction screen
            await this._safeSpeakAndWait(buddyMsg, { phase: 'desc', lessonId: this.currentLevel.id });
            if (isStale()) return;

            // If it's the last letter, change button text
            const nextBtn = document.getElementById('instruction-next-btn');
            if (nextBtn) {
                if (this.currentLetterIdx === this.currentLevel.letters.length - 1) {
                    nextBtn.textContent = "INICIAR LECCIÓN";
                } else {
                    nextBtn.textContent = "SIGUIENTE";
                }
            }

            // Auto-advance after 8 seconds if not clicked
            this.animationTimeout = setTimeout(() => {
                if (this.currentLetterIdx < this.currentLevel.letters.length - 1) {
                    this.next();
                }
            }, TIMING.AUTO_ADVANCE);
        },

        clearDots() {
            document.querySelectorAll('#instruction-cell-prefix [data-dot], #instruction-cell [data-dot]').forEach(d => {
                d.classList.remove('filled', 'active', 'animating');
            });
        },

        next() {
            clearTimeout(this.animationTimeout);
            this.isAnimationRunning = false;
            this.clearDots(); // Clear dots immediately when advancing
            this.currentLetterIdx++;
            this.playNextLetter();
        },

        repeat() {
            clearTimeout(this.animationTimeout);
            if (!this.currentLevel) {
                this._setLessonStatus('error', { reason: 'missing_level', source: 'repeat' });
                return;
            }
            this.startLesson(this.currentLevel, { reason: 'repeat', force: true });
        },

        skip() {
            clearTimeout(this.animationTimeout);
            this.isAnimationRunning = false;
            this.finish();
        },

        finish() {
            this._setLessonStatus('idle', { reason: 'finish', force: true });
            GameEngine.startLevel(this.currentLevel.id, true); // true = skipIntro
        }
    };

    // ================================
    // Navigation
    // ================================

    function navigateTo(screenId) {
        // Clear focus from current element before navigating to prevent "sticky" rings
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }

        // Small delay to clear focus again after screen change, helpful for some mobile browsers
        setTimeout(() => {
            if (document.activeElement &&
                !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                document.activeElement.blur();
            }
        }, 50);

        // Stop any active instruction animations
        InstructionEngine.stop();

        // Stop any active typewriter animation
        TypewriterController.stop();

        // AUTH GUARD REMOVED: Allow access to all screens without authentication
        // (Previously blocked: dashboard-screen, profile-screen, levels-screen, games-screen, practice-screen, progress-screen, settings-screen)

        // Defensive cleanup: explicitly hide ALL screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
            // Clear any inline styles that might interfere
            screen.style.display = '';
            screen.style.visibility = '';
            screen.style.opacity = '';
        });

        // Set state synchronously before animation frame to avoid race conditions with showPuppyMessage
        state.session.currentScreen = screenId;

        // Small delay to ensure cleanup completes before showing new screen
        requestAnimationFrame(() => {
            // Show target screen
            const targetScreen = document.getElementById(screenId);
            if (targetScreen) {
                targetScreen.classList.add('active');

                // Update Navigation Bar Visibility
                const mainNav = document.getElementById('main-nav');
                const mainScreens = ['dashboard-screen', 'levels-screen', 'games-screen', 'practice-screen', 'progress-screen', 'settings-screen'];

                if (mainNav) {
                    if (mainScreens.includes(screenId)) {
                        mainNav.classList.remove('hidden');
                        // Update active state in nav (support both old and new classes)
                        const navItems = Array.from(document.querySelectorAll('.nav-item, .nav-tab'));
                        navItems.forEach((item) => {
                            const isActive = item.dataset.screen === screenId;
                            item.classList.toggle('active', isActive);

                            // Update icon wrap active state for new nav tabs
                            const iconWrap = item.querySelector('.nav-tab-icon-wrap');
                            if (iconWrap) {
                                iconWrap.classList.toggle('active', isActive);
                            }
                        });
                    } else {
                        mainNav.classList.add('hidden');
                    }
                }

                // Focus management for accessibility
                const firstFocusable = targetScreen.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    setTimeout(() => firstFocusable.focus(), 100);
                }

                // Announce screen change with sound
                if (state.settings.screenReader) {
                    AudioService.playSound('navigate');
                    const title = targetScreen.querySelector('h1, h2');
                    if (title) {
                        AudioService.speak(title.textContent);
                    }
                }
            }
        });
    }

    // ================================
    // Game Engine
    // ================================

    const GameEngine = {
        currentLevel: null,
        currentRound: 0,
        totalRounds: 0,
        score: 0,
        correctAnswers: 0,
        hintsUsed: 0,
        startTime: null,
        questions: [],
        feedbackProcessing: false,
        buildInstructionShown: false,

        startLevel(levelOrId, skipIntro = false) {
            // Stop any active instruction animations
            InstructionEngine.stop();

            debugLesson('start_level_called', {
                levelOrId,
                skipIntro,
                userId: state.profile.supabaseUserId || null
            });

            let level;
            if (typeof levelOrId === 'string') {
                level = BrailleData.LEVELS.find(l => l.id === levelOrId);
                // Handle dynamic levels (practice, daily)
                if (!level && state.session.currentLevel && state.session.currentLevel.id === levelOrId) {
                    level = state.session.currentLevel;
                }
            } else {
                level = levelOrId;
            }
            if (!level) {
                debugLesson('start_level_missing', { levelOrId });
                return;
            }

            debugLesson('start_level_resolved', {
                lessonId: level.id,
                gameType: level.gameType,
                skipIntro
            });

            // Start instruction phase first if this is a lesson and intro not skipped
            if (level.id !== 'daily' && level.id !== 'practice' && !skipIntro) {
                InstructionEngine.startLesson(level, { reason: 'start-level' });
                return;
            }

            this.currentLevel = level;
            this.currentRound = 0;
            this.totalRounds = level.rounds;
            this.score = 0;
            this.correctAnswers = 0;
            this.hintsUsed = 0;
            this.startTime = Date.now();
            this.buildInstructionShown = false;

            // Generate questions
            this.questions = this.generateQuestions(level);

            // Navigate to appropriate game screen
            if (level.gameType === 'build') {
                navigateTo('game-build-screen');
                this.setupBuildGame();
            } else if (level.gameType === 'pick') {
                navigateTo('game-pick-screen');
                this.setupPickGame();
            } else if (level.gameType === 'observe') {
                // OBSERVE: Show patterns without user input, similar to instruction
                navigateTo('game-observe-screen');
                this.setupObserveGame();
            } else if (level.gameType === 'words') {
                // WORDS: Build words letter by letter
                navigateTo('game-words-screen');
                this.setupWordsGame();
            } else {
                // For mixed mode, the first question determines the screen
                this.nextRound();
                return;
            }

            this.nextRound();
        },

        // Setup OBSERVE game - demonstration without errors
        setupObserveGame() {
            // Will show pattern animations without user input
            // Continue button appears after pattern is shown
        },

        // Setup WORDS game - build words letter by letter
        setupWordsGame() {
            this.currentWordIndex = 0;
            this.currentLetterInWord = 0;
        },

        generateQuestions(level) {
            const questions = [];

            // For WORDS gameType, use words array
            if (level.gameType === 'words' && level.words && level.words.length > 0) {
                for (let i = 0; i < level.rounds; i++) {
                    const word = level.words[i % level.words.length];
                    questions.push({
                        word: word,
                        type: 'words'
                    });
                }
                return questions;
            }

            // For OBSERVE gameType, create observation items
            if (level.gameType === 'observe') {
                questions.push({
                    type: 'observe',
                    content: level.description
                });
                return questions;
            }

            const chars = level.letters;

            for (let i = 0; i < level.rounds; i++) {
                const char = chars[i % chars.length];
                let type = level.gameType;
                if (type === 'mixed') {
                    type = Math.random() > 0.5 ? 'build' : 'pick';
                }

                let cells = [];
                if (/[A-Z]/.test(char)) {
                    cells = [
                        { name: 'Signo de mayúscula', dots: BrailleData.SPECIAL_SIGNS.capital },
                        { name: `Letra ${char}`, dots: BrailleData.BRAILLE_ALPHABET[char.toLowerCase()] }
                    ];
                } else if (/[0-9]/.test(char)) {
                    cells = [
                        { name: 'Signo de número', dots: BrailleData.SPECIAL_SIGNS.number },
                        { name: `Número ${char}`, dots: BrailleData.BRAILLE_NUMBERS[char] }
                    ];
                } else if (BrailleData.BRAILLE_SYMBOLS && BrailleData.BRAILLE_SYMBOLS[char]) {
                    cells = [{ name: `Símbolo ${char}`, dots: BrailleData.BRAILLE_SYMBOLS[char] }];
                } else if (BrailleData.BRAILLE_ACCENTS && BrailleData.BRAILLE_ACCENTS[char]) {
                    // Handle accented vowels (á, é, í, ó, ú, ü)
                    cells = [{ name: `Letra ${char}`, dots: BrailleData.BRAILLE_ACCENTS[char] }];
                } else if (BrailleData.BRAILLE_MATH && BrailleData.BRAILLE_MATH[char]) {
                    cells = [{ name: `Símbolo ${char}`, dots: BrailleData.BRAILLE_MATH[char] }];
                } else if (BrailleData.BRAILLE_DIGITAL && BrailleData.BRAILLE_DIGITAL[char]) {
                    cells = [{ name: `Símbolo ${char}`, dots: BrailleData.BRAILLE_DIGITAL[char] }];
                } else {
                    const dots = BrailleData.BRAILLE_ALPHABET[char.toLowerCase()];
                    if (dots) {
                        cells = [{ name: `Letra ${char}`, dots: dots }];
                    } else {
                        // Fallback - skip invalid characters
                        continue;
                    }
                }

                questions.push({
                    char: char,
                    cells: cells,
                    type: type
                });
            }

            // Shuffle
            for (let i = questions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questions[i], questions[j]] = [questions[j], questions[i]];
            }

            return questions;
        },

        setupBuildGame() {
            // Reset all dots in build cells
            document.querySelectorAll('#build-prefix-cell .dot-btn, #braille-input .dot-btn, #build-prefix-cell .braille-lesson-dot, #braille-input .braille-lesson-dot').forEach(btn => {
                btn.setAttribute('aria-checked', 'false');
                btn.classList.remove('filled', 'active', 'animating');
                this.updateDotLabel(btn);
            });
        },

        setupPickGame() {
            // Will be set up when nextRound is called
        },

        updateDotLabel(btn) {
            const dotNum = btn.dataset.dot;
            const isRaised = btn.getAttribute('aria-checked') === 'true';
            const position = BrailleData.DOT_POSITIONS[dotNum];
            btn.setAttribute('aria-label', `Punto ${dotNum}, ${position}, ${isRaised ? 'levantado' : 'no levantado'}`);
        },

        nextRound() {
            if (this.currentRound >= this.totalRounds) {
                this.endGame();
                return;
            }

            const question = this.questions[this.currentRound];
            this.currentRound++;

            // Reset build step for multi-cell characters
            this.currentBuildStep = 0;

            // Update progress bar
            const progress = (this.currentRound / this.totalRounds) * 100;
            const type = question.type;

            // Reset all dots in both build cells at start of every round
            document.querySelectorAll('#build-prefix-cell .braille-lesson-dot, #braille-input .braille-lesson-dot, #build-prefix-cell .dot-btn, #braille-input .dot-btn').forEach(btn => {
                btn.setAttribute('aria-checked', 'false');
                btn.classList.remove('filled', 'active', 'animating');
                this.updateDotLabel(btn);
            });

            if (type === 'build') {
                navigateTo('game-build-screen');
                document.getElementById('game-progress-fill').style.width = `${progress}%`;
                document.getElementById('game-progress-text').textContent = `${this.currentRound} / ${this.totalRounds}`;

                // Update the large target letter in the orange circle
                const buildTargetLetter = document.getElementById('build-target-letter');
                if (buildTargetLetter) {
                    buildTargetLetter.textContent = question.char;
                    buildTargetLetter.setAttribute('aria-label', `Objetivo: ${question.char}`);
                }

                // Trigger typewriter effect and audio only on first build round of the lesson
                const buildMsgEl = document.getElementById('build-game-message');
                if (buildMsgEl) {
                    const fullMessage = `Tocá los puntos correctos para construir la letra en Braille.`;
                    if (!this.buildInstructionShown) {
                        this.buildInstructionShown = true;
                        TypewriterController.start(buildMsgEl, fullMessage, {
                            speed: 35,
                            onComplete: () => {
                                buildMsgEl.textContent = fullMessage;
                            }
                        });
                        // Speak the instruction (mascot audio)
                        AudioService.speak(fullMessage);
                    } else {
                        // Just set the text statically on subsequent rounds
                        buildMsgEl.textContent = fullMessage;
                    }
                }

                const buildContainer = document.getElementById('build-cell-container');
                const prefixCell = document.getElementById('build-prefix-cell');
                const mainCell = document.getElementById('build-main-cell');
                const isMultiCell = question.cells.length > 1;

                // Toggle single/dual cell display
                if (buildContainer) buildContainer.classList.toggle('single-cell', !isMultiCell);

                // Update labels
                if (isMultiCell) {
                    const prefixLabel = /[A-Z]/.test(question.char) ? 'Mayúscula' : 'Número';
                    const prefixLabelEl = document.getElementById('prefix-cell-label');
                    const mainLabelEl = document.getElementById('main-cell-label');
                    if (prefixLabelEl) prefixLabelEl.textContent = prefixLabel;
                    if (mainLabelEl) mainLabelEl.textContent = question.char.toLowerCase();

                    // Highlight active cell
                    if (prefixCell) prefixCell.classList.add('active');
                    if (mainCell) mainCell.classList.remove('active');
                } else {
                    const mainLabelEl = document.getElementById('main-cell-label');
                    if (mainLabelEl) mainLabelEl.textContent = question.char;
                }

                if (state.settings.screenReader) {
                    // Use async IIFE to properly sequence audio
                    (async () => {
                        await AudioService.speakAndWait(`Construye: ${question.char}`);
                        if (isMultiCell) {
                            await AudioService.speakAndWait(`Primero construye el signo de ${question.cells[0].name}`);
                        }
                    })();
                }
            } else if (type === 'pick') {
                navigateTo('game-pick-screen');
                document.getElementById('pick-progress-fill').style.width = `${progress}%`;

                document.getElementById('pick-target-letter').textContent = question.char;

                // Trigger typewriter effect for the pick game message
                const pickMsgEl = document.getElementById('pick-game-message');
                if (pickMsgEl) {
                    const fullMessage = `¿Cuál de estas es la ${question.char}?`;
                    TypewriterController.start(pickMsgEl, fullMessage, {
                        speed: 35,
                        onComplete: () => {
                            // Restore highlighted letter after typewriter completes
                            pickMsgEl.innerHTML = `¿Cuál de estas es la <span id="pick-target-letter" class="lesson-letter-highlight">${question.char}</span>?`;
                        }
                    });
                }

                // Generate options
                this.generatePickOptions(question);

                // Announce
                if (state.settings.screenReader) {
                    AudioService.speak(`¿Qué celda es: ${question.char}?`);
                }
            } else if (type === 'observe') {
                // OBSERVE: Show the level description and complete
                // Use instruction screen approach - show info then advance
                navigateTo('instruction-screen');

                const instructionText = document.getElementById('instruction-text');
                if (instructionText) {
                    instructionText.textContent = question.content || this.currentLevel.description;
                }

                // Auto-complete observe levels after showing content
                setTimeout(() => {
                    this.correctAnswers = 1;
                    this.endGame();
                }, 3000);
            } else if (type === 'words') {
                // WORDS: Build words letter by letter using build screen
                navigateTo('game-build-screen');
                document.getElementById('game-progress-fill').style.width = `${progress}%`;
                document.getElementById('game-progress-text').textContent = `${this.currentRound} / ${this.totalRounds}`;

                // For words, show the word and build first letter
                const word = question.word;
                const firstLetter = word[0].toLowerCase();

                // Get dots for first letter
                let dots = BrailleData.BRAILLE_ALPHABET[firstLetter] ||
                    BrailleData.BRAILLE_ACCENTS[firstLetter] ||
                    BrailleData.BRAILLE_SYMBOLS[firstLetter];

                // Create a question format compatible with build checking
                question.char = firstLetter;
                question.cells = [{ name: `Letra ${firstLetter}`, dots: dots }];

                const buildTargetLetter = document.getElementById('build-target-letter');
                if (buildTargetLetter) {
                    buildTargetLetter.textContent = firstLetter.toUpperCase();
                    buildTargetLetter.setAttribute('aria-label', `Palabra: ${word}, letra: ${firstLetter}`);
                }

                const buildMsgEl = document.getElementById('build-game-message');
                if (buildMsgEl) {
                    buildMsgEl.textContent = `Construye la palabra "${word}" - letra por letra`;
                }

                if (state.settings.screenReader) {
                    AudioService.speak(`Construye la palabra ${word}. Primero la letra ${firstLetter}`);
                }
            }
        },

        generatePickOptions(question) {
            const grid = document.getElementById('options-grid');
            const checkBtn = document.getElementById('pick-check-btn');
            grid.innerHTML = '';

            // Reset check button
            if (checkBtn) {
                checkBtn.disabled = true;
                checkBtn.textContent = 'Verificar';
            }

            // Store selected option for later checking
            this.selectedPickOption = null;

            const distractors = BrailleData.generateDistractors(question.char, 3, this.currentLevel.letters);
            const options = [question.char, ...distractors];

            // Shuffle options
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }

            options.forEach((char, index) => {
                let displayCells = [];
                if (/[A-Z]/.test(char)) {
                    displayCells = [BrailleData.SPECIAL_SIGNS.capital, BrailleData.BRAILLE_ALPHABET[char.toLowerCase()]];
                } else if (/[0-9]/.test(char)) {
                    displayCells = [BrailleData.SPECIAL_SIGNS.number, BrailleData.BRAILLE_NUMBERS[char]];
                } else if (BrailleData.BRAILLE_SYMBOLS[char]) {
                    displayCells = [BrailleData.BRAILLE_SYMBOLS[char]];
                } else {
                    displayCells = [BrailleData.BRAILLE_ALPHABET[char.toLowerCase()]];
                }

                const btn = document.createElement('button');
                btn.className = 'pick-v2-option-btn';
                if (displayCells.length > 1) btn.classList.add('multi-cell');
                btn.setAttribute('role', 'radio');
                btn.setAttribute('aria-checked', 'false');
                btn.setAttribute('aria-label', `Opción ${index + 1}: ${BrailleData.getDotsDescription(char)}`);
                btn.dataset.char = char;

                let brailleHTML = '';
                displayCells.forEach(dots => {
                    brailleHTML += `
                        <div class="pick-v2-braille-grid">
                            ${[1, 4, 2, 5, 3, 6].map(d => `<div class="pick-v2-dot ${dots.includes(d) ? 'filled' : ''}"></div>`).join('')}
                        </div>
                    `;
                });

                btn.innerHTML = `
                    ${brailleHTML}
                    <span class="pick-v2-check-mark">
                        <span class="material-symbols-outlined">check_circle</span>
                    </span>
                `;

                btn.addEventListener('click', () => this.selectPickOption(btn, char));
                grid.appendChild(btn);
            });
        },

        selectPickOption(btn, char) {
            // Deselect all options
            document.querySelectorAll('.pick-v2-option-btn, .pick-option-cell').forEach(cell => {
                cell.classList.remove('selected');
                cell.setAttribute('aria-checked', 'false');
            });

            // Select this option
            btn.classList.add('selected');
            btn.setAttribute('aria-checked', 'true');

            // Store selection and enable check button
            this.selectedPickOption = { btn, char };
            const checkBtn = document.getElementById('pick-check-btn');
            if (checkBtn) {
                checkBtn.disabled = false;
            }

            // Haptic feedback
            HapticService.tap();
        },

        checkPickAnswer() {
            // Fix feedback animations logic
            if (!this.selectedPickOption) return;

            const { btn, char } = this.selectedPickOption;
            const question = this.questions[this.currentRound - 1];
            const correctChar = question.char;
            const isCorrect = char === correctChar;

            // Mark correct/incorrect
            document.querySelectorAll('.pick-option-cell, .pick-v2-option-btn').forEach(cell => {
                if (cell.dataset.char === correctChar) {
                    cell.classList.add('correct');
                }
            });

            if (isCorrect) {
                btn.classList.add('correct');
                this.handleCorrect();
            } else {
                btn.classList.add('incorrect');
                this.handleIncorrect(correctChar);
            }

            // Disable further interaction
            const checkBtn = document.getElementById('pick-check-btn');
            if (checkBtn) {
                checkBtn.disabled = true;
            }

            // Move to next round after delay
            setTimeout(() => {
                document.querySelectorAll('.pick-option-cell, .pick-v2-option-btn').forEach(cell => {
                    cell.classList.remove('correct', 'incorrect', 'selected');
                });
                this.selectedPickOption = null;
                this.nextRound();
            }, 1500);
        },

        selectOption(btn, selectedLetter, correctLetter) {
            const isCorrect = selectedLetter === correctLetter;

            // Mark selection
            document.querySelectorAll('.pick-option-cell').forEach(cell => {
                cell.classList.remove('selected');
                if (cell.dataset.letter === correctLetter) {
                    cell.classList.add('correct');
                }
            });

            if (isCorrect) {
                btn.classList.add('correct');
                this.handleCorrect();
            } else {
                btn.classList.add('incorrect');
                this.handleIncorrect(correctLetter);
            }

            // Move to next round after delay
            setTimeout(() => {
                document.querySelectorAll('.pick-option-cell').forEach(cell => {
                    cell.classList.remove('correct', 'incorrect', 'selected');
                });
                this.nextRound();
            }, 1500);
        },

        checkBuildAnswer() {
            const question = this.questions[this.currentRound - 1];
            const isMultiCell = question.cells.length > 1;

            // Determinar qué celda verificar
            // Determinar qué celda verificar - matching fix from braille-input-prefix to build-prefix-cell
            const inputId = isMultiCell && this.currentBuildStep === 0 ? 'build-prefix-cell' : 'braille-input';
            const userDots = [];

            document.querySelectorAll(`#${inputId} .dot-btn`).forEach(btn => {
                if (btn.getAttribute('aria-checked') === 'true') {
                    userDots.push(parseInt(btn.dataset.dot));
                }
            });

            const currentCell = question.cells[this.currentBuildStep];
            const isCellCorrect = BrailleData.dotsMatch(userDots, currentCell.dots);

            if (isCellCorrect) {
                this.currentBuildStep++;

                if (this.currentBuildStep < question.cells.length) {
                    // Correcto para esta celda, pasar a la siguiente
                    AudioService.playSound('correct');
                    AudioService.speak(`¡Correcto! Ahora construye la letra ${question.char.toLowerCase()}`);

                    // Cambiar celda activa
                    document.getElementById('build-prefix-cell').classList.remove('active');
                    document.getElementById('build-main-cell').classList.add('active');

                    return; // No terminar la ronda aún
                } else {
                    // Todas las celdas correctas
                    this.handleCorrect();
                    this.showFeedback(true, question.char);
                }
            } else {
                this.handleIncorrect(question.char);
                this.showFeedback(false, question.char);
            }
        },

        handleCorrect() {
            this.correctAnswers++;
            this.score += 100;
            if (this.hintsUsed === 0) this.score += 50; // No hint bonus

            AudioService.playSound('correct');
            HapticService.success();

            if (state.settings.screenReader) {
                AudioService.speak('¡Correcto!');
            }
        },

        handleIncorrect(correctChar) {
            AudioService.playSound('incorrect');
            HapticService.error();

            const desc = BrailleData.getDotsDescription(correctChar);
            if (state.settings.screenReader) {
                AudioService.speak(`Incorrecto. ${correctChar} es ${desc}`);
            }
        },

        showFeedback(isCorrect, char) {
            const overlay = document.getElementById('feedback-overlay');
            const icon = document.getElementById('feedback-icon');
            const title = document.getElementById('feedback-title');
            const message = document.getElementById('feedback-message');

            // Reset processing flag when showing new feedback
            this.feedbackProcessing = false;

            overlay.classList.remove('hidden', 'success', 'error');
            overlay.classList.add(isCorrect ? 'success' : 'error');

            icon.textContent = isCorrect ? '✓' : '✗';
            title.textContent = isCorrect ? '¡Correcto!' : 'Casi';
            message.textContent = `${char} es ${BrailleData.getDotsDescription(char)}.`;

            document.getElementById('feedback-continue-btn').focus();
        },

        hideFeedback() {
            // Prevent double clicks
            if (this.feedbackProcessing) return;
            this.feedbackProcessing = true;

            document.getElementById('feedback-overlay').classList.add('hidden');
            this.nextRound();
        },

        showHint() {
            const question = this.questions[this.currentRound - 1];
            if (!question) return;

            const char = question.char;
            const desc = BrailleData.getDotsDescription(char);
            // Get dots from the first cell (or current build step for multi-cell)
            const cellIndex = question.cells.length > 1 ? this.currentBuildStep || 0 : 0;
            const dots = question.cells[cellIndex]?.dots || [];

            this.hintsUsed++;
            this.score = Math.max(0, this.score - 25);

            AudioService.speak(`Pista: ${char.toUpperCase()} es ${desc}`);
            HapticService.dots(dots);

            // Visual hint - highlight correct dots or options
            if (question.type === 'build') {
                // Determine which cell to highlight based on build step
                const inputId = question.cells.length > 1 && this.currentBuildStep === 0
                    ? 'build-prefix-cell'
                    : 'braille-input';
                document.querySelectorAll(`#${inputId} .dot-btn, #${inputId} .braille-lesson-dot`).forEach(btn => {
                    const dotNum = parseInt(btn.dataset.dot);
                    if (dots.includes(dotNum)) {
                        btn.classList.add('hint-highlight');
                        setTimeout(() => btn.classList.remove('hint-highlight'), 2000);
                    }
                });
            } else if (question.type === 'pick') {
                document.querySelectorAll('.pick-option-cell, .pick-v2-option-btn').forEach(cell => {
                    if (cell.dataset.char === char) {
                        cell.classList.add('hint-highlight');
                        setTimeout(() => cell.classList.remove('hint-highlight'), 2000);
                    }
                });
            }
        },

        endGame() {
            const timeTaken = Date.now() - this.startTime;
            const accuracy = Math.round((this.correctAnswers / this.totalRounds) * 100);
            const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;

            // Calculate XP
            let xpEarned = Math.round(this.score * (accuracy / 100));

            // Streak bonus
            if (state.progress.currentStreak > 0) {
                xpEarned += 25;
            }

            // Update state
            state.progress.totalXP += xpEarned;

            if (!state.progress.levelsCompleted.includes(this.currentLevel.id)) {
                state.progress.levelsCompleted.push(this.currentLevel.id);
            }

            // Update stars
            const prevStars = state.progress.levelStars[this.currentLevel.id] || 0;
            if (stars > prevStars) {
                state.progress.levelStars[this.currentLevel.id] = stars;
            }

            // Track letters learned
            this.currentLevel.letters.forEach(letter => {
                if (!state.progress.lettersLearned.includes(letter)) {
                    state.progress.lettersLearned.push(letter);
                }
            });

            // Update streak
            const today = new Date().toDateString();
            const lastPlayed = state.progress.lastPlayedAt ? new Date(state.progress.lastPlayedAt).toDateString() : null;

            if (lastPlayed !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                if (lastPlayed === yesterday.toDateString()) {
                    state.progress.currentStreak++;
                } else if (lastPlayed !== today) {
                    state.progress.currentStreak = 1;
                }

                if (state.progress.currentStreak > state.progress.bestStreak) {
                    state.progress.bestStreak = state.progress.currentStreak;
                }
            }

            state.progress.lastPlayedAt = new Date().toISOString();

            // Track daily challenge completion
            if (this.currentLevel?.id === 'daily') {
                const todayDate = new Date().toDateString();
                state.dailyChallenge.date = todayDate;
                state.dailyChallenge.completed = true;
            }

            saveState();

            // Check achievements
            const newAchievements = checkAchievements(accuracy);

            // Show results
            this.showResults(xpEarned, accuracy, stars, newAchievements);
        },

        showResults(xp, accuracy, stars, newAchievements) {
            // Update results screen
            document.getElementById('result-score').textContent = this.score;
            document.getElementById('result-accuracy').textContent = `${accuracy}%`;
            document.getElementById('result-xp').textContent = `+${xp}`;

            // Stars
            const starsContainer = document.getElementById('stars-container');
            starsContainer.innerHTML = '';
            for (let i = 1; i <= 3; i++) {
                const star = document.createElement('span');
                star.className = `result-star ${i <= stars ? 'earned' : ''}`;
                star.textContent = i <= stars ? '⭐' : '☆';
                starsContainer.appendChild(star);
            }
            starsContainer.setAttribute('aria-label', `${stars} de 3 estrellas ganadas`);

            // Streak bonus
            const streakBonus = document.getElementById('streak-bonus');
            if (state.progress.currentStreak > 1) {
                streakBonus.hidden = false;
            } else {
                streakBonus.hidden = true;
            }

            navigateTo('results-screen');

            // Announce
            if (state.settings.screenReader) {
                AudioService.speak(`¡Nivel completado! Ganaste ${stars} estrellas y ${xp} puntos de experiencia. Precisión: ${accuracy} por ciento.`);
            }

            // Show achievement popup if any (Handle queue)
            if (newAchievements.length > 0) {
                this._achievementQueue = [...newAchievements];
                setTimeout(() => {
                    this.showNextQueuedAchievement();
                }, 1500);
            }
        },

        showNextQueuedAchievement() {
            if (!this._achievementQueue || this._achievementQueue.length === 0) return;
            const next = this._achievementQueue.shift();
            showAchievementPopup(next);
        },

        exitGame() {
            navigateTo('dashboard-screen');
            updateDashboard();
        }
    };

    // ================================
    // Achievements
    // ================================

    function checkAchievements(accuracy) {
        const newAchievements = [];

        BrailleData.ACHIEVEMENTS.forEach(achievement => {
            if (state.progress.achievements.includes(achievement.id)) return;

            let earned = false;

            switch (achievement.type) {
                case 'milestone':
                    if (achievement.id === 'first_letter' && state.progress.levelsCompleted.length >= 1) {
                        earned = true;
                    }
                    if (achievement.id === 'level_5' && state.progress.levelsCompleted.length >= 5) {
                        earned = true;
                    }
                    break;

                case 'streak':
                    if (state.progress.currentStreak >= achievement.threshold) {
                        earned = true;
                    }
                    break;

                case 'accuracy':
                    if (accuracy >= achievement.threshold) {
                        earned = true;
                    }
                    break;

                case 'content':
                    if (achievement.id === 'vowel_master') {
                        const vowels = ['a', 'e', 'i', 'o', 'u'];
                        if (vowels.every(v => state.progress.lettersLearned.includes(v))) {
                            earned = true;
                        }
                    }
                    if (achievement.id === 'alphabet_half' && state.progress.lettersLearned.length >= 13) {
                        earned = true;
                    }
                    if (achievement.id === 'alphabet_master' && state.progress.lettersLearned.length >= 26) {
                        earned = true;
                    }
                    break;
            }

            if (earned) {
                state.progress.achievements.push(achievement.id);
                state.progress.totalXP += achievement.xpReward;
                newAchievements.push(achievement);
            }
        });

        if (newAchievements.length > 0) {
            saveState();
        }

        return newAchievements;
    }

    function showAchievementPopup(achievement) {
        const popup = document.getElementById('achievement-popup');
        document.getElementById('achievement-name').textContent = achievement.title;
        document.getElementById('achievement-desc').textContent = achievement.description;
        document.querySelector('.achievement-badge').textContent = achievement.icon;
        document.querySelector('.achievement-xp').textContent = `+${achievement.xpReward} XP`;

        popup.classList.remove('hidden');
        AudioService.playSound('achievement');

        if (state.settings.screenReader) {
            AudioService.speak(`¡Logro desbloqueado! ${achievement.title}. ${achievement.description}. Más ${achievement.xpReward} puntos de experiencia.`);
        }

        document.getElementById('achievement-close').focus();
    }

    function hideAchievementPopup() {
        document.getElementById('achievement-popup').classList.add('hidden');
        // Check for more in queue
        if (GameEngine._achievementQueue && GameEngine._achievementQueue.length > 0) {
            setTimeout(() => {
                GameEngine.showNextQueuedAchievement();
            }, 500);
        }
    }

    // ================================
    // UI Updates
    // ================================

    function updateDashboard() {
        // Greeting
        const name = state.profile.name || 'Aprendiz';
        const greetingEl = document.getElementById('greeting-text');
        if (greetingEl) {
            greetingEl.textContent = '¡Hola, ';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'highlight';
            nameSpan.textContent = name;
            greetingEl.appendChild(nameSpan);
            greetingEl.append('!');
        }

        // Streak
        document.getElementById('streak-count').textContent = state.progress.currentStreak;

        // XP
        document.getElementById('total-xp').textContent = state.progress.totalXP;

        // Update XP progress if element exists
        const xpProgressEl = document.getElementById('xp-progress');
        if (xpProgressEl) {
            const xpProgress = Math.min((state.progress.totalXP % 1000) / 10, 100);
            xpProgressEl.style.width = `${xpProgress}%`;
        }

        // Continue button description - show the NEXT level to play
        let nextLevelForDisplay;
        if (state.progress.levelsCompleted.length === 0) {
            nextLevelForDisplay = BrailleData.LEVELS[0];
        } else {
            // Find highest completed level index
            let highestCompletedIndex = -1;
            state.progress.levelsCompleted.forEach(completedId => {
                const index = BrailleData.LEVELS.findIndex(l => l.id === completedId);
                if (index > highestCompletedIndex) {
                    highestCompletedIndex = index;
                }
            });

            // Get next level after highest completed
            nextLevelForDisplay = BrailleData.LEVELS.slice(highestCompletedIndex + 1).find(l =>
                !state.progress.levelsCompleted.includes(l.id) &&
                state.progress.totalXP >= l.requiredXP &&
                !l.isPremium
            ) || BrailleData.LEVELS[highestCompletedIndex] || BrailleData.LEVELS[0];
        }

        // Update Level Number and Title in Continue Card
        const levelNumEl = document.getElementById('current-level-num');
        const levelTitleEl = document.getElementById('continue-level-title');
        if (levelNumEl) levelNumEl.textContent = nextLevelForDisplay.id;
        if (levelTitleEl) levelTitleEl.textContent = nextLevelForDisplay.title;

        document.getElementById('continue-desc').textContent = `Hoy aprenderás: ${nextLevelForDisplay.letters.join(', ')}`;

        const todayFocus = document.getElementById('today-focus');
        if (todayFocus) {
            todayFocus.textContent = nextLevelForDisplay.letters.join(', ');
        }

        // Update progress bar with real progress
        const totalLevels = BrailleData.LEVELS.filter(l => !l.isPremium).length;
        const completedLevels = state.progress.levelsCompleted.length;
        const progressPercent = totalLevels > 0 ? Math.round((completedLevels / totalLevels) * 100) : 0;

        const progressPercentEl = document.getElementById('progress-percent');
        const progressBarEl = document.getElementById('progress-bar');
        if (progressPercentEl) {
            progressPercentEl.textContent = `${progressPercent}%`;
        }
        if (progressBarEl) {
            progressBarEl.style.width = `${progressPercent}%`;
        }

        // Update levels completed stat
        const levelsCompletedEl = document.getElementById('levels-completed');
        if (levelsCompletedEl) {
            levelsCompletedEl.textContent = completedLevels;
        }

        // Update upcoming achievements
        updateUpcomingAchievements();
    }

    function updateUpcomingAchievements() {
        const nextAchievementsContainer = document.getElementById('next-achievements');
        if (!nextAchievementsContainer) return;

        // Find next 2 locked achievements
        const lockedAchievements = BrailleData.ACHIEVEMENTS.filter(ach =>
            !state.progress.achievements.includes(ach.id)
        ).slice(0, 2);

        if (lockedAchievements.length === 0) {
            nextAchievementsContainer.innerHTML = `
                <div class="achievement-row">
                    <div class="achievement-icon-box">🏆</div>
                    <div class="achievement-info">
                        <h4>¡Todos los logros completados!</h4>
                        <p>Eres un maestro del Braille.</p>
                    </div>
                </div>
            `;
            return;
        }

        nextAchievementsContainer.innerHTML = lockedAchievements.map(ach => `
            <div class="achievement-row locked">
                <div class="achievement-icon-box">🔒</div>
                <div class="achievement-info">
                    <h4>${ach.title}</h4>
                    <p>${ach.description}</p>
                </div>
            </div>
        `).join('');
    }

    function updateLevelsScreen() {
        const levelsList = document.getElementById('levels-list');
        if (!levelsList) return;

        // Group levels by chapter
        const chapters = {};
        BrailleData.LEVELS.forEach(level => {
            if (!chapters[level.chapter]) {
                chapters[level.chapter] = {
                    number: level.chapter,
                    title: getChapterTitle(level.chapter),
                    levels: []
                };
            }
            chapters[level.chapter].levels.push(level);
        });

        // Build HTML
        let html = '';
        Object.values(chapters).forEach(chapter => {
            // Calculate chapter progress
            const completedInChapter = chapter.levels.filter(l =>
                state.progress.levelsCompleted.includes(l.id)
            ).length;
            const progressPercent = Math.round((completedInChapter / chapter.levels.length) * 100);

            // Check if chapter is locked (no levels unlocked)
            const isChapterLocked = !chapter.levels.some(l =>
                state.progress.totalXP >= l.requiredXP || state.progress.levelsCompleted.includes(l.id)
            );

            // Unit card + chapter section
            html += `
                <div class="chapter-section">
                    <section class="unit-card-new ${isChapterLocked ? 'locked' : ''}">
                        <div class="unit-bg-circle top"></div>
                        <div class="unit-bg-circle bottom"></div>
                        <div class="unit-content">
                            <div class="unit-info">
                                <span class="unit-label">UNIDAD ${chapter.number}</span>
                                <h1 class="unit-title">${chapter.title}</h1>
                                <p class="unit-progress">${isChapterLocked ? 'Bloqueada' : `Progreso general: ${progressPercent}%`}</p>
                            </div>
                            <button class="unit-book-btn" aria-label="Ver contenido">
                                <span class="unit-book-icon">📖</span>
                            </button>
                        </div>
                    </section>
                    <div class="chapter-cards">
            `;

            chapter.levels.forEach((level, levelIndex) => {
                const hasEnoughXP = state.progress.totalXP >= level.requiredXP && !level.isPremium;
                const isCompleted = state.progress.levelsCompleted.includes(level.id);
                const stars = state.progress.levelStars[level.id] || 0;

                // Check if previous level is completed (for sequential unlock)
                const previousLevel = chapter.levels[levelIndex - 1];
                const previousCompleted = !previousLevel || state.progress.levelsCompleted.includes(previousLevel.id);

                // Level is truly unlocked only if has enough XP AND previous level is completed
                const isUnlocked = hasEnoughXP && previousCompleted;

                // This is the current level if it's unlocked but not completed
                const isCurrent = isUnlocked && !isCompleted;

                let stateClass = 'locked';
                let circleHtml = '<span class="circle-icon">🔒</span>';
                let subtitleHtml = '<span class="level-card-subtitle muted">Completa la lección anterior</span>';

                if (isCompleted) {
                    stateClass = 'completed';
                    circleHtml = '<span class="circle-icon check">✓</span>';
                    subtitleHtml = `
                        <div class="level-card-stars">
                            ${[1, 2, 3].map(i => `<span class="star-mini ${i <= stars ? 'earned' : ''}">★</span>`).join('')}
                        </div>
                    `;
                } else if (isCurrent) {
                    stateClass = 'current';
                    circleHtml = '<span class="circle-icon play">▶</span>';
                    subtitleHtml = '<span class="level-card-subtitle current">¡Sigue aprendiendo!</span>';
                } else if (isUnlocked) {
                    stateClass = 'unlocked';
                    circleHtml = '<span class="circle-icon">' + level.number + '</span>';
                    subtitleHtml = '';
                }

                html += `
                    <button class="level-card ${stateClass}" data-level="${level.id}" 
                            aria-label="Nivel ${level.number}: ${level.title}, ${isCompleted ? 'completado' : isCurrent ? 'actual' : isUnlocked ? 'desbloqueado' : 'bloqueado'}">
                        <div class="level-card-circle ${stateClass}">
                            ${circleHtml}
                        </div>
                        <div class="level-card-info">
                            <span class="level-card-title">${level.title}</span>
                            ${subtitleHtml}
                        </div>
                        ${isCurrent ? '<div class="level-card-accent"></div>' : ''}
                    </button>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        levelsList.innerHTML = html;

        // Re-attach click handlers
        document.querySelectorAll('#levels-list .level-card').forEach(node => {
            node.addEventListener('click', () => {
                const levelId = node.dataset.level;
                const level = BrailleData.LEVELS.find(l => l.id === levelId);

                if (!level) return;

                if (node.classList.contains('locked') && !level.isPremium) {
                    AudioService.speak(`Este nivel requiere ${level.requiredXP} puntos de experiencia para desbloquearse.`);
                    return;
                }

                if (level.isPremium) {
                    AudioService.speak('Este es contenido premium. Mejora para acceder.');
                    return;
                }

                state.session.currentLevel = level;
                navigateTo('lesson-intro-screen');
                updateLessonIntro(level);
            });
        });
    }

    function getChapterTitle(chapterNum) {
        const titles = {
            1: 'Los Fundamentos',
            2: 'Vocales y Más',
            3: 'Construyendo Palabras',
            4: 'Alfabeto Completo',
            5: 'Maestría',
            6: 'Mayúsculas',
            7: 'Números',
            8: 'Símbolos'
        };
        return titles[chapterNum] || `Capítulo ${chapterNum}`;
    }

    // Note: updateProgressScreen is defined below with full achievements support

    function updateSettingsScreen() {
        // Update profile info
        const name = state.profile.name || 'Aprendiz';
        const email = state.profile.email || 'Sin correo configurado';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'AP';

        const nameEl = document.getElementById('settings-name');
        const emailEl = document.getElementById('settings-email');
        const initialsEl = document.getElementById('settings-initials');

        if (nameEl) nameEl.textContent = name;
        if (emailEl) emailEl.textContent = email;
        if (initialsEl) initialsEl.textContent = initials;

        // Update toggle states
        document.getElementById('settings-screen-reader')?.classList.toggle('on', state.settings.screenReader);
        document.getElementById('settings-screen-reader')?.setAttribute('aria-checked', state.settings.screenReader);

        document.getElementById('settings-haptic')?.classList.toggle('on', state.settings.hapticFeedback);
        document.getElementById('settings-haptic')?.setAttribute('aria-checked', state.settings.hapticFeedback);

        document.getElementById('settings-contrast')?.classList.toggle('on', state.settings.highContrast);
        document.getElementById('settings-contrast')?.setAttribute('aria-checked', state.settings.highContrast);

        document.getElementById('settings-timed')?.classList.toggle('on', state.settings.timedChallenges);
        document.getElementById('settings-timed')?.setAttribute('aria-checked', state.settings.timedChallenges);

        document.getElementById('settings-reminders')?.classList.toggle('on', state.settings.reminders);
        document.getElementById('settings-reminders')?.setAttribute('aria-checked', state.settings.reminders);

        document.getElementById('settings-email-notif')?.classList.toggle('on', state.settings.newsUpdates);
        document.getElementById('settings-email-notif')?.setAttribute('aria-checked', state.settings.newsUpdates);

        // Speed buttons
        document.querySelectorAll('.speed-btn-new').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.speed) === state.settings.audioSpeed);
        });
    }

    function updatePracticeScreen() {
        const setup = state.session.practiceSetup;

        // Update counts
        const allLearnedCount = state.progress.lettersLearned.length;
        const learnedCountLabel = document.getElementById('learned-count');
        if (learnedCountLabel) learnedCountLabel.textContent = `${allLearnedCount} letras aprendidas`;

        // Update active states for game types
        document.querySelectorAll('.game-type-option').forEach(opt => {
            const active = opt.dataset.type === setup.gameType;
            opt.classList.toggle('active', active);
            opt.setAttribute('aria-checked', active);
        });

        // Update active states for filters
        document.querySelectorAll('.letter-filter-option').forEach(opt => {
            const active = opt.dataset.filter === setup.filter;
            opt.classList.toggle('active', active);
            opt.setAttribute('aria-checked', active);
        });

        // Custom picker visibility
        const customPicker = document.getElementById('custom-letter-picker');
        if (customPicker) {
            customPicker.classList.toggle('hidden', setup.filter !== 'custom');
            if (setup.filter === 'custom') updatePracticeLetterGrid();
        }

        // Rounds
        document.querySelectorAll('.round-option').forEach(opt => {
            opt.classList.toggle('active', parseInt(opt.dataset.rounds) === setup.rounds);
        });

        // Toggles
        document.getElementById('practice-timed-toggle')?.setAttribute('aria-checked', setup.timedMode);
        document.getElementById('practice-hints-toggle')?.setAttribute('aria-checked', setup.hints);
    }

    function updatePracticeLetterGrid() {
        const grid = document.getElementById('letter-grid');
        if (!grid) return;

        grid.innerHTML = '';
        const learned = state.progress.lettersLearned;

        if (learned.length === 0) {
            grid.innerHTML = '<p class="no-letters-message">¡Completa algunos niveles primero para desbloquear letras para practicar!</p>';
            return;
        }

        learned.forEach(letter => {
            const btn = document.createElement('button');
            btn.className = 'letter-pick-node';
            if (state.session.practiceSetup.customLetters.includes(letter)) {
                btn.classList.add('selected');
            }
            btn.innerHTML = `
                <span class="letter-char">${letter.toUpperCase()}</span>
                <span class="selection-indicator">✓</span>
            `;

            btn.addEventListener('click', () => {
                const index = state.session.practiceSetup.customLetters.indexOf(letter);
                if (index > -1) {
                    state.session.practiceSetup.customLetters.splice(index, 1);
                    btn.classList.remove('selected');
                } else {
                    state.session.practiceSetup.customLetters.push(letter);
                    btn.classList.add('selected');
                }
                HapticService.tap();
            });

            grid.appendChild(btn);
        });
    }

    function startPracticeSession() {
        const setup = state.session.practiceSetup;
        let selectedLetters = [];

        // Filter letters
        if (setup.filter === 'learned') {
            selectedLetters = state.progress.lettersLearned;
        } else if (setup.filter === 'vowels') {
            selectedLetters = state.progress.lettersLearned.filter(l => ['a', 'e', 'i', 'o', 'u'].includes(l));
        } else if (setup.filter === 'custom') {
            selectedLetters = setup.customLetters;
        } else if (setup.filter === 'recent') {
            selectedLetters = state.progress.lettersLearned.slice(-5);
        }

        // Fallback or validation
        if (selectedLetters.length === 0) {
            AudioService.speak("Por favor selecciona algunas letras para practicar primero.");
            HapticService.error();
            return;
        }

        // Randomize letters if we have many
        const pool = [...selectedLetters];

        // Determine game type (mixed handles type per round in generateQuestions)
        let gameType = setup.gameType;

        const practiceLevel = {
            id: 'practice',
            title: 'Modo Práctica',
            description: 'Sesión de práctica personalizada',
            letters: pool,
            gameType: gameType,
            rounds: setup.rounds,
            xpPerRound: 2, // Practice gives consistent lower XP
            hintsAllowed: setup.hints,
            isTimed: setup.timedMode
        };

        state.session.currentLevel = practiceLevel;
        GameEngine.startLevel(practiceLevel);
        AudioService.speak(`Iniciando sesión de práctica con ${setup.rounds} rondas.`);
    }

    function applySettings() {
        const app = document.getElementById('app');

        // High contrast
        app.classList.toggle('high-contrast', state.settings.highContrast);

        // Font size
        const fontSize = state.settings.fontSize || 'normal';
        app.classList.remove('font-normal', 'font-large', 'font-extra-large');
        app.classList.add(`font-${fontSize}`);
    }

    // ================================
    // Event Handlers
    // ================================

    function setupEventListeners() {
        // Navigation Bar (Event Delegation)
        const mainNav = document.getElementById('main-nav');
        if (mainNav) {
            mainNav.addEventListener('click', (e) => {
                // Support both old .nav-item and new .nav-tab classes
                const navItem = e.target.closest('.nav-item, .nav-tab');
                if (!navItem) return;

                const screenId = navItem.dataset.screen;
                if (!screenId || state.session.currentScreen === screenId) return;

                HapticService.tap();
                navigateTo(screenId);

                // Update specific screen content
                if (screenId === 'dashboard-screen') updateDashboard();
                if (screenId === 'levels-screen') updateLevelsScreen();
                if (screenId === 'practice-screen') updatePracticeScreen();
                if (screenId === 'progress-screen') updateProgressScreen();
                if (screenId === 'settings-screen') updateSettingsScreen();

                window.scrollTo(0, 0);
            });
        }

        // Settings Screen Handlers
        const settingsScreen = document.getElementById('settings-screen');
        if (settingsScreen) {
            settingsScreen.addEventListener('click', async (e) => {
                const target = e.target;

                // Profile Edit
                if (target.closest('.profile-edit-btn')) {
                    const newName = prompt('Ingresa tu nombre:', state.profile.name);
                    if (newName !== null) {
                        const trimmedName = newName.trim();
                        if (trimmedName) {
                            state.profile.name = trimmedName;
                            const email = prompt('Ingresa tu correo electrónico:', state.profile.email);
                            if (email !== null) {
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (emailRegex.test(email.trim())) {
                                    state.profile.email = email.trim();
                                    saveState();
                                    updateSettingsScreen();
                                    if (dataSyncModule) await dataSyncModule.saveProfile(state.profile, state.profile.supabaseUserId);
                                } else {
                                    alert('Por favor ingresa un correo electrónico válido.');
                                }
                            } else {
                                saveState();
                                updateSettingsScreen();
                                if (dataSyncModule) await dataSyncModule.saveProfile(state.profile, state.profile.supabaseUserId);
                            }
                        }
                    }
                    return;
                }

                // Toggles
                const toggle = target.closest('.toggle-switch-new');
                if (toggle) {
                    const id = toggle.id;
                    let settingKey = '';

                    switch (id) {
                        case 'settings-screen-reader': settingKey = 'screenReader'; break;
                        case 'settings-haptic': settingKey = 'hapticFeedback'; break;
                        case 'settings-contrast': settingKey = 'highContrast'; break;
                        case 'settings-timed': settingKey = 'timedChallenges'; break;
                        case 'settings-reminders': settingKey = 'reminders'; break;
                        case 'settings-email-notif': settingKey = 'newsUpdates'; break;
                    }

                    if (settingKey) {
                        state.settings[settingKey] = !state.settings[settingKey];
                        if (settingKey === 'screenReader') {
                            SpeechController.ensureLessonAudioEnabled('mode_switch');
                        }
                        HapticService.tap();
                        saveState();
                        updateSettingsScreen();
                        if (settingKey === 'highContrast') applySettings();
                        if (dataSyncModule) await dataSyncModule.saveSettings(state.settings, state.profile.supabaseUserId);
                    }
                    return;
                }

                // Audio Speed
                const speedBtn = target.closest('.speed-btn-new');
                if (speedBtn) {
                    const speed = parseFloat(speedBtn.dataset.speed);
                    state.settings.audioSpeed = speed;
                    HapticService.tap();
                    saveState();
                    updateSettingsScreen();
                    if (dataSyncModule) await dataSyncModule.saveSettings(state.settings, state.profile.supabaseUserId);
                    return;
                }

                // Logout
                if (target.closest('#settings-logout')) {
                    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                        if (signOutFunc) {
                            await signOutFunc();
                        } else {
                            // Fallback if Supabase not loaded
                            state.session.isAuthenticated = false;
                            state.profile.supabaseUserId = null;
                            saveState();
                            navigateTo('welcome-screen');
                        }
                    }
                    return;
                }

                // Back Button
                if (target.closest('#settings-back-btn')) {
                    navigateTo('dashboard-screen');
                    updateDashboard();
                    return;
                }
            });
        }

        // Welcome screen button handlers
        const welcomeStartBtn = document.getElementById('welcome-start-btn');

        if (!welcomeStartBtn) {
            console.error('❌ welcome-start-btn not found!');
        } else {
            console.log('✅ welcome-start-btn found');
            welcomeStartBtn.addEventListener('click', () => {
                console.log('🚀 Start button clicked');
                // Skip authentication - go directly to dashboard
                navigateTo('dashboard-screen');
            });
        }

        // ================================
        // Auth Screen Event Handlers
        // ================================

        // Import auth functions dynamically (since Supabase uses ES Modules)
        let signInWithMagicLink = null;
        let signInWithGoogle = null;
        let signOutFunc = null;
        let authEmail = '';

        // Initialize Supabase auth (async)
        let dataSyncModule = null;

        (async function initSupabaseAuth() {
            try {
                const supabaseModule = await import('./src/lib/supabase.js');
                signInWithMagicLink = supabaseModule.signInWithMagicLink;
                signInWithGoogle = supabaseModule.signInWithGoogle;
                signOutFunc = supabaseModule.signOut;

                // Import data sync module
                dataSyncModule = await import('./src/lib/dataSync.js');

                // Mutex lock to prevent race conditions in auth processing
                let authSessionPromise = null;
                let processedUserId = null;

                // Shared Auth Handler with mutex lock (prevents race conditions)
                async function handleAuthSession(session) {
                    if (session?.user) {
                        const userId = session.user.id;

                        // Skip if we already successfully processed this exact user
                        if (processedUserId === userId) {
                            console.log('⏭️ Session already processed for user, skipping');
                            return;
                        }

                        // If another call is already processing, wait for it
                        if (authSessionPromise) {
                            console.log('⏳ Auth processing in progress, waiting...');
                            await authSessionPromise;
                            // After waiting, check if it was for the same user
                            if (processedUserId === userId) {
                                console.log('⏭️ Session was processed while waiting, skipping');
                                return;
                            }
                        }

                        // Create a new promise for this processing attempt
                        let resolveAuth;
                        authSessionPromise = new Promise(resolve => { resolveAuth = resolve; });

                        try {
                            console.log('🔐 Acquired auth lock for:', session.user.email);

                            console.log('✅ Handling Auth Session:', session.user.email);

                            state.session.isAuthenticated = true;
                            state.profile.supabaseUserId = session.user.id;
                            state.profile.email = session.user.email;

                            // Load Data - pass user ID directly to avoid redundant getCurrentUser() call
                            // Use timeout to prevent hanging if database is slow/unreachable
                            if (dataSyncModule) {
                                try {
                                    const loadDataWithTimeout = Promise.race([
                                        dataSyncModule.loadUserData(session.user.id),
                                        new Promise((_, reject) =>
                                            setTimeout(() => reject(new Error('Data load timeout')), 5000)
                                        )
                                    ]);

                                    const userData = await loadDataWithTimeout;
                                    if (userData) {
                                        const appData = dataSyncModule.toAppState(userData);
                                        if (appData) {
                                            state.profile = { ...state.profile, ...appData.profile };
                                            state.settings = { ...state.settings, ...appData.settings };
                                            state.progress = { ...state.progress, ...appData.progress };
                                            state.pet = { ...state.pet, ...appData.pet };
                                        }
                                    }
                                    lastCloudLoadSucceeded = true;
                                } catch (dataError) {
                                    console.warn('⚠️ Could not load user data from cloud:', dataError.message);
                                    // Continue anyway with local state - don't block navigation
                                    lastCloudLoadSucceeded = false;
                                }
                            }

                            saveState();

                            // Clean URL
                            if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery'))) {
                                window.history.replaceState(null, '', window.location.pathname);
                            }

                            // Mark as successfully processed before navigation
                            processedUserId = userId;

                            // Decide Destination based on EXPLICIT onboarding flag
                            if (state.profile.onboardingCompleted === true) {
                                console.log('✅ Onboarding completed - going to Dashboard');
                                navigateTo('dashboard-screen');
                                updateDashboard();
                            } else {
                                console.log('ℹ️ Onboarding NOT completed - going to Profile Setup');
                                navigateTo('profile-screen');
                            }
                        } finally {
                            // Always release the lock
                            console.log('🔓 Releasing auth lock');
                            resolveAuth();
                            authSessionPromise = null;
                        }
                    } else {
                        // No session -> Welcome
                        state.session.isAuthenticated = false;

                        // Only redirect to welcome if we are on a protected screen
                        const protectedScreens = ['dashboard-screen', 'profile-screen', 'levels-screen', 'games-screen', 'practice-screen', 'progress-screen', 'settings-screen'];
                        if (protectedScreens.includes(state.session.currentScreen)) {
                            navigateTo('welcome-screen');
                        }
                    }
                } // Close handleAuthSession

                let isRedirecting = false;

                // Check for auth callback (user clicked magic link or OAuth)
                // NOTE: We deliberately skip INITIAL_SESSION here to avoid race conditions.
                // The initial session is handled by getSession() below as the single source of truth.
                supabaseModule.onAuthStateChange(async (event, session) => {
                    console.log('Auth state changed:', event);

                    // If we detect a signed out event BUT we know we are redirecting, ignore it
                    if (event === 'SIGNED_OUT' && isRedirecting) {
                        console.log('⚠️ Ignoring SIGNED_OUT event during redirect phase');
                        return;
                    }

                    // Handle SIGNED_IN for new logins (OAuth redirects, magic links)
                    // Skip INITIAL_SESSION - it's handled by getSession() to avoid double-processing
                    if (event === 'SIGNED_IN' && session) {
                        await handleAuthSession(session);
                    } else if (event === 'TOKEN_REFRESHED' && session && !processedUserId) {
                        // Handle token refresh only if we haven't processed a session yet
                        await handleAuthSession(session);
                    } else if (event === 'SIGNED_OUT') {
                        processedUserId = null; // Reset guard for next login
                        state.session.isAuthenticated = false;
                        state.profile.supabaseUserId = null;
                        navigateTo('welcome-screen');
                    }
                });

                // Initial Check
                const session = await supabaseModule.getSession();
                if (session) {
                    await handleAuthSession(session);
                } else {
                    // Determine if we are in an auth redirect flow
                    const hash = window.location.hash;
                    const search = window.location.search;

                    // More aggressive check: check localStorage for Supabase's own recovery flag 
                    // or if we just recently initiated a login
                    const isAuthRedirect = (
                        hash.includes('access_token') ||
                        hash.includes('type=recovery') ||
                        search.includes('code=') ||
                        search.includes('error=') ||
                        // Supabase sometimes clears hash before we see it, so check if we are on the root 
                        // and came from an OAuth provider (referrer check is unreliable, but timing is key)
                        (history.state && history.state.flow === 'oauth')
                    );

                    if (isAuthRedirect) {
                        console.log('🔄 Auth redirect detected in URL - Waiting for session to initialize...');
                        isRedirecting = true;
                        // Force splash screen to stay active
                        const splashTitle = document.querySelector('#splash-screen h1');
                        if (splashTitle) splashTitle.textContent = "Iniciando sesión...";

                        // Safety timeout: if 5 seconds pass and no session, force welcome
                        setTimeout(() => {
                            if (!state.session.isAuthenticated) {
                                console.warn('⏰ Auth timeout - forcing welcome screen');
                                navigateTo('welcome-screen');
                            }
                        }, 5000);
                    } else {
                        // Normal boot, no session, no redirect params
                        if (state.session.currentScreen === 'splash') {
                            navigateTo('welcome-screen');
                        }
                    }
                }

                // Global safety timeout: if we're still on splash after 8 seconds, force navigation
                // This catches edge cases where auth events don't fire properly
                setTimeout(() => {
                    if (state.session.currentScreen === 'splash') {
                        console.warn('⏰ Global splash timeout - forcing navigation');
                        if (state.session.isAuthenticated) {
                            navigateTo('dashboard-screen');
                            updateDashboard();
                        } else {
                            navigateTo('welcome-screen');
                        }
                    }
                }, 8000);

                console.log('✅ Supabase auth initialized');
            } catch (error) {
                console.error('Failed to initialize Supabase auth:', error);
                // If Supabase fails to initialize, don't leave user stuck on splash
                if (state.session.currentScreen === 'splash') {
                    navigateTo('welcome-screen');
                }
            }
        })();

        // Auth back button
        const authBackBtn = document.getElementById('auth-back-btn');
        if (authBackBtn) {
            authBackBtn.addEventListener('click', () => {
                // Reset auth screen state
                showAuthStep('email');
                document.getElementById('auth-email').value = '';
                document.getElementById('auth-error').classList.add('hidden');
                navigateTo('splash-screen');
            });
        }

        // Guest button on auth screen
        const authGuestBtn = document.getElementById('auth-guest-btn');
        if (authGuestBtn) {
            authGuestBtn.addEventListener('click', () => {
                if (state.session.isFirstLaunch) {
                    navigateTo('profile-screen');
                } else {
                    navigateTo('dashboard-screen');
                    updateDashboard();
                }
            });
        }

        // Auth form submission
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const emailInput = document.getElementById('auth-email');
                const errorEl = document.getElementById('auth-error');
                authEmail = emailInput.value.trim();

                if (!authEmail) {
                    errorEl.textContent = 'Por favor ingresa tu correo electrónico.';
                    errorEl.classList.remove('hidden');
                    return;
                }

                // Show loading state
                showAuthStep('loading');
                errorEl.classList.add('hidden');

                if (signInWithMagicLink) {
                    const result = await signInWithMagicLink(authEmail);

                    if (result.success) {
                        // Show success state
                        document.getElementById('auth-sent-email').textContent = authEmail;
                        showAuthStep('sent');
                    } else {
                        // Show error
                        showAuthStep('email');
                        errorEl.textContent = result.error || 'Error al enviar el enlace. Intenta de nuevo.';
                        errorEl.classList.remove('hidden');
                    }
                } else {
                    // Supabase not loaded - show error
                    showAuthStep('email');
                    errorEl.textContent = 'Error de conexión. Intenta de nuevo.';
                    errorEl.classList.remove('hidden');
                }
            });
        }

        // Resend magic link button
        const resendBtn = document.getElementById('auth-resend-btn');
        if (resendBtn) {
            resendBtn.addEventListener('click', async () => {
                if (signInWithMagicLink && authEmail) {
                    showAuthStep('loading');
                    const result = await signInWithMagicLink(authEmail);
                    if (result.success) {
                        showAuthStep('sent');
                    } else {
                        showAuthStep('email');
                        const errorEl = document.getElementById('auth-error');
                        errorEl.textContent = result.error || 'Error al reenviar. Intenta de nuevo.';
                        errorEl.classList.remove('hidden');
                    }
                }
            });
        }

        // Google sign-in button
        const googleBtn = document.getElementById('auth-google-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', async () => {
                const errorEl = document.getElementById('auth-error');
                errorEl.classList.add('hidden');

                if (signInWithGoogle) {
                    const result = await signInWithGoogle();
                    if (!result.success) {
                        errorEl.textContent = result.error || 'Error al iniciar con Google. Intenta de nuevo.';
                        errorEl.classList.remove('hidden');
                    }
                    // If successful, Supabase will redirect to Google then back to our app
                } else {
                    errorEl.textContent = 'Error de conexión. Recarga la página.';
                    errorEl.classList.remove('hidden');
                }
            });
        }

        // Helper function to show auth steps
        function showAuthStep(step) {
            document.querySelectorAll('.auth-step').forEach(el => el.classList.remove('active'));
            const stepEl = document.getElementById(`auth-step-${step}`);
            if (stepEl) stepEl.classList.add('active');
        }

        // Dashboard Stat Card - Lessons Link
        document.querySelector('.stat-card-new.blue')?.addEventListener('click', () => {
            HapticService.tap();
            navigateTo('levels-screen');
            updateLevelsScreen();
        });

        // Achievements Link
        document.getElementById('next-achievements')?.addEventListener('click', () => {
            HapticService.tap();
            navigateTo('progress-screen');
            updateProgressScreen();
        });

        // Onboarding toggles
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const current = toggle.getAttribute('aria-checked') === 'true';
                toggle.setAttribute('aria-checked', !current);
                HapticService.tap();

                // Update state based on ID
                if (toggle.id.includes('screen-reader')) {
                    state.settings.screenReader = !current;
                    SpeechController.ensureLessonAudioEnabled('onboarding-toggle');
                } else if (toggle.id.includes('haptic')) {
                    state.settings.hapticFeedback = !current;
                } else if (toggle.id.includes('contrast')) {
                    state.settings.highContrast = !current;
                    applySettings();
                } else if (toggle.id.includes('timed')) {
                    state.settings.timedChallenges = !current;
                }

                saveState();
            });
        });

        // Size selector
        document.querySelectorAll('.size-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.size-option').forEach(o => {
                    o.classList.remove('active');
                    o.setAttribute('aria-checked', 'false');
                });
                option.classList.add('active');
                option.setAttribute('aria-checked', 'true');

                state.settings.fontSize = option.dataset.size;
                applySettings();
                saveState();
                HapticService.tap();
            });
        });

        // Onboarding continue
        document.getElementById('onboarding-continue')?.addEventListener('click', () => {
            navigateTo('profile-screen');
        });

        // Avatar Selection
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                state.profile.avatar = option.dataset.avatar;
                HapticService.tap();
            });
        });


        // ================================
        // New One-Time Profile Setup Flow
        // ================================

        // Helper to handle card selection
        function setupCardSelection(containerId, stateKey, isMulti = false) {
            const container = document.getElementById(containerId);
            if (!container) return;

            container.querySelectorAll('.card-option').forEach(card => {
                card.addEventListener('click', () => {
                    if (isMulti) {
                        // Multi-select behavior
                        card.classList.toggle('active');
                        HapticService.tap();

                        // Update state
                        const value = card.dataset.goal || card.dataset.pref;
                        const array = state.profile[stateKey];
                        if (card.classList.contains('active')) {
                            if (!array.includes(value)) array.push(value);
                        } else {
                            const index = array.indexOf(value);
                            if (index > -1) array.splice(index, 1);
                        }
                    } else {
                        // Single-select behavior
                        container.querySelectorAll('.card-option').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        HapticService.tap();

                        // Update state
                        const value = card.dataset.role || card.dataset.exp;
                        state.profile[stateKey] = value;
                    }
                });
            });
        }

        // Initialize selection logic
        setupCardSelection('profile-role-grid', 'role', false);
        setupCardSelection('profile-exp-grid', 'brailleExperience', false);
        setupCardSelection('profile-goals-grid', 'learningGoals', true);
        setupCardSelection('profile-prefs-grid', 'learningPreferences', true);

        // Step 1: Continue Button
        document.getElementById('profile-step-1-continue')?.addEventListener('click', () => {
            const nameInput = document.getElementById('profile-name');
            const name = nameInput?.value.trim() || '';

            if (name) {
                state.profile.name = name;
            }

            // Simple validation: Ensure at least name or a selection is made to feel "progress"
            // But we don't strictly block to keep it "Friendly & Non-intrusive"

            // Transition to Step 2
            document.getElementById('profile-step-1').classList.remove('active');
            setTimeout(() => {
                document.getElementById('profile-step-2').classList.add('active');
                window.scrollTo(0, 0);
            }, 300); // Wait for fade out
        });

        // Step 2: Finish Button ("Start Learning")
        document.getElementById('profile-finish')?.addEventListener('click', () => {
            completeOnboarding();
        });

        // Skip Buttons
        document.querySelectorAll('#profile-skip').forEach(btn => {
            btn.addEventListener('click', () => {
                completeOnboarding();
            });
        });

        function completeOnboarding() {
            // Set final timestamp
            state.profile.createdAt = state.profile.createdAt || new Date().toISOString();

            // Save everything
            saveState();

            // Show final friendly message toast or just navigate
            // For now, smooth navigation
            navigateTo('dashboard-screen');
            updateDashboard();
        }

        // Dashboard navigation
        document.getElementById('continue-btn')?.addEventListener('click', () => {
            // Find the next level to play based on progression
            let nextLevel;

            if (state.progress.levelsCompleted.length === 0) {
                // No levels completed yet - start at Level 1
                nextLevel = BrailleData.LEVELS[0];
            } else {
                // Find the highest completed level index
                let highestCompletedIndex = -1;
                state.progress.levelsCompleted.forEach(completedId => {
                    const index = BrailleData.LEVELS.findIndex(l => l.id === completedId);
                    if (index > highestCompletedIndex) {
                        highestCompletedIndex = index;
                    }
                });

                // Look for the next uncompleted level after the highest completed
                nextLevel = BrailleData.LEVELS.slice(highestCompletedIndex + 1).find(l =>
                    !state.progress.levelsCompleted.includes(l.id) &&
                    state.progress.totalXP >= l.requiredXP &&
                    !l.isPremium
                );

                // If no next level found (all completed or locked), replay the last level
                if (!nextLevel) {
                    nextLevel = BrailleData.LEVELS[highestCompletedIndex] || BrailleData.LEVELS[0];
                }
            }

            debugLesson('dashboard_continue', {
                lessonId: nextLevel?.id || null,
                userId: state.profile.supabaseUserId || null,
                progress: {
                    totalXP: state.progress.totalXP,
                    levelsCompleted: state.progress.levelsCompleted.length
                }
            });

            state.session.currentLevel = nextLevel;
            navigateTo('lesson-intro-screen');
            updateLessonIntro(nextLevel);
        });

        document.getElementById('daily-challenge-btn')?.addEventListener('click', () => {
            const today = new Date().toDateString();

            // Reset stale completion marker when a new day starts
            if (state.dailyChallenge.date !== today) {
                state.dailyChallenge.completed = false;
            }

            const alreadyCompletedToday = state.dailyChallenge.completed && state.dailyChallenge.date === today;
            if (alreadyCompletedToday) {
                AudioService.speak('Ya completaste el reto de hoy. ¡Vuelve mañana!');
                return;
            }

            // Start a pick game with random learned letters
            const letters = state.progress.lettersLearned.length >= 3
                ? state.progress.lettersLearned
                : ['a', 'b', 'c'];

            const dailyLevel = {
                id: 'daily',
                title: 'Reto Diario',
                letters: letters.slice(0, 5),
                gameType: 'pick',
                rounds: 5
            };

            state.session.currentLevel = dailyLevel;
            GameEngine.startLevel('daily');
        });



        document.getElementById('progress-btn')?.addEventListener('click', () => {
            navigateTo('progress-screen');
            updateProgressScreen();
        });

        document.getElementById('practice-btn')?.addEventListener('click', () => {
            navigateTo('practice-screen');
            updatePracticeScreen();
        });

        document.getElementById('levels-btn')?.addEventListener('click', () => {
            navigateTo('levels-screen');
            updateLevelsScreen();
        });

        // Practice Setup - Game Type
        document.querySelectorAll('.game-type-option').forEach(opt => {
            opt.addEventListener('click', () => {
                state.session.practiceSetup.gameType = opt.dataset.type;
                document.querySelectorAll('.game-type-option').forEach(o => {
                    o.classList.toggle('active', o === opt);
                    o.setAttribute('aria-checked', o === opt);
                });
                HapticService.tap();
            });
        });

        // Practice Setup - Letter Filter
        document.querySelectorAll('.letter-filter-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const filter = opt.dataset.filter;
                state.session.practiceSetup.filter = filter;
                document.querySelectorAll('.letter-filter-option').forEach(o => {
                    o.classList.toggle('active', o === opt);
                    o.setAttribute('aria-checked', o === opt);
                });

                // Show/hide custom selection
                const customPicker = document.getElementById('custom-letter-picker');
                if (customPicker) {
                    customPicker.classList.toggle('hidden', filter !== 'custom');
                    if (filter === 'custom') {
                        updatePracticeLetterGrid();
                    }
                }

                HapticService.tap();
            });
        });

        // Practice Setup - Rounds
        document.querySelectorAll('.round-option').forEach(opt => {
            opt.addEventListener('click', () => {
                state.session.practiceSetup.rounds = parseInt(opt.dataset.rounds);
                document.querySelectorAll('.round-option').forEach(o => {
                    o.classList.toggle('active', o === opt);
                });
                HapticService.tap();
            });
        });

        // Practice Setup - Toggles
        document.getElementById('practice-timed-toggle')?.addEventListener('click', () => {
            state.session.practiceSetup.timedMode = !state.session.practiceSetup.timedMode;
            document.getElementById('practice-timed-toggle').setAttribute('aria-checked', state.session.practiceSetup.timedMode);
            HapticService.tap();
        });

        document.getElementById('practice-hints-toggle')?.addEventListener('click', () => {
            state.session.practiceSetup.hints = !state.session.practiceSetup.hints;
            document.getElementById('practice-hints-toggle').setAttribute('aria-checked', state.session.practiceSetup.hints);
            HapticService.tap();
        });

        // Start Practice
        document.getElementById('start-practice-btn')?.addEventListener('click', () => {
            startPracticeSession();
        });

        // Practice Back
        document.getElementById('practice-back-btn')?.addEventListener('click', () => {
            navigateTo('dashboard-screen');
            updateDashboard();
        });

        // NOTE: progress-btn listener is already registered above (line ~3324)

        document.getElementById('achievements-btn')?.addEventListener('click', () => {
            navigateTo('progress-screen');
            updateProgressScreen();
        });

        document.getElementById('settings-btn')?.addEventListener('click', () => {
            navigateTo('settings-screen');
            updateSettingsScreen();
        });

        // Back buttons - Only redirect to dashboard for general back buttons
        document.querySelectorAll('.back-btn:not(#lesson-back-btn):not(#guess-letter-back-btn):not(#form-word-back-btn):not(#memory-back-btn)').forEach(btn => {
            btn.addEventListener('click', () => {
                navigateTo('dashboard-screen');
                updateDashboard();
            });
        });

        // Level nodes
        document.querySelectorAll('.level-node').forEach(node => {
            node.addEventListener('click', () => {
                if (node.classList.contains('locked')) {
                    const level = BrailleData.LEVELS.find(l => l.id === node.dataset.level);
                    if (level) {
                        AudioService.speak(`Este nivel requiere ${level.requiredXP} puntos de experiencia para desbloquearse.`);
                    }
                    return;
                }

                const level = BrailleData.LEVELS.find(l => l.id === node.dataset.level);
                if (level) {
                    state.session.currentLevel = level;
                    navigateTo('lesson-intro-screen');
                    updateLessonIntro(level);
                }
            });
        });

        // Lesson intro
        document.getElementById('lesson-continue-btn')?.addEventListener('click', () => {
            // Go from step 1 to step 2
            document.getElementById('lesson-step-1')?.classList.add('hidden');
            document.getElementById('lesson-step-2')?.classList.remove('hidden');
            HapticService.tap();
            if (state.settings.screenReader) {
                AudioService.speak('Objetivos de la lección');
            }
        });

        document.getElementById('start-lesson-btn')?.addEventListener('click', () => {
            if (state.session.currentLevel) {
                debugLesson('lesson_start_click', {
                    lessonId: state.session.currentLevel.id,
                    userId: state.profile.supabaseUserId || null
                });
                GameEngine.startLevel(state.session.currentLevel.id);
            }
        });

        document.getElementById('lesson-back-btn')?.addEventListener('click', () => {
            navigateTo('levels-screen');
            updateLevelsScreen();
            // Reset steps for next time
            document.getElementById('lesson-step-1')?.classList.remove('hidden');
            document.getElementById('lesson-step-2')?.classList.add('hidden');
        });

        // Build game - dot buttons (ambas celdas: principal y prefijo)
        document.querySelectorAll('#braille-input .dot-btn, #build-prefix-cell .dot-btn, #braille-input .braille-lesson-dot, #build-prefix-cell .braille-lesson-dot').forEach(btn => {
            btn.addEventListener('click', () => {
                const current = btn.getAttribute('aria-checked') === 'true';
                const newState = !current;
                btn.setAttribute('aria-checked', newState);

                // Toggle visual classes for consistency
                btn.classList.toggle('active', newState);
                btn.classList.toggle('filled', newState);

                GameEngine.updateDotLabel(btn);

                AudioService.playSound('tap');
                HapticService.tap();

                if (state.settings.screenReader) {
                    const dotNum = btn.dataset.dot;
                    AudioService.speak(`Punto ${dotNum} ${!current ? 'levantado' : 'bajado'}`);
                }
            });
        });



        // Game Controls
        document.getElementById('check-answer-btn')?.addEventListener('click', () => {
            GameEngine.checkBuildAnswer();
        });

        document.getElementById('pick-check-btn')?.addEventListener('click', () => {
            GameEngine.checkPickAnswer();
        });

        document.getElementById('play-audio-btn')?.addEventListener('click', () => {
            const question = GameEngine.questions[GameEngine.currentRound - 1];
            if (question) {
                AudioService.speak(question.letter.toUpperCase());
            }
        });

        document.getElementById('game-hint-btn')?.addEventListener('click', () => {
            GameEngine.showHint();
        });

        const exitHandler = () => {
            // Show custom exit confirmation modal
            document.getElementById('exit-confirm-overlay')?.classList.remove('hidden');
        };

        document.getElementById('exit-confirm-yes')?.addEventListener('click', () => {
            document.getElementById('exit-confirm-overlay')?.classList.add('hidden');
            GameEngine.exitGame();
        });

        document.getElementById('exit-confirm-no')?.addEventListener('click', () => {
            document.getElementById('exit-confirm-overlay')?.classList.add('hidden');
        });

        document.getElementById('game-exit-btn')?.addEventListener('click', exitHandler);
        document.getElementById('pick-exit-btn')?.addEventListener('click', exitHandler);

        document.getElementById('feedback-continue-btn')?.addEventListener('click', () => {
            GameEngine.hideFeedback();
        });

        // Instruction Controls
        document.getElementById('instruction-next-btn')?.addEventListener('click', () => {
            InstructionEngine.next();
        });

        document.getElementById('instruction-repeat-btn')?.addEventListener('click', () => {
            InstructionEngine.repeat();
        });

        document.getElementById('instruction-skip-btn')?.addEventListener('click', () => {
            InstructionEngine.skip();
        });

        // Lesson Audio Toggle Buttons
        document.querySelectorAll('.lesson-audio-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                SpeechController.toggleLessonAudio();
                HapticService.tap();
            });
        });
        // Initialize toggle UI to match current setting
        SpeechController.updateToggleUI();

        // Results Screen
        document.getElementById('next-level-btn')?.addEventListener('click', () => {
            const currentIndex = BrailleData.LEVELS.findIndex(l => l.id === GameEngine.currentLevel.id);
            const nextLevel = BrailleData.LEVELS[currentIndex + 1];
            if (nextLevel) {
                // Show lesson intro for the next level
                state.session.currentLevel = nextLevel;
                navigateTo('lesson-intro-screen');
                updateLessonIntro(nextLevel);
            } else {
                navigateTo('levels-screen');
                updateLevelsScreen();
            }
        });

        document.getElementById('try-again-btn')?.addEventListener('click', () => {
            GameEngine.startLevel(GameEngine.currentLevel.id, true);
        });

        document.getElementById('results-home-btn')?.addEventListener('click', () => {
            navigateTo('dashboard-screen');
            updateDashboard();
        });

        // Settings Screen
        document.getElementById('settings-back-btn')?.addEventListener('click', () => {
            navigateTo('dashboard-screen');
            updateDashboard();
        });

        // Logout Button
        document.getElementById('settings-logout')?.addEventListener('click', async () => {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                if (signOutFunc) {
                    const result = await signOutFunc();
                    if (result.success) {
                        // Clear user-specific state
                        state.profile.supabaseUserId = null;
                        state.profile.email = null;
                        state.session.isFirstLaunch = true;

                        // Optionally reset progress or reload to splash
                        localStorage.removeItem('braillequest_state');
                        window.location.reload();
                    } else {
                        alert('Error al cerrar sesión: ' + result.error);
                    }
                } else {
                    // Fallback if Supabase not loaded
                    window.location.reload();
                }
            }
        });

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.settings.audioSpeed = parseFloat(btn.dataset.speed);
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', b === btn));
                saveState();
                HapticService.tap();
            });
        });

        // Dashboard Quick Accessibility
        document.getElementById('quick-a11y-btn')?.addEventListener('click', () => {
            // Cycle through high contrast mode
            state.settings.highContrast = !state.settings.highContrast;
            applySettings();
            saveState();
            HapticService.tap();
            AudioService.speak(`Alto contraste ${state.settings.highContrast ? 'activado' : 'desactivado'}`);
        });

        // Achievement Modal
        document.getElementById('achievement-close')?.addEventListener('click', () => {
            hideAchievementPopup();
        });

    }

    // Expose for debugging/automation
    window.__DEBUG = {
        navigateTo: navigateTo,
        GameEngine: GameEngine,
        state: state
    };

    // Legacy support for browser tools
    window.navigateTo = navigateTo;


    function updatePuppyExpression(expression = 'neutral') {
        const mascot = document.getElementById('puppy-mascot');
        if (!mascot) return;

        // Remove old expression classes
        mascot.classList.remove('happy', 'thinking', 'sad');

        if (expression === 'happy' || (expression === 'neutral' && state.pet.happiness > 80)) {
            mascot.classList.add('happy');
        } else if (expression === 'thinking') {
            mascot.classList.add('thinking');
        } else if (state.pet.happiness < 30) {
            mascot.classList.add('sad');
        }
    }

    /**
     * Trigger a one-shot mascot animation for feedback
     * @param {string} animation - 'bounce', 'shake', 'victory', 'excited'
     * @param {HTMLElement} [targetContainer] - Optional specific mascot container to animate
     */
    function triggerMascotAnimation(animation, targetContainer = null) {
        // Find the mascot container - look in various locations
        const containers = targetContainer
            ? [targetContainer]
            : [
                document.querySelector('.lesson-mascot-mini'),
                document.querySelector('.games-mascot-container'),
                document.getElementById('puppy-mascot'),
                document.querySelector('.pre-lesson-mascot-container')
            ].filter(Boolean);

        if (containers.length === 0) return;

        const container = containers[0];
        const animationClass = {
            'bounce': 'mascot-happy-bounce',
            'shake': 'mascot-sad-shake',
            'victory': 'mascot-victory',
            'excited': 'mascot-antenna-excited'
        }[animation];

        if (!animationClass) return;

        // Remove any existing animation classes first
        container.classList.remove('mascot-happy-bounce', 'mascot-sad-shake', 'mascot-victory', 'mascot-antenna-excited');

        // Force reflow to restart animation
        void container.offsetWidth;

        // Add the animation class
        container.classList.add(animationClass);

        // Remove after animation completes
        const duration = animation === 'victory' ? 800 : animation === 'bounce' ? 600 : 500;
        setTimeout(() => {
            container.classList.remove(animationClass);
        }, duration);

        // Also animate the antenna for extra effect
        if (animation === 'bounce' || animation === 'excited') {
            const antenna = container.querySelector('.mascot-antenna');
            if (antenna) {
                antenna.classList.add('mascot-antenna-excited');
                setTimeout(() => antenna.classList.remove('mascot-antenna-excited'), 800);
            }
        }
    }

    // Export for use by GameEngine
    window.triggerMascotAnimation = triggerMascotAnimation;

    function showPuppyMessage(text, duration = 3000, options = {}) {
        // Try to find the appropriate bubble based on active screen
        let msgEl = null;
        const currentScreen = state.session.currentScreen;

        if (currentScreen === 'instruction-screen') {
            msgEl = document.getElementById('instruction-puppy-message');
        } else if (currentScreen === 'dashboard-screen' || state.session.activeLevelId) {
            // General lesson intro fallback
            msgEl = document.getElementById('intro-puppy-message');
        }

        if (msgEl) {
            // Handle special case for instruction letter messages
            if (msgEl.id === 'instruction-puppy-message') {
                const letterSpan = document.getElementById('instruction-letter');
                // Detect intro phrase patterns: "Comencemos con la X", "Ahora, la X", "Siguiente: X", etc.
                const introPatterns = [
                    /^Comencemos con la (.+)$/,
                    /^Y por último, la (.+)$/,
                    /^Ahora, la (.+)$/,
                    /^Siguiente: (.+)$/,
                    /^Vamos con la (.+)$/,
                    /^Continuamos con la (.+)$/
                ];
                if (letterSpan && typeof text === 'string') {
                    for (const pattern of introPatterns) {
                        const match = text.match(pattern);
                        if (match) {
                            letterSpan.textContent = `letra ${match[1]}`;
                            return;
                        }
                    }
                }
            }

            // Use typewriter animation
            const messages = Array.isArray(text) ? text : [text];
            TypewriterController.start(msgEl, messages, {
                speed: options.speed || 40,
                onComplete: options.onComplete || null
            });

            // Brief bounce animation on the container if possible
            const container = msgEl.closest('.puppy-bubble, .lesson-speech-bubble, .mascot-speech-bubble');
            if (container) {
                container.style.animation = 'none';
                container.offsetHeight; // trigger reflow
                container.style.animation = 'bubblePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }
        }
    }

    function updateProgressScreen() {
        const stats = state.progress;

        document.getElementById('progress-xp').textContent = stats.totalXP;
        document.getElementById('levels-completed').textContent = stats.levelsCompleted.length;
        document.getElementById('best-streak').textContent = stats.bestStreak;
        document.getElementById('letters-learned').textContent = `${stats.lettersLearned.length}/26`;

        // Calculate average accuracy
        const totalAccuracy = Object.values(state.progress.levelStars || {}).reduce((a, b) => a + (b * 33.3), 0);
        const count = Object.keys(state.progress.levelStars || {}).length;
        const avg = count > 0 ? Math.round(totalAccuracy / count) : 0;
        document.getElementById('avg-accuracy').textContent = `${avg}%`;

        // Render Achievements
        const list = document.getElementById('achievements-list');
        if (list) {
            list.innerHTML = BrailleData.ACHIEVEMENTS.map(ach => {
                const earned = stats.achievements.includes(ach.id);
                return `
                    <div class="achievement-card ${earned ? 'earned' : ''}">
                        <div class="achievement-icon">${earned ? ach.icon : '🔒'}</div>
                        <div class="achievement-name">${ach.title}</div>
                    </div>
                `;
            }).join('');
        }

        updateActivityList();
    }

    /**
     * Update the activity list in the progress screen
     * Shows recent completed levels as activity items
     */
    function updateActivityList() {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        const completedLevels = state.progress.levelsCompleted || [];

        if (completedLevels.length === 0) {
            activityList.innerHTML = '<p class="empty-state">¡Completa niveles para ver tu actividad aquí!</p>';
            return;
        }

        // Get the most recent 5 completed levels (reverse order - newest first)
        const recentLevels = completedLevels.slice(-5).reverse();

        const activityItems = recentLevels.map(levelId => {
            const level = BrailleData.LEVELS.find(l => l.id === levelId);
            if (!level) return '';

            const stars = state.progress.levelStars?.[levelId] || 0;
            const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

            return `
                <div class="activity-item">
                    <div class="activity-icon">✅</div>
                    <div class="activity-info">
                        <span class="activity-title">${level.title}</span>
                        <span class="activity-detail">${starDisplay}</span>
                    </div>
                </div>
            `;
        }).filter(Boolean);

        activityList.innerHTML = activityItems.length > 0
            ? activityItems.join('')
            : '<p class="empty-state">¡Completa niveles para ver tu actividad aquí!</p>';
    }

    function updateLessonIntro(level) {
        // Update lesson header/badge

        const lessonNumberBadge = document.getElementById('lesson-number-badge');
        if (lessonNumberBadge) lessonNumberBadge.textContent = `Lección ${level.number}`;

        // Main content
        const lessonSubtitle = document.getElementById('lesson-subtitle');
        if (lessonSubtitle) lessonSubtitle.textContent = level.title;

        const lessonDescription = document.getElementById('lesson-description');
        if (lessonDescription) lessonDescription.textContent = level.description;

        // Update mascot message based on level with typewriter effect
        const puppyMessage = document.getElementById('intro-puppy-message');
        if (puppyMessage) {
            const messages = ['¡Tú puedes!', '¡Vamos!', '¡Aprende conmigo!', '¡A jugar!'];
            const msg = messages[level.number % messages.length] || '¡Tú puedes!';
            TypewriterController.start(puppyMessage, msg, { speed: 50 });
        }

        if (state.settings.screenReader) {
            AudioService.speak(`${level.title}. ${level.description}`);
        }
    }

    // ================================
    // Modular Games Integration
    // ================================
    const gameDeps = {
        BrailleData: window.BrailleData,
        HapticService,
        AudioService,
        state,
        saveState,
        navigateTo
    };

    const GuessLetterGame = createGuessLetterGame(gameDeps);
    const FormWordGame = createFormWordGame(gameDeps);
    const MemoryGame = createMemoryGame(gameDeps);

    // ================================
    // Initialization
    // ================================

    function init() {
        console.log('🛠️ Initializing Braillito...');
        try {
            loadState();
            console.log('✅ State loaded');

            // Ensure lesson narration stays enabled when reader is off
            SpeechController.ensureLessonAudioEnabled('init');

            applySettings();
            console.log('✅ Settings applied');

            setupEventListeners();
            console.log('✅ Event listeners attached');

            PWAService.init();
            console.log('✅ PWA initialized');

            GuessLetterGame.init();
            FormWordGame.init();
            MemoryGame.init();
            console.log('✅ Games initialized');

            // Apply initial toggle states on onboarding
            document.getElementById('haptic-toggle')?.setAttribute('aria-checked', state.settings.hapticFeedback);
            document.getElementById('screen-reader-toggle')?.setAttribute('aria-checked', state.settings.screenReader);
            document.getElementById('contrast-toggle')?.setAttribute('aria-checked', state.settings.highContrast);

            console.log('🎉 Initialization complete!');
        } catch (error) {
            console.error('❌ Critical initialization error:', error);
            // Fallback: try to attach critical listeners anyway
            try {
                setupEventListeners();
            } catch (e) {
                console.error('❌ Fallback also failed:', e);
            }
        }
    }

    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Global UI Fixes: Blur buttons/interactive elements after click to prevent "sticky" focus rings on mobile/touch
    document.addEventListener('click', (e) => {
        // Target all buttons and major interactive sections broadly
        const target = e.target.closest('button, [role="button"], input[type="button"], input[type="submit"], .continue-card, .back-btn, .card-option, .size-option');
        if (target) {
            // Use a slight delay to allow the default action to complete but quickly clear the visual focus
            setTimeout(() => {
                if (document.activeElement === target || target.contains(document.activeElement)) {
                    document.activeElement.blur();
                }
            }, 100);
        }
    }, true);

    // Prevent focus on cards/buttons on initial load
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (document.activeElement &&
                !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                document.activeElement.blur();
            }
        }, 300);
    });

})();
