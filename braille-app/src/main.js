/**
 * Main Application Entry Point
 * Imports all modules and initializes the app
 */

// Import Vercel Speed Insights
import { injectSpeedInsights } from "@vercel/speed-insights";
injectSpeedInsights();

// Import services
import { StateService } from './services/StateService.js';
import { AudioService } from './services/AudioService.js';
import { HapticService } from './services/HapticService.js';
import { PWAService } from './services/PWAService.js';
import { TIMING } from './utils/timing.js';

// Re-export for use in other modules
export { StateService, AudioService, HapticService, PWAService, TIMING };

/**
 * Note: This main.js file is the new modular entry point.
 * The current app.js still contains the majority of the application logic
 * (game engines, UI updates, event handlers) that should be incrementally
 * migrated to separate modules.
 * 
 * Migration path:
 * 1. ✅ StateService - State management
 * 2. ✅ AudioService - TTS and sounds
 * 3. ✅ HapticService - Vibration patterns
 * 4. ✅ PWAService - Install prompt
 * 5. 🔲 InstructionEngine - Letter instruction animations
 * 6. 🔲 GameEngine - Game logic
 * 7. 🔲 Navigation - Screen transitions
 * 8. 🔲 UI modules - Dashboard, Levels, Practice, Progress
 * 
 * For now, app.js remains the primary entry point until full migration.
 */

// Initialize when DOM is ready
function init() {
    console.log('Braille Quest modular architecture ready');

    // Load saved state
    StateService.loadState();

    // Initialize PWA
    PWAService.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
