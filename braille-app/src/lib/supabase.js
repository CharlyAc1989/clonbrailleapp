/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for use throughout the app.
 * Environment variables are loaded via Vite's import.meta.env
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Persist session in localStorage (good for PWA)
        persistSession: true,
        // Auto-refresh tokens before they expire
        autoRefreshToken: true,
        // Detect session from URL (for OAuth redirects)
        detectSessionInUrl: true,
    },
});

/**
 * Helper to get the current user session
 * @returns {Promise<Session | null>}
 */
export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/**
 * Helper to get the current user
 * @returns {Promise<User | null>}
 */
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * Subscribe to auth state changes
 * @param {function} callback - Called with (event, session) on auth changes
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
}

/**
 * Sign in with magic link (passwordless email)
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function signInWithMagicLink(email) {
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                // Redirect back to app after clicking link
                emailRedirectTo: window.location.origin,
            },
        });

        if (error) {
            console.error('Magic link error:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Magic link exception:', err);
        return { success: false, error: 'Error al enviar el enlace. Intenta de nuevo.' };
    }
}

/**
 * Sign out the current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Sign out error:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Sign out exception:', err);
        return { success: false, error: 'Error al cerrar sesión.' };
    }
}

/**
 * Check if user is currently authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
    const session = await getSession();
    return session !== null;
}

/**
 * Sign in with Google OAuth
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function signInWithGoogle() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });

        if (error) {
            console.error('Google sign-in error:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Google sign-in exception:', err);
        return { success: false, error: 'Error al iniciar con Google. Intenta de nuevo.' };
    }
}
