/**
 * Audio Service
 * Handles TTS (Google Cloud & Web Speech API) and sound effects
 */

import { StateService } from './StateService.js';

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

function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

export const AudioService = {
    synth: window.speechSynthesis,
    ttsServerUrl: '/api/tts',
    ttsAvailable: null,
    currentAudio: null,
    speakingPromise: null,

    // Main speak method - interrupts current speech by default
    async speak(text, interrupt = true) {
        const state = StateService.state;
        if (!state.settings.screenReader && !interrupt) return;

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
                        voice: 'es-US-Neural2-B',
                        speakingRate: state.settings.audioSpeed
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.audioContent) {
                        this.ttsAvailable = true;
                        const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');

                        // Cache the audio blob for future use
                        addToTTSCache(cacheKey, audioBlob);

                        const audioUrl = URL.createObjectURL(audioBlob);
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
                }

                this.ttsAvailable = false;
            } catch (error) {
                this.ttsAvailable = false;
                console.log('TTS server unavailable, using Web Speech API');
            }
        }

        // Fallback to Web Speech API
        return this._speakWithWebSpeech(text);
    },

    // Speak and wait for completion
    async speakAndWait(text) {
        await this.speak(text, true);
        if (this.speakingPromise) {
            await this.speakingPromise;
        }
    },

    _speakWithWebSpeech(text) {
        return new Promise(resolve => {
            const state = StateService.state;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.rate = state.settings.audioSpeed;

            this.speakingPromise = new Promise(res => {
                utterance.onend = () => {
                    this.speakingPromise = null;
                    res();
                    resolve();
                };
                utterance.onerror = () => {
                    this.speakingPromise = null;
                    res();
                    resolve();
                };
            });

            this.synth.speak(utterance);
        });
    },

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        this.synth.cancel();
        this.speakingPromise = null;
    },

    playSound(type) {
        const sounds = {
            correct: [523.25, 659.25, 783.99],
            incorrect: [200, 150],
            tap: [440],
            complete: [523.25, 659.25, 783.99, 1046.5]
        };

        const frequencies = sounds[type] || sounds.tap;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        frequencies.forEach((freq, i) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = freq;
            oscillator.type = 'sine';

            const startTime = audioContext.currentTime + (i * 0.15);
            const duration = 0.15;

            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    }
};

export default AudioService;
