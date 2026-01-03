/**
 * Guess The Letter Game (Adivina la Letra)
 * 
 * A mini-game where players identify which letter corresponds to 
 * a displayed Braille pattern.
 * 
 * Dependencies: BrailleData, HapticService, AudioService, state, saveState, navigateTo
 */

export function createGuessLetterGame(dependencies) {
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
            // Play button
            const playBtn = document.getElementById('play-guess-letter');
            if (playBtn) {
                playBtn.addEventListener('click', () => this.startGame());
            }

            // Back button from game
            const backBtn = document.getElementById('guess-letter-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.exitGame());
            }

            // Next button
            const nextBtn = document.getElementById('guess-letter-next');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.nextRound());
            }

            // Answer options
            const optionsContainer = document.getElementById('guess-letter-options');
            if (optionsContainer) {
                optionsContainer.addEventListener('click', (e) => {
                    const btn = e.target.closest('.game-answer-btn');
                    if (btn && !this.answered) {
                        this.checkAnswer(btn.dataset.letter);
                    }
                });
            }

            // Game over buttons
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

            // Games screen back button
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
