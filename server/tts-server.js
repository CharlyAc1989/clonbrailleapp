/**
 * TTS Server - Secure backend for Google Cloud Text-to-Speech
 * Run with: node server/tts-server.js
 */

import express from 'express';
import cors from 'cors';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the TTS client with credentials from environment
let ttsClient;
try {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    ttsClient = new TextToSpeechClient({ credentials });
    console.log('✅ Google Cloud TTS client initialized');
} catch (error) {
    console.error('❌ Failed to initialize TTS client:', error.message);
    console.log('⚠️  Falling back to Web Speech API mode');
}

// TTS endpoint
app.post('/api/tts', async (req, res) => {
    if (!ttsClient) {
        return res.status(503).json({ error: 'TTS client not available', fallback: true });
    }

    const { text, voice = 'es-ES-Wavenet-B', speakingRate = 1.0 } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        const [response] = await ttsClient.synthesizeSpeech({
            input: { text },
            voice: {
                languageCode: voice.substring(0, 5), // e.g., "es-ES"
                name: voice,
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate,
                pitch: 0,
            },
        });

        // Return audio as base64
        res.json({
            audioContent: response.audioContent.toString('base64'),
            format: 'audio/mp3',
        });
    } catch (error) {
        console.error('TTS Error:', error.message);
        res.status(500).json({ error: error.message, fallback: true });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', ttsAvailable: !!ttsClient });
});

const PORT = process.env.TTS_PORT || 3001;
app.listen(PORT, () => {
    console.log(`🎤 TTS Server running on http://localhost:${PORT}`);
});
