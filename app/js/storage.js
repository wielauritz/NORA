/**
 * Storage Module for NORA Mobile App
 * Uses Capacitor Preferences for persistent token storage
 */

const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    LAST_PAGE: 'last_page'
};

/**
 * Storage class using Capacitor Preferences
 */
class Storage {
    constructor() {
        this.isCapacitor = typeof window.Capacitor !== 'undefined';
        this.preferences = this.isCapacitor ? window.Capacitor.Plugins.Preferences : null;
    }

    /**
     * Store auth token
     * @param {string} token - JWT token
     */
    async storeToken(token) {
        try {
            if (this.isCapacitor && this.preferences) {
                await this.preferences.set({
                    key: STORAGE_KEYS.AUTH_TOKEN,
                    value: token
                });
                console.log('[Storage] Token stored in Capacitor Preferences');
            } else {
                // Fallback to localStorage for web testing
                localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
                console.log('[Storage] Token stored in localStorage (fallback)');
            }
        } catch (error) {
            console.error('[Storage] Failed to store token:', error);
            throw error;
        }
    }

    /**
     * Get auth token
     * @returns {Promise<string|null>} Token or null if not found
     */
    async getToken() {
        try {
            if (this.isCapacitor && this.preferences) {
                const result = await this.preferences.get({
                    key: STORAGE_KEYS.AUTH_TOKEN
                });
                console.log('[Storage] Token retrieved from Capacitor Preferences:', !!result.value);
                return result.value || null;
            } else {
                // Fallback to localStorage for web testing
                const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
                console.log('[Storage] Token retrieved from localStorage (fallback):', !!token);
                return token;
            }
        } catch (error) {
            console.error('[Storage] Failed to get token:', error);
            return null;
        }
    }

    /**
     * Clear auth token
     */
    async clearToken() {
        try {
            if (this.isCapacitor && this.preferences) {
                await this.preferences.remove({
                    key: STORAGE_KEYS.AUTH_TOKEN
                });
                console.log('[Storage] Token cleared from Capacitor Preferences');
            } else {
                localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
                console.log('[Storage] Token cleared from localStorage (fallback)');
            }
        } catch (error) {
            console.error('[Storage] Failed to clear token:', error);
            throw error;
        }
    }

    /**
     * Store user data
     * @param {Object} userData - User information
     */
    async storeUserData(userData) {
        try {
            const dataString = JSON.stringify(userData);
            if (this.isCapacitor && this.preferences) {
                await this.preferences.set({
                    key: STORAGE_KEYS.USER_DATA,
                    value: dataString
                });
            } else {
                localStorage.setItem(STORAGE_KEYS.USER_DATA, dataString);
            }
            console.log('[Storage] User data stored');
        } catch (error) {
            console.error('[Storage] Failed to store user data:', error);
        }
    }

    /**
     * Get user data
     * @returns {Promise<Object|null>}
     */
    async getUserData() {
        try {
            let dataString = null;
            if (this.isCapacitor && this.preferences) {
                const result = await this.preferences.get({
                    key: STORAGE_KEYS.USER_DATA
                });
                dataString = result.value;
            } else {
                dataString = localStorage.getItem(STORAGE_KEYS.USER_DATA);
            }
            return dataString ? JSON.parse(dataString) : null;
        } catch (error) {
            console.error('[Storage] Failed to get user data:', error);
            return null;
        }
    }

    /**
     * Store last visited page
     * @param {string} page - Page URL or identifier
     */
    async storeLastPage(page) {
        try {
            if (this.isCapacitor && this.preferences) {
                await this.preferences.set({
                    key: STORAGE_KEYS.LAST_PAGE,
                    value: page
                });
            } else {
                localStorage.setItem(STORAGE_KEYS.LAST_PAGE, page);
            }
        } catch (error) {
            console.error('[Storage] Failed to store last page:', error);
        }
    }

    /**
     * Get last visited page
     * @returns {Promise<string|null>}
     */
    async getLastPage() {
        try {
            if (this.isCapacitor && this.preferences) {
                const result = await this.preferences.get({
                    key: STORAGE_KEYS.LAST_PAGE
                });
                return result.value || null;
            } else {
                return localStorage.getItem(STORAGE_KEYS.LAST_PAGE);
            }
        } catch (error) {
            console.error('[Storage] Failed to get last page:', error);
            return null;
        }
    }

    /**
     * Clear all storage
     */
    async clearAll() {
        try {
            if (this.isCapacitor && this.preferences) {
                await this.preferences.clear();
                console.log('[Storage] All data cleared from Capacitor Preferences');
            } else {
                localStorage.clear();
                console.log('[Storage] All data cleared from localStorage (fallback)');
            }
        } catch (error) {
            console.error('[Storage] Failed to clear all data:', error);
            throw error;
        }
    }
}

// Create singleton instance
const storage = new Storage();

// Export for use in other modules
window.AppStorage = storage;
