/**
 * State Management Service
 * Handles localStorage persistence and state operations
 */

import { TIMING } from '../utils/timing.js';

// Default state structure
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
        largeText: false,
        timedChallenges: false,
        audioSpeed: 1.0,
        fontSize: 'normal', // normal, large, extra-large
        practiceSettings: {
            filter: 'learned',
            customLetters: [],
            rounds: 10,
            timedMode: false,
            hints: true
        },
        currentPetStage: 1
    },

    // Learning progress
    progress: {
        totalXP: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastPlayDate: null,
        levelsCompleted: [],
        levelStars: {},
        lettersLearned: [],
        achievements: [],
        activityLog: []
    },

    // Session data (not persisted)
    session: {
        isFirstLaunch: true,
        currentScreen: 'splash-screen'
    },

    // Daily Challenge state
    dailyChallenge: {
        lastChallengeDate: null,
        todayCompleted: false,
        todayWord: null
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

// Current state
let state = JSON.parse(JSON.stringify(defaultState));

// Debounce utility
function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
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

// Debounced saveState - batches rapid changes
const saveState = debounce(_saveStateImmediate, TIMING.DEBOUNCE_SAVE);

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

// Get current state
function getState() {
    return state;
}

// Update state
function updateState(updates) {
    if (typeof updates === 'function') {
        updates(state);
    } else {
        Object.assign(state, updates);
    }
    saveState();
}

// Reset state to defaults
function resetState() {
    state = JSON.parse(JSON.stringify(defaultState));
    saveState();
}

export const StateService = {
    loadState,
    saveState,
    getState,
    updateState,
    resetState,
    get state() { return state; }
};

export default StateService;
