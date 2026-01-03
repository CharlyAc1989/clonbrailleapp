/**
 * Form The Word Game (Forma la Palabra)
 * 
 * A mini-game where players arrange Braille cells to form Spanish words.
 * 
 * Dependencies: BrailleData, HapticService, AudioService, state, saveState, navigateTo
 */

export function createFormWordGame(dependencies) {
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
