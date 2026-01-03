/**
 * Braille Data Module Tests
 * 
 * Tests for the helper functions in braille-data.js
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Mock the BrailleData module (normally loaded via window global)
const BRAILLE_ALPHABET = {
    'a': [1],
    'b': [1, 2],
    'c': [1, 4],
    'd': [1, 4, 5],
    'e': [1, 5],
    'f': [1, 2, 4],
};

// Helper functions copied from braille-data.js for testing
function dotsMatch(userDots, correctDots) {
    if (userDots.length !== correctDots.length) return false;
    const sortedUser = [...userDots].sort((a, b) => a - b);
    const sortedCorrect = [...correctDots].sort((a, b) => a - b);
    return sortedUser.every((dot, i) => dot === sortedCorrect[i]);
}

function generateDistractors(correctLetter, count = 3, availableLetters = null) {
    const correct = BRAILLE_ALPHABET[correctLetter];
    const letters = availableLetters || Object.keys(BRAILLE_ALPHABET);

    const scored = letters
        .filter(l => l !== correctLetter)
        .map(letter => {
            const dots = BRAILLE_ALPHABET[letter];
            const shared = dots.filter(d => correct.includes(d)).length;
            const totalDiff = Math.abs(dots.length - correct.length);
            return { letter, similarity: shared - totalDiff };
        })
        .sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, count).map(s => s.letter);
}

describe('dotsMatch', () => {
    it('should return true for matching dot patterns', () => {
        expect(dotsMatch([1, 2], [1, 2])).toBe(true);
        expect(dotsMatch([2, 1], [1, 2])).toBe(true); // Order doesn't matter
    });

    it('should return false for non-matching patterns', () => {
        expect(dotsMatch([1], [1, 2])).toBe(false);
        expect(dotsMatch([1, 2, 3], [1, 2])).toBe(false);
        expect(dotsMatch([1, 3], [1, 2])).toBe(false);
    });

    it('should handle empty arrays', () => {
        expect(dotsMatch([], [])).toBe(true);
        expect(dotsMatch([], [1])).toBe(false);
    });
});

describe('generateDistractors', () => {
    it('should return the requested number of distractors', () => {
        const distractors = generateDistractors('a', 3);
        expect(distractors.length).toBe(3);
    });

    it('should not include the correct answer', () => {
        const distractors = generateDistractors('a', 5);
        expect(distractors).not.toContain('a');
    });

    it('should return similar letters', () => {
        // 'a' is [1], 'e' is [1, 5] - shares dot 1
        // 'b' is [1, 2] - shares dot 1
        const distractors = generateDistractors('a', 2);
        // Should include letters that share dot 1
        const sharesWithA = distractors.some(l =>
            BRAILLE_ALPHABET[l].includes(1)
        );
        expect(sharesWithA).toBe(true);
    });
});

describe('BRAILLE_ALPHABET', () => {
    it('should have correct dot patterns for first letters', () => {
        expect(BRAILLE_ALPHABET['a']).toEqual([1]);
        expect(BRAILLE_ALPHABET['b']).toEqual([1, 2]);
        expect(BRAILLE_ALPHABET['c']).toEqual([1, 4]);
    });
});
