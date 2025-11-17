/**
 * App Update Manager für Hybrid Mobile Apps
 * Prüft beim App-Start, ob neue Versionen verfügbar sind
 */

// Get storage instance from window (exported by storage-manager.js)
// Use var to avoid redeclaration errors in browser when multiple scripts load
var storage = storage || window.storage;

const APP_VERSION = '1.0.0';
const UPDATE_CHECK_INTERVAL = 60000; // 1 Minute (für Development - in Production auf 3600000 setzen)
const VERSION_STORAGE_KEY = 'app_version';
const LAST_CHECK_KEY = 'last_update_check';

class AppUpdater {
    constructor() {
        this.currentVersion = APP_VERSION;
        this.isCapacitor = typeof window.Capacitor !== 'undefined';
    }

    /**
     * Prüft, ob App-Updates verfügbar sind
     */
    async checkForUpdates(force = false) {
        // Nur in Capacitor-Apps
        if (!this.isCapacitor) {
            console.log('[AppUpdater] Not running in Capacitor, skipping update check');
            return;
        }

        const lastCheck = storage.getItem(LAST_CHECK_KEY);
        const now = Date.now();

        // Prüfe nur einmal pro Interval (außer wenn force=true)
        if (!force && lastCheck && (now - parseInt(lastCheck)) < UPDATE_CHECK_INTERVAL) {
            console.log('[AppUpdater] Update check skipped (checked recently)');
            return;
        }

        try {
            // Prüfe Server-Version
            const response = await fetch(`${API_BASE_URL}/app-version`);
            const data = await response.json();

            const serverVersion = data.version;
            const storedVersion = storage.getItem(VERSION_STORAGE_KEY);

            // Speichere letzte Prüfzeit
            storage.setItem(LAST_CHECK_KEY, now.toString());

            // Vergleiche Versionen
            if (this.compareVersions(serverVersion, this.currentVersion) > 0) {
                console.log(`[AppUpdater] New version available: ${serverVersion} (current: ${this.currentVersion})`);
                await this.showUpdateNotification(serverVersion);
            } else {
                console.log(`[AppUpdater] App is up to date (${this.currentVersion})`);
            }

            // Speichere aktuelle Version
            storage.setItem(VERSION_STORAGE_KEY, this.currentVersion);
        } catch (error) {
            console.error('[AppUpdater] Update check failed:', error);
        }
    }

    /**
     * Vergleicht zwei Versionsnummern (semantic versioning)
     * @returns {number} -1 wenn v1 < v2, 0 wenn gleich, 1 wenn v1 > v2
     */
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(n => parseInt(n));
        const parts2 = v2.split('.').map(n => parseInt(n));

        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        return 0;
    }

    /**
     * Zeigt Update-Benachrichtigung
     */
    async showUpdateNotification(newVersion) {
        const message = `Eine neue Version (${newVersion}) ist verfügbar! Bitte aktualisiere die App im App Store.`;

        // Zeige native Alert (falls verfügbar)
        if (this.isCapacitor && window.Capacitor.Plugins.Dialog) {
            await window.Capacitor.Plugins.Dialog.alert({
                title: 'Update verfügbar',
                message: message
            });
        } else {
            // Fallback zu Browser-Alert
            alert(message);
        }
    }

    /**
     * Prüft, ob neue Content-Versionen (HTML/CSS/JS) verfügbar sind
     * Dies ermöglicht Hot-Updates ohne App Store Update
     */
    async checkContentUpdates() {
        try {
            console.log('[AppUpdater] Checking for content updates...');

            // Lade aktuelle Content-Version vom Server
            // Verwende Timestamp um Caching zu verhindern
            const response = await fetch(`/version.json?t=${Date.now()}`);

            if (!response.ok) {
                console.log('[AppUpdater] version.json not found, skipping content update check');
                return;
            }

            const serverData = await response.json();
            const serverVersion = serverData.version;

            // Hole gespeicherte lokale Version
            const localVersion = localStorage.getItem('content_version');

            console.log(`[AppUpdater] Content versions - Local: ${localVersion}, Server: ${serverVersion}`);

            // Wenn keine lokale Version gespeichert ist, speichere die aktuelle
            if (!localVersion) {
                localStorage.setItem('content_version', serverVersion);
                console.log('[AppUpdater] First run, saved content version:', serverVersion);
                return;
            }

            // Wenn Versionen unterschiedlich sind, lade neue Contents
            if (localVersion !== serverVersion) {
                console.log(`[AppUpdater] New content version available: ${serverVersion}`);
                console.log('[AppUpdater] Reloading app to fetch new content...');

                // Speichere neue Version BEVOR reload
                localStorage.setItem('content_version', serverVersion);

                // Hard reload (ohne Cache) um neue Contents zu laden
                // Token bleibt erhalten (in persistent storage)
                window.location.reload(true);
            } else {
                console.log('[AppUpdater] Content is up to date');
            }
        } catch (error) {
            console.error('[AppUpdater] Content update check failed:', error);
            // Bei Fehler nicht reloaden, sondern normal weitermachen
        }
    }

    /**
     * Erzwingt Update-Check
     */
    async forceUpdateCheck() {
        storage.removeItem(LAST_CHECK_KEY);
        await this.checkForUpdates();
    }
}

// Globale Instanz
const appUpdater = new AppUpdater();

// Auto-Check beim Laden (works for both static and dynamic loading)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAppUpdater);
} else {
    // DOM already loaded (script loaded dynamically) - initialize immediately
    startAppUpdater();
}

function startAppUpdater() {
    // Verzögert starten, damit andere Initialisierungen zuerst laufen
    setTimeout(() => {
        // Force beim ersten Laden, um Interval zu umgehen
        appUpdater.checkForUpdates(true);
    }, 2000);
}

// Periodischer Check alle 10 Minuten (wenn App offen)
setInterval(() => {
    appUpdater.checkForUpdates(false);
}, 600000);
