/**
 * Persistent Storage using Capacitor Filesystem
 * Provides reliable, timing-independent token persistence on iOS
 */

const STORAGE_DIR = 'nora_secure';
const TOKEN_FILE = 'token.json';

/**
 * Get the correct Directory constant for Capacitor Filesystem
 * Handles Capacitor 6+ API differences
 */
function getDocumentsDirectory() {
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins || !Capacitor.Plugins.Filesystem) {
        return 'DOCUMENTS'; // Fallback string
    }

    const Filesystem = Capacitor.Plugins.Filesystem;

    // Try different ways to access Directory enum (Capacitor version compatibility)
    if (Filesystem.Directory && Filesystem.Directory.Documents) {
        return Filesystem.Directory.Documents;
    }

    // Fallback to string constant
    return 'DOCUMENTS';
}

/**
 * Initialize filesystem storage
 */
async function initPersistentStorage() {
    try {
        if (typeof Capacitor === 'undefined') {
            console.log('[PersistentStorage] Capacitor not available - using localStorage only');
            return false;
        }

        // Check if directory exists, create if needed
        try {
            await Capacitor.Plugins.Filesystem.stat({
                path: STORAGE_DIR,
                directory: getDocumentsDirectory()
            });
            console.log('✅ [PersistentStorage] Storage directory exists');
        } catch (e) {
            console.log('📁 [PersistentStorage] Creating storage directory...');
            await Capacitor.Plugins.Filesystem.mkdir({
                path: STORAGE_DIR,
                directory: getDocumentsDirectory(),
                recursive: true
            });
            console.log('✅ [PersistentStorage] Storage directory created');
        }

        return true;
    } catch (e) {
        console.error('❌ [PersistentStorage] Initialization error:', e.message);
        return false;
    }
}

/**
 * Store token to persistent filesystem storage
 * Returns immediately - doesn't wait for plugins
 */
async function storeTokenPersistent(token) {
    if (!token) {
        console.warn('⚠️ [PersistentStorage] Attempted to store empty token');
        return false;
    }

    try {
        // Always store to localStorage immediately (for current session)
        try {
            localStorage.setItem('token', token);
            console.log('✅ Token stored to localStorage (current session)');
        } catch (e) {
            console.warn('⚠️ localStorage not available:', e.message);
        }

        // Try filesystem storage in background (for next app restart)
        if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.Filesystem) {
            console.log('🔄 [PersistentStorage] Storing token to filesystem...');

            const data = {
                token: token,
                storedAt: new Date().toISOString()
            };

            await Capacitor.Plugins.Filesystem.writeFile({
                path: `${STORAGE_DIR}/${TOKEN_FILE}`,
                data: JSON.stringify(data),
                directory: getDocumentsDirectory(),
                encoding: 'utf8',
                recursive: true
            });

            console.log('✅ Token stored to persistent filesystem');
            return true;
        } else {
            console.log('ℹ️ [PersistentStorage] Filesystem plugin not available');
            return false;
        }
    } catch (e) {
        console.error('❌ [PersistentStorage] Storage error:', e.message);
        return false;
    }
}

/**
 * Load token from persistent filesystem storage
 * Fast - doesn't wait for plugins, tries immediately
 */
async function loadTokenPersistent() {
    try {
        // First, try filesystem (most reliable on iOS)
        if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.Filesystem) {
            try {
                console.log('📖 [PersistentStorage] Reading token from filesystem...');

                const fileContent = await Capacitor.Plugins.Filesystem.readFile({
                    path: `${STORAGE_DIR}/${TOKEN_FILE}`,
                    directory: getDocumentsDirectory(),
                    encoding: 'utf8'
                });

                const data = JSON.parse(fileContent.data);
                if (data.token) {
                    console.log('✅ Token loaded from persistent filesystem');
                    // Update localStorage for current session
                    try {
                        localStorage.setItem('token', data.token);
                    } catch (e) {
                        console.warn('localStorage not available:', e.message);
                    }
                    return data.token;
                }
            } catch (e) {
                if (e.message && e.message.includes('NOT FOUND')) {
                    console.log('ℹ️ No token file in filesystem');
                } else {
                    console.error('⚠️ Filesystem read error:', e.message);
                }
            }
        }

        // Fallback to localStorage
        try {
            const token = localStorage.getItem('token');
            if (token) {
                console.log('✅ Token loaded from localStorage (fallback)');
                return token;
            }
        } catch (e) {
            console.warn('localStorage not available:', e.message);
        }

        console.log('❌ No token found in any storage');
        return null;
    } catch (e) {
        console.error('❌ [PersistentStorage] Load error:', e.message);
        return null;
    }
}

/**
 * Clear all stored tokens
 */
async function clearTokenPersistent() {
    console.log('🗑️ [PersistentStorage] Clearing all tokens...');

    // Clear localStorage
    try {
        localStorage.removeItem('token');
        console.log('✅ Token cleared from localStorage');
    } catch (e) {
        console.warn('localStorage error:', e.message);
    }

    // Clear filesystem
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.Filesystem) {
        try {
            await Capacitor.Plugins.Filesystem.deleteFile({
                path: `${STORAGE_DIR}/${TOKEN_FILE}`,
                directory: getDocumentsDirectory()
            });
            console.log('✅ Token cleared from filesystem');
        } catch (e) {
            if (!e.message || !e.message.includes('NOT FOUND')) {
                console.warn('Filesystem error:', e.message);
            }
        }
    }
}

// Export functions to window for global access
window.initPersistentStorage = initPersistentStorage;
window.storeTokenPersistent = storeTokenPersistent;
window.loadTokenPersistent = loadTokenPersistent;
window.clearTokenPersistent = clearTokenPersistent;
console.log('[PersistentStorage] Functions exported to window');
