/**
 * State migration tests
 */

import { describe, it, expect } from 'vitest';
import { migrateProgress } from '../src/lib/stateMigration.js';

describe('migrateProgress', () => {
    it('migrates xp and completedLevels into the current schema', () => {
        const defaultProgress = { totalXP: 0, levelsCompleted: ['1-1'] };
        const parsedProgress = {
            totalXP: 10,
            xp: 15,
            levelsCompleted: ['1-1'],
            completedLevels: ['1-2', '1-1'],
        };

        const { progress, migrated } = migrateProgress(parsedProgress, defaultProgress);

        expect(progress.totalXP).toBe(25);
        expect(progress.levelsCompleted).toEqual(expect.arrayContaining(['1-1', '1-2']));
        expect(progress.levelsCompleted.length).toBe(2);
        expect(progress).not.toHaveProperty('xp');
        expect(progress).not.toHaveProperty('completedLevels');
        expect(migrated).toBe(true);
    });

    it('leaves progress untouched when no migration is needed', () => {
        const defaultProgress = { totalXP: 5, levelsCompleted: [] };
        const parsedProgress = { totalXP: 20, levelsCompleted: ['2-1'] };

        const { progress, migrated } = migrateProgress(parsedProgress, defaultProgress);

        expect(progress.totalXP).toBe(20);
        expect(progress.levelsCompleted).toEqual(['2-1']);
        expect(migrated).toBe(false);
    });
});
