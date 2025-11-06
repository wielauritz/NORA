/**
 * App Update Manager using @capgo/capacitor-updater
 * Downloads and switches to new HTML/CSS/JS versions from server
 */

const APP_VERSION = '1.0.0';
const UPDATE_CHECK_URL = 'https://api.new.nora-nak.de/v1/updates/manifest.json';
const VERSION_STORAGE_KEY = 'installed_bundle_version';
const LAST_CHECK_KEY = 'last_update_check';
const UPDATE_CHECK_INTERVAL = 3600000; // 1 hour

class AppUpdater {
    constructor() {
        this.currentVersion = APP_VERSION;
        this.isCapacitor = typeof window.Capacitor !== 'undefined';
        this.downloadedBundle = null;
    }

    /**
     * Get CapacitorUpdater plugin instance
     * Uses direct plugin access to avoid import delays
     */
    getUpdaterPlugin() {
        if (!this.isCapacitor) {
            throw new Error('Not running in Capacitor');
        }

        const plugin = window.Capacitor?.Plugins?.CapacitorUpdater;
        if (!plugin) {
            throw new Error('CapacitorUpdater plugin not found');
        }

        return plugin;
    }

    /**
     * Initialize the updater
     * MUST be called on app startup
     */
    async initialize() {
        if (!this.isCapacitor) {
            console.log('[AppUpdater] Not running in Capacitor, updates disabled');
            return;
        }

        try {
            // CRITICAL: Notify the plugin that the app loaded successfully ASAP
            const CapacitorUpdater = this.getUpdaterPlugin();
            await CapacitorUpdater.notifyAppReady();
            console.log('[AppUpdater] App ready notification sent');

            // Set up background update listener (non-blocking)
            this.setupBackgroundUpdateListener().catch(err =>
                console.error('[AppUpdater] Background listener setup failed:', err)
            );

            // Check for updates on startup (non-blocking)
            this.checkForUpdates().catch(err =>
                console.error('[AppUpdater] Update check failed:', err)
            );
        } catch (error) {
            console.error('[AppUpdater] Initialization failed:', error);
        }
    }

    /**
     * Check if updates are available from the server
     */
    async checkForUpdates(force = false) {
        if (!this.isCapacitor) return;

        const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
        const now = Date.now();

        // Rate limiting (unless forced)
        if (!force && lastCheck && (now - parseInt(lastCheck)) < UPDATE_CHECK_INTERVAL) {
            console.log('[AppUpdater] Update check skipped (checked recently)');
            return;
        }

        try {
            console.log('[AppUpdater] Checking for updates...');

            // Fetch update manifest from server
            let manifest;

            if (window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp) {
                const { CapacitorHttp } = window.Capacitor.Plugins;
                const response = await CapacitorHttp.request({
                    url: `${UPDATE_CHECK_URL}?t=${Date.now()}`,
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });

                if (response.status !== 200) {
                    console.log('[AppUpdater] No update manifest found');
                    return;
                }

                manifest = response.data;
            } else {
                const response = await fetch(`${UPDATE_CHECK_URL}?t=${Date.now()}`);
                if (!response.ok) {
                    console.log('[AppUpdater] No update manifest found');
                    return;
                }
                manifest = await response.json();
            }

            const serverVersion = manifest.version;
            const bundleUrl = manifest.url;

            if (!serverVersion || !bundleUrl) {
                console.error('[AppUpdater] Invalid manifest format:', manifest);
                return;
            }

            // Save last check time
            localStorage.setItem(LAST_CHECK_KEY, now.toString());

            // Get currently installed bundle version
            const installedVersion = localStorage.getItem(VERSION_STORAGE_KEY) || APP_VERSION;

            console.log(`[AppUpdater] Versions - Installed: ${installedVersion}, Server: ${serverVersion}`);

            // Compare versions
            if (this.compareVersions(serverVersion, installedVersion) > 0) {
                console.log(`[AppUpdater] New version available: ${serverVersion}`);
                await this.downloadUpdate(serverVersion, bundleUrl);
            } else {
                console.log('[AppUpdater] App is up to date');
            }
        } catch (error) {
            console.error('[AppUpdater] Update check failed:', error);
        }
    }

