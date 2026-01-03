/**
 * Memory Game (Memoria Braille)
 * 
 * A card-matching game where players match letters with their Braille patterns.
 * 
 * Dependencies: BrailleData, HapticService, AudioService, state, saveState, navigateTo
 */

export function createMemoryGame(dependencies) {
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
