/**
 * Supabase Data Sync Service
 * 
 * Handles syncing app state with Supabase database.
 * Provides functions to load, save, and sync user data.
 */

import { supabase, getCurrentUser } from './supabase.js';

/**
 * Load all user data from Supabase
 * @param {string} [userId] - Optional user ID. If not provided, will call getCurrentUser().
 * @returns {Promise<{profile, progress, settings, pet} | null>}
 */
export async function loadUserData(userId = null) {
    let id = userId;

    // Only call getCurrentUser if no userId was provided
    if (!id) {
        const user = await getCurrentUser();
        if (!user) return null;
        id = user.id;
    }

    try {
        // Fetch all data in parallel
        const [profileRes, progressRes, settingsRes, petRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', id).single(),
            supabase.from('user_progress').select('*').eq('user_id', id).single(),
            supabase.from('user_settings').select('*').eq('user_id', id).single(),
            supabase.from('pet_state').select('*').eq('user_id', id).single(),
        ]);

        return {
            profile: profileRes.data,
            progress: progressRes.data,
            settings: settingsRes.data,
            pet: petRes.data,
        };
    } catch (error) {
        console.error('Error loading user data:', error);
        return null;
    }
}

/**
 * Save user profile to Supabase
 * @param {Object} profile - {name, ageRange}
 * @param {string|null} userId - Optional known user id to avoid extra lookups
 */
export async function saveProfile(profile, userId = null) {
    const id = userId || (await getCurrentUser())?.id;
    if (!id) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id, // Required for upsert conflict resolution
            name: profile.name,
            avatar: profile.avatar,
            age_range: profile.ageRange,
            user_role: profile.role,
            braille_level: profile.brailleExperience,
            learning_goals: profile.learningGoals,
            learning_preferences: profile.learningPreferences,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

    if (error) {
        console.error('Error saving profile:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

/**
 * Save user progress to Supabase
 * @param {Object} progress - Progress data from app state
 * @param {string|null} userId - Optional known user id to avoid extra lookups
 */
export async function saveProgress(progress, userId = null) {
    const id = userId || (await getCurrentUser())?.id;
    if (!id) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
        .from('user_progress')
        .upsert({
            user_id: id,
            total_xp: progress.totalXP,
            current_streak: progress.currentStreak,
            best_streak: progress.bestStreak,
            last_played_at: progress.lastPlayedAt,
            levels_completed: progress.levelsCompleted,
            level_stars: progress.levelStars,
            letters_learned: progress.lettersLearned,
            achievements: progress.achievements,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (error) {
        console.error('Error saving progress:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

/**
 * Save user settings to Supabase
 * @param {Object} settings - Settings from app state
 * @param {string|null} userId - Optional known user id to avoid extra lookups
 */
export async function saveSettings(settings, userId = null) {
    const id = userId || (await getCurrentUser())?.id;
    if (!id) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
        .from('user_settings')
        .upsert({
            user_id: id,
            screen_reader: settings.screenReader,
            haptic_feedback: settings.hapticFeedback,
            high_contrast: settings.highContrast,
            font_size: settings.fontSize,
            audio_speed: settings.audioSpeed,
            timed_challenges: settings.timedChallenges,
            reminders: settings.reminders,
            news_updates: settings.newsUpdates,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (error) {
        console.error('Error saving settings:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

/**
 * Save pet state to Supabase
 * @param {Object} pet - Pet data from app state
 * @param {string|null} userId - Optional known user id to avoid extra lookups
 */
export async function savePetState(pet, userId = null) {
    const id = userId || (await getCurrentUser())?.id;
    if (!id) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
        .from('pet_state')
        .upsert({
            user_id: id,
            pet_type: pet.type,
            pet_name: pet.name,
            pet_level: pet.level,
            pet_xp: pet.xp,
            happiness: pet.happiness,
            stage: pet.stage,
            last_interaction: pet.lastInteraction,
            total_identify: pet.labStats?.totalIdentify || 0,
            total_challenge_success: pet.labStats?.totalChallengeSuccess || 0,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (error) {
        console.error('Error saving pet state:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

/**
 * Convert Supabase data format to app state format
 * @param {Object} data - Data from loadUserData()
 * @returns {Object} - App state format
 */
export function toAppState(data) {
    if (!data) return null;

    return {
        profile: {
            name: data.profile?.name || data.profile?.preferred_name || '',
            avatar: data.profile?.avatar || '🐶',
            ageRange: data.profile?.age_range || null,
            role: data.profile?.user_role || null,
            brailleExperience: data.profile?.braille_level || null,
            learningGoals: data.profile?.learning_goals || [],
            learningPreferences: data.profile?.learning_preferences || [],
            createdAt: data.profile?.created_at || null,
            onboardingCompleted: data.profile?.onboarding_completed === true, // Explicit boolean check
        },
        settings: {
            screenReader: data.settings?.screen_reader ?? false,
            hapticFeedback: data.settings?.haptic_feedback ?? true,
            highContrast: data.settings?.high_contrast ?? false,
            fontSize: data.settings?.font_size || 'large',
            audioSpeed: data.settings?.audio_speed ?? 1,
            timedChallenges: data.settings?.timed_challenges ?? false,
            reminders: data.settings?.reminders ?? true,
            newsUpdates: data.settings?.news_updates ?? false,
        },
        progress: {
            totalXP: data.progress?.total_xp ?? 0,
            currentStreak: data.progress?.current_streak ?? 0,
            bestStreak: data.progress?.best_streak ?? 0,
            lastPlayedAt: data.progress?.last_played_at || null,
            levelsCompleted: data.progress?.levels_completed || [],
            levelStars: data.progress?.level_stars || {},
            lettersLearned: data.progress?.letters_learned || [],
            achievements: data.progress?.achievements || [],
        },
        pet: {
            type: data.pet?.pet_type || 'puppy',
            name: data.pet?.pet_name || 'Braillito',
            level: data.pet?.pet_level ?? 1,
            xp: data.pet?.pet_xp ?? 0,
            happiness: data.pet?.happiness ?? 100,
            stage: data.pet?.stage ?? 1,
            lastInteraction: data.pet?.last_interaction || null,
            labStats: {
                totalIdentify: data.pet?.total_identify ?? 0,
                totalChallengeSuccess: data.pet?.total_challenge_success ?? 0,
            },
        },
    };
}

/**
 * Sync all app state to Supabase (debounced use recommended)
 * @param {Object} state - Full app state
 */
export async function syncAllData(state, userId = null) {
    const id = userId || (await getCurrentUser())?.id;
    if (!id) return { success: false, error: 'Not authenticated' };

    try {
        await Promise.all([
            saveProfile(state.profile, id),
            saveProgress(state.progress, id),
            saveSettings(state.settings, id),
            savePetState(state.pet, id),
        ]);
        return { success: true };
    } catch (error) {
        console.error('Error syncing all data:', error);
        return { success: false, error: error.message };
    }
}
