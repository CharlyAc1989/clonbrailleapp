/**
 * Haptic Service
 * Handles vibration patterns for tactile feedback
 */

export const HapticService = {
    vibrate(pattern) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    },

    tap() {
        this.vibrate(50);
    },

    success() {
        this.vibrate([50, 50, 100]);
    },

    error() {
        this.vibrate([100, 50, 100]);
    },

    dots(dotPattern) {
        // Create a haptic pattern based on Braille dots
        const pattern = [];
        dotPattern.forEach((dot, i) => {
            pattern.push(80); // vibrate
            if (i < dotPattern.length - 1) {
                pattern.push(50); // pause
            }
        });
        this.vibrate(pattern);
    }
};

export default HapticService;