    /**
     * Download the update bundle
     */
    async downloadUpdate(version, url) {
        try {
            console.log(`[AppUpdater] Downloading update ${version} from ${url}...`);

            const CapacitorUpdater = this.getUpdaterPlugin();

            // Download the bundle (zip file)
            const downloaded = await CapacitorUpdater.download({
                version: version,
                url: url
            });

            console.log('[AppUpdater] Download complete:', downloaded);
            this.downloadedBundle = downloaded;

            // Store the version we downloaded
            localStorage.setItem(VERSION_STORAGE_KEY, version);

            // Show notification to user
            console.log(`[AppUpdater] Update ${version} downloaded. Will be applied when you close the app.`);

            // Auto-apply update when app goes to background
            // OR you can call this.applyUpdate() immediately for instant update
        } catch (error) {
            console.error('[AppUpdater] Download failed:', error);
        }
    }

    /**
     * Apply the downloaded update
     * This will reload the app with the new bundle
     */
    async applyUpdate() {
        if (!this.downloadedBundle) {
            console.log('[AppUpdater] No update to apply');
            return;
        }

        try {
            console.log('[AppUpdater] Applying update...');

            const CapacitorUpdater = this.getUpdaterPlugin();

            // Switch to the new bundle and reload
            await CapacitorUpdater.set(this.downloadedBundle);

            // The app will reload automatically with the new version
            // If it fails, it will rollback to the previous version
        } catch (error) {
            console.error('[AppUpdater] Apply update failed:', error);
        }
    }

    /**
     * Set up listener to apply updates when app goes to background
     */
    async setupBackgroundUpdateListener() {
        if (!this.isCapacitor) return;

        try {
            const App = window.Capacitor?.Plugins?.App;

            if (!App) {
                console.warn('[AppUpdater] App plugin not found, background updates disabled');
                return;
            }

            App.addListener('appStateChange', async (state) => {
                if (!state.isActive && this.downloadedBundle) {
                    console.log('[AppUpdater] App going to background, applying update');
                    await this.applyUpdate();
                }
            });
        } catch (error) {
            console.warn('[AppUpdater] Could not setup background listener:', error);
        }
    }

    /**
     * Compare semantic versions
     * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
     */
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(n => parseInt(n) || 0);
        const parts2 = v2.split('.').map(n => parseInt(n) || 0);

        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        return 0;
    }

    /**
     * Get current bundle info
     */
    async getBundleInfo() {
        if (!this.isCapacitor) return null;

        try {
            const CapacitorUpdater = this.getUpdaterPlugin();
            const info = await CapacitorUpdater.current();
            console.log('[AppUpdater] Current bundle:', info);
            return info;
        } catch (error) {
            console.error('[AppUpdater] Failed to get bundle info:', error);
            return null;
        }
    }

    /**
     * List all downloaded bundles
     */
    async listBundles() {
        if (!this.isCapacitor) return [];

        try {
            const CapacitorUpdater = this.getUpdaterPlugin();
            const bundles = await CapacitorUpdater.list();
            console.log('[AppUpdater] All bundles:', bundles);
            return bundles;
        } catch (error) {
            console.error('[AppUpdater] Failed to list bundles:', error);
            return [];
        }
    }

    /**
     * Reset to built-in bundle (emergency rollback)
     */
    async resetToBuiltIn() {
        if (!this.isCapacitor) return;

        try {
            console.log('[AppUpdater] Resetting to built-in bundle...');
            const CapacitorUpdater = this.getUpdaterPlugin();
            await CapacitorUpdater.reset();
            localStorage.removeItem(VERSION_STORAGE_KEY);
            window.location.reload();
        } catch (error) {
            console.error('[AppUpdater] Reset failed:', error);
        }
    }
}

// Global instance
const appUpdater = new AppUpdater();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.appUpdater = appUpdater;
}
