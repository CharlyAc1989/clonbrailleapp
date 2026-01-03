/**
 * State migration helpers
 */

export function migrateProgress(parsedProgress = {}, defaultProgress = {}) {
    const mergedProgress = { ...defaultProgress, ...parsedProgress };
    let migrated = false;

    if (Array.isArray(parsedProgress?.completedLevels)) {
        const currentLevels = Array.isArray(mergedProgress.levelsCompleted)
            ? mergedProgress.levelsCompleted
            : [];
        const mergedLevels = Array.from(new Set([...currentLevels, ...parsedProgress.completedLevels]));
        if (mergedLevels.length !== currentLevels.length) {
            mergedProgress.levelsCompleted = mergedLevels;
        }
        migrated = true;
    }

    if (typeof parsedProgress?.xp === 'number' && !Number.isNaN(parsedProgress.xp)) {
        mergedProgress.totalXP = (mergedProgress.totalXP || 0) + parsedProgress.xp;
        migrated = true;
    }

    if (Object.prototype.hasOwnProperty.call(mergedProgress, 'xp')) {
        delete mergedProgress.xp;
        migrated = true;
    }
    if (Object.prototype.hasOwnProperty.call(mergedProgress, 'completedLevels')) {
        delete mergedProgress.completedLevels;
        migrated = true;
    }

    return { progress: mergedProgress, migrated };
}
