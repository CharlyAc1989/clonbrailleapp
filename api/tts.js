/**
 * Vercel Serverless Function for Google Cloud TTS
 * Path: /api/tts.js
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize the TTS client with credentials from environment
let ttsClient;
try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        ttsClient = new TextToSpeechClient({ credentials });
    }
} catch (error) {
    console.error('❌ Failed to initialize TTS client:', error.message);
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!ttsClient) {
        return res.status(503).json({
            error: 'TTS client not available. Make sure GOOGLE_APPLICATION_CREDENTIALS_JSON is set in Vercel settings.',
            fallback: true
        });
    }

    const { text, voice = 'es-US-Neural2-B', speakingRate = 1.0 } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        const [response] = await ttsClient.synthesizeSpeech({
            input: { text },
            voice: {
                languageCode: voice.substring(0, 5), // e.g., "es-US"
                name: voice,
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate,
                pitch: 0,
            },
        });

        // Return audio as base64
        res.status(200).json({
            audioContent: response.audioContent.toString('base64'),
            format: 'audio/mp3',
        });
    } catch (error) {
        console.error('TTS Error:', error.message);
        res.status(500).json({ error: error.message, fallback: true });
    }
}
