/**
 * Braille Quest - Main Application
 * Game engine, navigation, accessibility, and state management
 */

// Import Vercel Speed Insights (will be bundled by Vite)
import { injectSpeedInsights } from "@vercel/speed-insights";
injectSpeedInsights();

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
        DEBOUNCE_SAVE: 500     // State save debounce
    };

    // ================================
    // State Management
    // ================================

    const defaultState = {
        // User profile
        profile: {
            name: '',
            ageRange: null,
            createdAt: null
        },

        // Settings
        settings: {
            screenReader: false,
            hapticFeedback: true,
            highContrast: false,
            fontSize: 'large',
            audioSpeed: 1,
            timedChallenges: false
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

    // Load state from localStorage
    function loadState() {
        try {
            const saved = localStorage.getItem('braillequest_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle new properties
                state = {
                    ...defaultState,
                    ...parsed,
                    settings: { ...defaultState.settings, ...parsed.settings },
                    progress: { ...defaultState.progress, ...parsed.progress },
                    pet: { ...defaultState.pet, ...parsed.pet },
                    session: { ...defaultState.session }
                };
                state.session.isFirstLaunch = false;
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }

    // Save state to localStorage (internal)
    function _saveStateImmediate() {
        try {
            const toSave = {
                profile: state.profile,
                settings: state.settings,
                progress: state.progress,
                dailyChallenge: state.dailyChallenge,
                pet: state.pet
            };
            localStorage.setItem('braillequest_state', JSON.stringify(toSave));
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

    // LRU Cache for TTS audio (max 50 phrases)
    const TTS_CACHE_MAX = 50;
    const ttsCache = new Map();

    function getTTSCacheKey(text, speed) {
        return `${text}|${speed}`;
    }

    function addToTTSCache(key, audioBlob) {
        if (ttsCache.size >= TTS_CACHE_MAX) {
            // Remove oldest entry (first key in Map)
            const firstKey = ttsCache.keys().next().value;
            ttsCache.delete(firstKey);
        }
        ttsCache.set(key, audioBlob);
    }

    const AudioService = {
        synth: window.speechSynthesis,
        ttsServerUrl: '/api/tts',
        ttsAvailable: null, // null = unknown, true/false after first check
        currentAudio: null,
        speakingPromise: null, // Track current speech completion

        // Main speak method - interrupts current speech by default
        async speak(text, interrupt = true) {
            // If screen reader is off AND not interrupting, skip but return resolved promise
            if (!state.settings.screenReader && !interrupt) {
                return Promise.resolve();
            }

            // Stop any current audio
            if (interrupt) {
                this.stop();
            }

            const cacheKey = getTTSCacheKey(text, state.settings.audioSpeed);

            // Check cache first
            if (ttsCache.has(cacheKey)) {
                const cachedBlob = ttsCache.get(cacheKey);
                const audioUrl = URL.createObjectURL(cachedBlob);
                this.currentAudio = new Audio(audioUrl);

                this.speakingPromise = new Promise(resolve => {
                    this.currentAudio.onended = () => {
                        this.speakingPromise = null;
                        resolve();
                    };
                    this.currentAudio.onerror = () => {
                        this.speakingPromise = null;
                        resolve();
                    };
                });

                this.currentAudio.play();
                return this.speakingPromise;
            }

            // Try Google Cloud TTS if available or unknown
            if (this.ttsAvailable !== false) {
                try {
                    const response = await fetch(this.ttsServerUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text,
                            voice: 'es-US-Neural2-B', // US Spanish Neural voice
                            speakingRate: state.settings.audioSpeed
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.audioContent) {
                            this.ttsAvailable = true;
                            const audioBlob = this._base64ToBlob(data.audioContent, 'audio/mp3');

                            // Cache the audio blob for future use
                            addToTTSCache(cacheKey, audioBlob);

                            const audioUrl = URL.createObjectURL(audioBlob);
                            this.currentAudio = new Audio(audioUrl);

                            // Create a promise that resolves when audio ends
                            this.speakingPromise = new Promise(resolve => {
                                this.currentAudio.onended = () => {
                                    this.speakingPromise = null;
                                    resolve();
                                };
                                this.currentAudio.onerror = () => {
                                    this.speakingPromise = null;
                                    resolve();
                                };
                            });

                            this.currentAudio.play();
                            return this.speakingPromise;
                        }
                    }

                    // If we get here, TTS failed - fall back
                    this.ttsAvailable = false;
                } catch (error) {
                    // Server not available, mark as unavailable
                    this.ttsAvailable = false;
                    console.log('TTS server unavailable, using Web Speech API');
                }
            }

            // Fallback to Web Speech API
            return this._speakWithWebSpeech(text);
        },

        // Speak and wait for completion - use this to prevent overlaps
        async speakAndWait(text) {
            // speak() now always returns a promise (resolved immediately if skipping)
            const speakResult = this.speak(text, true);
            await speakResult;
            // Also wait for any remaining speakingPromise
            if (this.speakingPromise) {
                await this.speakingPromise;
            }
        },

        _speakWithWebSpeech(text) {
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
                utterance.onend = () => {
                    this.speakingPromise = null;
                    resolve();
                };
                utterance.onerror = () => {
                    this.speakingPromise = null;
                    resolve();
                };
            });

            this.synth.speak(utterance);
            return this.speakingPromise;
        },

        stop() {
            this.synth.cancel();
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
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
            // Create simple sounds using Web Audio API
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
            // No registrar SW en localhost para evitar problemas de caché durante el desarrollo
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                console.log('SW registration skipped on localhost for better dev experience');
                return;
            }
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

            if (isStandalone) {
                this.hideGate();
            } else {
                this.showGate();
                this.detectPlatform();
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
    // Instruction Engine
    // ================================

    const InstructionEngine = {
        currentLevel: null,
        currentLetterIdx: 0,
        isAnimationRunning: false,
        animationTimeout: null,

        start(level) {
            this.currentLevel = level;
            this.currentLetterIdx = 0;
            this.stopCurrentAnimation(); // New: cleanup previous runs
            navigateTo('instruction-screen');
            this.setupProgressDots();
            this.playNextLetter();
        },

        stopCurrentAnimation() {
            this.isAnimationRunning = false;
            if (this.animationTimeout) {
                clearTimeout(this.animationTimeout);
                this.animationTimeout = null;
            }
            AudioService.stop();
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

            // Toggle single/dual cell display - show/hide prefix cell
            if (container) {
                container.classList.toggle('single-cell', !isMultiCell);
            }
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

            document.getElementById('instruction-text').textContent = `Aprendamos: ${char}...`;
            // Buttons now stay visible during animation

            this.updateProgressDots();
            this.clearDots();

            this.isAnimationRunning = true;
            const currentIdx = this.currentLetterIdx;

            // Speak intro - Buddy's message appears at the SAME TIME as the audio
            const introMsg = `Vamos a aprender: ${char}`;
            showPuppyMessage(introMsg);
            await AudioService.speakAndWait(introMsg);
            await new Promise(r => setTimeout(r, TIMING.INTRO_PAUSE));

            if (!this.isAnimationRunning || this.currentLetterIdx !== currentIdx) return;

            // Animate prefix cell dots (if applicable)
            if (isMultiCell && prefixDots) {
                await AudioService.speakAndWait(prefixLabel === 'Mayúscula' ? 'Signo de mayúscula' : 'Signo de número');
                for (const dotNum of prefixDots) {
                    if (!this.isAnimationRunning || this.currentLetterIdx !== currentIdx) return;
                    const dotEl = prefixCell.querySelector(`[data-dot="${dotNum}"]`);
                    if (dotEl) {
                        dotEl.classList.add('animating');
                        HapticService.tap();
                        await new Promise(r => setTimeout(r, TIMING.PREFIX_DOT));
                        dotEl.classList.remove('animating');
                        dotEl.classList.add('filled');
                    }
                }
                await new Promise(r => setTimeout(r, TIMING.INTER_CELL));
            }

            if (!this.isAnimationRunning || this.currentLetterIdx !== currentIdx) return;

            // Animate main cell dots
            await AudioService.speakAndWait(`Letra ${mainLabel}`);
            for (const dotNum of mainDots) {
                if (!this.isAnimationRunning || this.currentLetterIdx !== currentIdx) return;
                const dotEl = mainCell.querySelector(`[data-dot="${dotNum}"]`);
                if (dotEl) {
                    dotEl.classList.add('animating');
                    const pos = BrailleData.DOT_POSITIONS[dotNum];
                    await AudioService.speakAndWait(`Punto ${dotNum}, ${pos}`);
                    HapticService.tap();
                    await new Promise(r => setTimeout(r, TIMING.MAIN_DOT));
                    dotEl.classList.remove('animating');
                    dotEl.classList.add('filled');
                }
                await new Promise(r => setTimeout(r, TIMING.DOT_GAP));
            }

            if (!this.isAnimationRunning || this.currentLetterIdx !== currentIdx) return;

            const desc = BrailleData.getDotsDescription(char);
            const buddyMsg = `${char} es ${desc}`;
            document.getElementById('instruction-text').textContent = buddyMsg;
            showPuppyMessage(buddyMsg); // Buddy talks in instruction screen
            await AudioService.speakAndWait(buddyMsg);

            this.isAnimationRunning = false;

            // Show continue button or auto-advance
            const nextBtn = document.getElementById('instruction-next-btn');
            const repeatBtn = document.getElementById('instruction-repeat-btn');

            if (nextBtn) {
                if (this.currentLetterIdx === this.currentLevel.letters.length - 1) {
                    nextBtn.textContent = "Iniciar Lección";
                } else {
                    nextBtn.textContent = "Siguiente";
                }
                nextBtn.classList.remove('hidden');
            }
            if (repeatBtn) repeatBtn.classList.remove('hidden');

            // Auto-advance after 8 seconds if not clicked
            this.animationTimeout = setTimeout(() => {
                if (this.currentLetterIdx < this.currentLevel.letters.length - 1) {
                    this.next();
                }
            }, TIMING.AUTO_ADVANCE);
        },

        clearDots() {
            document.querySelectorAll('#instruction-cell-prefix [data-dot], #instruction-cell [data-dot]').forEach(d => {
                d.classList.remove('filled', 'animating');
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
            this.isAnimationRunning = false;
            // Stop any current speech
            AudioService.stop();
            this.clearDots(); // Clear dots before repeating
            // Reset to first letter and start from beginning
            this.currentLetterIdx = 0;
            this.setupProgressDots();
            this.playNextLetter();
        },

        skip() {
            clearTimeout(this.animationTimeout);
            this.isAnimationRunning = false;
            this.finish();
        },

        finish() {
            GameEngine.startLevel(this.currentLevel.id, true); // true = skipIntro
        }
    };

    // ================================
    // Navigation
    // ================================

    function navigateTo(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            state.session.currentScreen = screenId;

            // Update Navigation Bar Visibility
            const mainNav = document.getElementById('main-nav');
            const mainScreens = ['dashboard-screen', 'levels-screen', 'practice-screen', 'progress-screen', 'settings-screen'];

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

        startLevel(levelOrId, skipIntro = false) {
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
            if (!level) return;

            // Start instruction phase first if this is a lesson and intro not skipped
            if (level.id !== 'daily' && level.id !== 'practice' && !skipIntro) {
                InstructionEngine.start(level);
                return;
            }

            this.currentLevel = level;
            this.currentRound = 0;
            this.totalRounds = level.rounds;
            this.score = 0;
            this.correctAnswers = 0;
            this.hintsUsed = 0;
            this.startTime = Date.now();

            // Generate questions
            this.questions = this.generateQuestions(level);

            // Navigate to appropriate game screen
            if (level.gameType === 'build') {
                navigateTo('game-build-screen');
                this.setupBuildGame();
            } else if (level.gameType === 'pick') {
                navigateTo('game-pick-screen');
                this.setupPickGame();
            } else {
                // For mixed mode, the first question determines the screen
                this.nextRound();
                return;
            }

            this.nextRound();
        },

        generateQuestions(level) {
            const questions = [];
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
                } else if (BrailleData.BRAILLE_SYMBOLS[char]) {
                    cells = [{ name: `Símbolo ${char}`, dots: BrailleData.BRAILLE_SYMBOLS[char] }];
                } else {
                    cells = [{ name: `Letra ${char}`, dots: BrailleData.BRAILLE_ALPHABET[char.toLowerCase()] }];
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
            // Reset all dots
            document.querySelectorAll('.dot-btn').forEach(btn => {
                btn.setAttribute('aria-checked', 'false');
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

            if (type === 'build') {
                navigateTo('game-build-screen');
                document.getElementById('game-progress-fill').style.width = `${progress}%`;
                document.getElementById('game-progress-text').textContent = `${this.currentRound} / ${this.totalRounds}`;
                document.getElementById('target-letter').textContent = question.char;
                document.getElementById('target-letter').setAttribute('aria-label', `Objetivo: ${question.char}`);

                const buildContainer = document.getElementById('build-cell-container');
                const prefixCell = document.getElementById('build-prefix-cell');
                const mainCell = document.getElementById('build-main-cell');
                const isMultiCell = question.cells.length > 1;

                // Toggle single/dual cell display
                buildContainer.classList.toggle('single-cell', !isMultiCell);

                // Update labels
                if (isMultiCell) {
                    const prefixLabel = /[A-Z]/.test(question.char) ? 'Mayúscula' : 'Número';
                    document.getElementById('prefix-cell-label').textContent = prefixLabel;
                    document.getElementById('main-cell-label').textContent = question.char.toLowerCase();

                    // Highlight active cell
                    prefixCell.classList.add('active');
                    mainCell.classList.remove('active');
                } else {
                    document.getElementById('main-cell-label').textContent = question.char;
                }

                // Reset all dots in both cells
                document.querySelectorAll('#braille-input-prefix .dot-btn, #braille-input .dot-btn').forEach(btn => {
                    btn.setAttribute('aria-checked', 'false');
                    this.updateDotLabel(btn);
                });

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

                // Generate options
                this.generatePickOptions(question);

                // Announce
                if (state.settings.screenReader) {
                    AudioService.speak(`¿Qué celda es: ${question.char}?`);
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
                    <div class="pick-v2-number-badge">${index + 1}</div>
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
            const inputId = isMultiCell && this.currentBuildStep === 0 ? 'braille-input-prefix' : 'braille-input';
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

            overlay.classList.remove('hidden', 'success', 'error');
            overlay.classList.add(isCorrect ? 'success' : 'error');

            icon.textContent = isCorrect ? '✓' : '✗';
            title.textContent = isCorrect ? '¡Correcto!' : 'Casi';
            message.textContent = `${char} es ${BrailleData.getDotsDescription(char)}.`;

            document.getElementById('feedback-continue-btn').focus();
        },

        hideFeedback() {
            document.getElementById('feedback-overlay').classList.add('hidden');
            this.nextRound();
        },

        showHint() {
            const question = this.questions[this.currentRound - 1];
            const desc = BrailleData.getDotsDescription(question.letter);

            this.hintsUsed++;
            this.score = Math.max(0, this.score - 25);

            AudioService.speak(`Pista: ${question.letter.toUpperCase()} es ${desc}`);
            HapticService.dots(question.dots);

            // Visual hint - highlight correct dots or options
            if (question.type === 'build') {
                document.querySelectorAll('#braille-input .dot-btn').forEach(btn => {
                    const dotNum = parseInt(btn.dataset.dot);
                    if (question.dots.includes(dotNum)) {
                        btn.classList.add('hint-highlight');
                        setTimeout(() => btn.classList.remove('hint-highlight'), 2000);
                    }
                });
            } else if (question.type === 'pick') {
                document.querySelectorAll('.pick-option-cell').forEach(cell => {
                    if (cell.dataset.letter === question.letter) {
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
        document.getElementById('greeting-text').textContent = `¡Hola, ${name}!`;

        // Streak
        document.getElementById('streak-count').textContent = state.progress.currentStreak;

        // XP
        document.getElementById('total-xp').textContent = state.progress.totalXP;
        const xpProgress = Math.min((state.progress.totalXP % 1000) / 10, 100);
        document.getElementById('xp-progress').style.width = `${xpProgress}%`;

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
        document.getElementById('continue-desc').textContent = `Hoy aprenderás: ${nextLevelForDisplay.letters.map(l => l.toUpperCase()).join(', ')}`;
        const todayFocus = document.getElementById('today-focus');
        if (todayFocus) {
            todayFocus.textContent = nextLevelForDisplay.letters.map(l => l.toUpperCase()).join(', ');
        }

        // Daily challenge
        const today = new Date().toDateString();
        if (state.dailyChallenge.date !== today) {
            state.dailyChallenge.date = today;
            state.dailyChallenge.completed = false;
            saveState();
        }

        const dailyBtn = document.getElementById('daily-challenge-btn');
        if (state.dailyChallenge.completed) {
            dailyBtn.querySelector('.badge-new').textContent = '✓';
            document.getElementById('daily-desc').textContent = '¡Completado hoy!';
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
        // Update toggle states
        document.getElementById('settings-screen-reader')?.setAttribute('aria-checked', state.settings.screenReader);
        document.getElementById('settings-haptic')?.setAttribute('aria-checked', state.settings.hapticFeedback);
        document.getElementById('settings-contrast')?.setAttribute('aria-checked', state.settings.highContrast);
        document.getElementById('settings-timed')?.setAttribute('aria-checked', state.settings.timedChallenges);

        // Speed buttons
        document.querySelectorAll('.speed-btn').forEach(btn => {
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

        // Welcome screen button handlers
        document.getElementById('welcome-start-btn')?.addEventListener('click', () => {
            if (state.session.isFirstLaunch) {
                // Skip onboarding settings, go directly to profile screen
                navigateTo('profile-screen');
            } else {
                navigateTo('dashboard-screen');
                updateDashboard();
            }
        });

        document.getElementById('welcome-login-btn')?.addEventListener('click', () => {
            // For now, "login" just goes to dashboard (could add actual auth later)
            state.session.isFirstLaunch = false;
            navigateTo('dashboard-screen');
            updateDashboard();
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

        // Age options
        document.querySelectorAll('.age-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.age-option').forEach(o => {
                    o.classList.remove('active');
                    o.setAttribute('aria-checked', 'false');
                });
                option.classList.add('active');
                option.setAttribute('aria-checked', 'true');
                state.profile.ageRange = option.dataset.age;
                HapticService.tap();
            });
        });

        // Profile setup
        document.getElementById('profile-skip')?.addEventListener('click', () => {
            state.profile.createdAt = new Date().toISOString();
            saveState();
            navigateTo('dashboard-screen');
            updateDashboard();
        });

        document.getElementById('profile-continue')?.addEventListener('click', () => {
            state.profile.name = document.getElementById('profile-name').value.trim();
            state.profile.createdAt = new Date().toISOString();
            saveState();
            navigateTo('dashboard-screen');
            updateDashboard();
        });

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

            state.session.currentLevel = nextLevel;
            navigateTo('lesson-intro-screen');
            updateLessonIntro(nextLevel);
        });

        document.getElementById('daily-challenge-btn')?.addEventListener('click', () => {
            if (state.dailyChallenge.completed) {
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

        document.getElementById('lab-btn')?.addEventListener('click', () => {
            navigateTo('lab-screen');
            updateLabScreen();
        });

        document.getElementById('lab-back-btn')?.addEventListener('click', () => {
            navigateTo('dashboard-screen');
            updateDashboard();
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

        document.getElementById('progress-btn')?.addEventListener('click', () => {
            navigateTo('progress-screen');
            updateProgressScreen();
        });

        document.getElementById('achievements-btn')?.addEventListener('click', () => {
            navigateTo('progress-screen');
            updateProgressScreen();
        });

        document.getElementById('settings-btn')?.addEventListener('click', () => {
            navigateTo('settings-screen');
            updateSettingsScreen();
        });

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
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
        document.querySelectorAll('#braille-input .dot-btn, #braille-input-prefix .dot-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const current = btn.getAttribute('aria-checked') === 'true';
                btn.setAttribute('aria-checked', !current);
                GameEngine.updateDotLabel(btn);

                AudioService.playSound('tap');
                HapticService.tap();

                if (state.settings.screenReader) {
                    const dotNum = btn.dataset.dot;
                    AudioService.speak(`Punto ${dotNum} ${!current ? 'levantado' : 'bajado'}`);
                }
            });
        });

        // Lab Cell - Interactive Dots
        document.querySelectorAll('#lab-cell .dot-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dot = parseInt(btn.dataset.dot);
                const active = btn.classList.toggle('active');
                btn.setAttribute('aria-checked', active);

                HapticService.tap();
                identifyLabPattern();
            });
        });

        document.getElementById('lab-reset-btn')?.addEventListener('click', () => {
            document.querySelectorAll('#lab-cell .dot-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-checked', 'false');
            });
            identifyLabPattern();
            HapticService.tap();
        });

        document.getElementById('lab-pat-btn')?.addEventListener('click', () => {
            const drone = document.getElementById('orbital-drone');
            drone?.classList.add('happy-pulse');
            setTimeout(() => drone?.classList.remove('happy-pulse'), 1000);

            state.pet.happiness = Math.min(100, state.pet.happiness + 5);
            updatePuppyExpression('happy');

            const messages = [
                "Procesando... Eso fue eficiente.",
                "¡Niveles de afecto subiendo!",
                "Interacción manual reconocida. Gracias.",
                "Sinergia del sistema aumentada."
            ];
            const msg = messages[Math.floor(Math.random() * messages.length)];
            const msgEl = document.getElementById('puppy-message');
            if (msgEl) msgEl.textContent = msg;

            HapticService.success();
            AudioService.speak(msg);
            saveState();
        });

        document.getElementById('lab-challenge-btn')?.addEventListener('click', () => {
            startLabChallenge();
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
        updateLabScreen: updateLabScreen,
        GameEngine: GameEngine,
        state: state
    };

    // Legacy support for browser tools
    window.navigateTo = navigateTo;
    window.updateLabScreen = updateLabScreen;

    function updateLabScreen() {
        // Reset lab cell
        document.querySelectorAll('#lab-cell .dot-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-checked', 'false');
        });
        document.getElementById('lab-result').textContent = '?';

        const mascot = document.getElementById('puppy-mascot');
        if (mascot) {
            mascot.className = 'puppy-mascot';
        }

        document.getElementById('puppy-message').textContent = "¿Listo para jugar un poco?";
        updatePuppyExpression();
    }

    function identifyLabPattern() {
        const activeDots = Array.from(document.querySelectorAll('#lab-cell .dot-btn.active'))
            .map(btn => parseInt(btn.dataset.dot))
            .sort();

        const resultEl = document.getElementById('lab-result');
        let found = null;

        const activeStr = JSON.stringify(activeDots);

        for (const [char, dots] of Object.entries(BrailleData.BRAILLE_ALPHABET)) {
            // Sort a copy to avoid mutating the source data
            const sortedDots = [...dots].sort();
            if (JSON.stringify(sortedDots) === activeStr) {
                found = char;
                break;
            }
        }

        if (found) {
            resultEl.textContent = found.toUpperCase();
            resultEl.classList.add('found');
            state.pet.labStats.totalIdentify++;

            if (activeDots.length > 0) {
                updateOrbitalFace(found);
            }

            // If in challenge mode, check answer
            if (state.session.labChallenge) {
                checkLabChallenge(found);
            }
        } else {
            resultEl.textContent = activeDots.length > 0 ? '?' : '';
            resultEl.classList.remove('found');
            updateOrbitalFace();
        }
    }

    function startLabChallenge() {
        // Must have learned some letters
        const pool = state.progress.lettersLearned.length > 0
            ? state.progress.lettersLearned
            : ['a', 'b', 'c'];

        const target = pool[Math.floor(Math.random() * pool.length)];
        state.session.labChallenge = target;

        // Reset cell
        document.querySelectorAll('#lab-cell .dot-btn').forEach(btn => {
            btn.classList.remove('active'); btn.setAttribute('aria-checked', 'false');
        });
        document.getElementById('lab-result').textContent = '?';

        const msg = `Reto del Sistema: ¿Puedes construir la letra '${target.toUpperCase()}'?`;
        document.getElementById('puppy-message').textContent = msg;
        AudioService.speak(msg);
        HapticService.tap();
    }

    function checkLabChallenge(found) {
        if (!state.session.labChallenge) return;

        if (found.toLowerCase() === state.session.labChallenge.toLowerCase()) {
            const successMsg = "¡Guau! ¡Lo logramos!";
            document.getElementById('puppy-message').textContent = successMsg;
            state.pet.labStats.totalChallengeSuccess++;
            state.pet.happiness = Math.min(100, state.pet.happiness + 10);
            state.session.labChallenge = null; // Reset challenge

            HapticService.success();
            AudioService.speak(successMsg);

            // Celebration pulse
            const mascot = document.getElementById('puppy-mascot');
            mascot?.classList.add('happy');
            setTimeout(() => mascot?.classList.remove('happy'), 2000);
            updatePuppyExpression('happy');
        }
    }

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

    function showPuppyMessage(text, duration = 3000) {
        // Try to find the appropriate bubble based on active screen
        let msgEl = null;
        const currentScreen = state.session.currentScreen;

        if (currentScreen === 'lab-screen') {
            msgEl = document.getElementById('puppy-message');
        } else if (currentScreen === 'instruction-screen') {
            msgEl = document.getElementById('instruction-puppy-message');
        } else if (currentScreen === 'dashboard-screen' || state.session.activeLevelId) {
            // General lesson intro fallback
            msgEl = document.getElementById('intro-puppy-message');
        }

        if (msgEl) {
            msgEl.textContent = text;
            // Brief bounce animation on the container if possible
            const container = msgEl.closest('.puppy-bubble');
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

    function updateLessonIntro(level) {
        // Update lesson header/badge
        const lessonTitle = document.getElementById('lesson-title');
        if (lessonTitle) lessonTitle.textContent = `Nivel ${level.number}`;

        const lessonNumberBadge = document.getElementById('lesson-number-badge');
        if (lessonNumberBadge) lessonNumberBadge.textContent = `Lección ${level.number}`;

        // Main content
        const lessonSubtitle = document.getElementById('lesson-subtitle');
        if (lessonSubtitle) lessonSubtitle.textContent = level.title;

        const lessonDescription = document.getElementById('lesson-description');
        if (lessonDescription) lessonDescription.textContent = level.description;

        // Update mascot message based on level
        const puppyMessage = document.getElementById('intro-puppy-message');
        if (puppyMessage) {
            const messages = ['¡Tú puedes!', '¡Vamos!', '¡Aprende conmigo!', '¡A jugar!'];
            puppyMessage.textContent = messages[level.number % messages.length] || '¡Tú puedes!';
        }

        if (state.settings.screenReader) {
            AudioService.speak(`${level.title}. ${level.description}`);
        }
    }

    // ================================
    // Guess the Letter Game (Adivina la Letra)
    // ================================

    const GuessLetterGame = {
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
            // Reset game state
            this.currentRound = 0;
            this.score = 0;
            this.lives = 3;
            this.correctAnswers = 0;
            this.answered = false;

            // Get letters from learned levels or use default set
            const learnedLetters = this.getLearnedLetters();
            this.letters = learnedLetters.length >= 4 ? learnedLetters : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

            // Update UI
            this.updateScoreDisplay();
            this.updateLivesDisplay();
            document.getElementById('guess-letter-total').textContent = this.totalRounds;

            // Navigate to game screen
            navigateTo('guess-letter-screen');

            // Start first round
            this.nextRound();
        },

        getLearnedLetters() {
            // Get letters from completed levels
            const completedLevelIds = state.progress?.completedLevels || [];
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

            // Check if game is over
            if (this.currentRound > this.totalRounds || this.lives <= 0) {
                this.endGame();
                return;
            }

            // Update round display
            document.getElementById('guess-letter-round').textContent = this.currentRound;

            // Hide footer and feedback
            document.getElementById('guess-letter-footer')?.classList.add('hidden');
            const feedback = document.getElementById('guess-letter-feedback');
            if (feedback) {
                feedback.classList.add('hidden');
                feedback.classList.remove('correct', 'incorrect');
            }

            // Reset answer button styles
            const buttons = document.querySelectorAll('.game-answer-btn');
            buttons.forEach(btn => {
                btn.classList.remove('correct', 'incorrect');
                btn.disabled = false;
            });

            // Pick a random letter
            this.currentLetter = this.letters[Math.floor(Math.random() * this.letters.length)];

            // Display Braille pattern
            this.displayBraillePattern(this.currentLetter);

            // Generate options (1 correct + 3 distractors)
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

            // Generate distractors
            const distractors = BrailleData.generateDistractors(this.currentLetter, 3, this.letters);

            // Combine correct answer with distractors and shuffle
            const options = [this.currentLetter, ...distractors];
            this.shuffleArray(options);

            // Update buttons
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

            // Disable all buttons
            buttons.forEach(btn => btn.disabled = true);

            // Highlight selected button
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

                // Check if out of lives
                if (this.lives <= 0) {
                    setTimeout(() => this.endGame(), 1500);
                    return;
                }
            }

            this.updateScoreDisplay();

            // Show next button
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

            // Calculate XP based on performance
            const baseXP = this.score;
            const accuracyBonus = accuracy >= 80 ? 20 : (accuracy >= 60 ? 10 : 0);
            const completionBonus = this.lives > 0 ? 30 : 0;
            const totalXP = baseXP + accuracyBonus + completionBonus;

            // Update state XP
            state.progress.xp = (state.progress.xp || 0) + totalXP;
            saveState();

            // Determine result message
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

            // Update game over screen
            document.getElementById('game-over-icon').textContent = icon;
            document.getElementById('game-over-title').textContent = title;
            document.getElementById('game-over-subtitle').textContent = subtitle;
            document.getElementById('game-over-score').textContent = this.score;
            document.getElementById('game-over-correct').textContent = this.correctAnswers;
            document.getElementById('game-over-accuracy').textContent = accuracy + '%';
            document.getElementById('game-over-xp-value').textContent = '+' + totalXP + ' XP';

            // Navigate to game over screen
            navigateTo('game-over-screen');
        }
    };

    // ================================
    // Form the Word Game (Forma la Palabra)
    // ================================

    const FormWordGame = {
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

            // Create shuffled array of letters
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

            // Find empty slot
            const slots = document.querySelectorAll('.form-word-slot');
            const emptySlot = Array.from(slots).find((_, i) => !this.selectedLetters[i]);

            if (!emptySlot) return;

            const slotIndex = parseInt(emptySlot.dataset.index);
            this.selectedLetters[slotIndex] = { letter, optionEl };

            // Update UI
            optionEl.classList.add('used');
            emptySlot.classList.add('filled');

            // Copy braille display to slot
            const dotsHtml = optionEl.querySelector('.form-word-option-cell').outerHTML;
            emptySlot.innerHTML = `
                <span class="form-word-slot-letter">${slotIndex + 1}</span>
                ${dotsHtml}
            `;

            // Check if all slots are filled
            const allFilled = this.selectedLetters.filter(Boolean).length === this.currentWord.length;
            document.getElementById('form-word-check').disabled = !allFilled;
        },

        removeFromSlot(slotIndex) {
            if (this.answered) return;
            const slotData = this.selectedLetters[slotIndex];
            if (!slotData) return;

            // Restore option
            slotData.optionEl.classList.remove('used');

            // Clear slot
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

            state.progress.xp = (state.progress.xp || 0) + totalXP;
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

    // ================================
    // Memory Game (Memoria Braille)
    // ================================

    const MemoryGame = {
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

            // Get 6 random letters
            const allLetters = Object.keys(BrailleData.BRAILLE_ALPHABET);
            const selectedLetters = this.shuffleArray([...allLetters]).slice(0, this.totalPairs);

            // Create pairs (letter + braille)
            this.cards = [];
            selectedLetters.forEach((letter, i) => {
                this.cards.push({ type: 'letter', value: letter, pairId: i });
                this.cards.push({ type: 'braille', value: letter, pairId: i });
            });

            this.shuffleArray(this.cards);

            // Create card elements
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

            // Flip the card
            cardEl.classList.add('flipped');
            this.flippedCards.push({ index, card, element: cardEl });
            HapticService.tap();

            // Check for match if 2 cards flipped
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

            // Calculate score: bonus for fewer moves and faster time
            const moveScore = Math.max(0, 100 - (this.moves - this.totalPairs) * 5);
            const timeScore = Math.max(0, 100 - this.timer);
            const totalScore = Math.round((moveScore + timeScore) / 2);

            // XP based on performance
            const baseXP = 50;
            const moveBonus = this.moves <= this.totalPairs + 4 ? 30 : (this.moves <= this.totalPairs + 8 ? 15 : 0);
            const timeBonus = this.timer <= 60 ? 30 : (this.timer <= 120 ? 15 : 0);
            const totalXP = baseXP + moveBonus + timeBonus;

            state.progress.xp = (state.progress.xp || 0) + totalXP;
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

    // ================================
    // Initialization
    // ================================

    function init() {
        loadState();
        applySettings();
        setupEventListeners();
        PWAService.init();
        GuessLetterGame.init();
        FormWordGame.init();
        MemoryGame.init();

        // Apply initial toggle states on onboarding
        document.getElementById('haptic-toggle')?.setAttribute('aria-checked', state.settings.hapticFeedback);
        document.getElementById('screen-reader-toggle')?.setAttribute('aria-checked', state.settings.screenReader);
        document.getElementById('contrast-toggle')?.setAttribute('aria-checked', state.settings.highContrast);
    }

    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
