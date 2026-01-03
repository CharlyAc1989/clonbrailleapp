/**
 * Games Module Barrel Export
 * 
 * Provides a single import point for all mini-games.
 * 
 * Usage:
 *   import { createGuessLetterGame } from './games/index.js';
 *   const game = createGuessLetterGame(dependencies);
 *   game.init();
 */

export { createGuessLetterGame } from './GuessLetterGame.js';
export { createFormWordGame } from './FormWordGame.js';
export { createMemoryGame } from './MemoryGame.js';

