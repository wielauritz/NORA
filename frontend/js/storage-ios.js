/**
 * iOS Storage Manager using Capacitor Preferences
 * Falls auf Capacitor Preferences zurück, dann localStorage
 */

class IOSStorage {
    constructor() {
        this.useCapacitor = this.checkCapacitor();
    }

    /**
     * Check if Capacitor is available
     */
    checkCapacitor() {
        return typeof Capacitor !== 'undefined' && Capacitor.isPluginAvailable('Preferences');
    }

    /**
     * Set item using Capacitor or localStorage
     */
    async setItem(key, value) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        if (this.useCapacitor) {
            try {
                const { Preferences } = Capacitor.plugins;
                await Preferences.set({
                    key: key,
                    value: stringValue
                });
                console.log(`[iOS Storage] Capacitor: ${key} gespeichert`);
                return;
            } catch (e) {
                console.error(`[iOS Storage] Capacitor fehler:`, e);
            }
        }

        // Fallback localStorage
        try {
            localStorage.setItem(key, stringValue);
            console.log(`[iOS Storage] localStorage: ${key} gespeichert`);
        } catch (e) {
            console.error(`[iOS Storage] localStorage fehler:`, e);
        }
    }

    /**
     * Get item using Capacitor or localStorage
     */
    async getItem(key) {
        if (this.useCapacitor) {
            try {
                const { Preferences } = Capacitor.plugins;
                const result = await Preferences.get({ key: key });
                if (result && result.value) {
                    console.log(`[iOS Storage] Capacitor: ${key} gefunden`);
                    return result.value;
                }
            } catch (e) {
                console.error(`[iOS Storage] Capacitor fehler:`, e);
            }
        }

        // Fallback localStorage
        try {
            const value = localStorage.getItem(key);
            if (value) {
                console.log(`[iOS Storage] localStorage: ${key} gefunden`);
                return value;
            }
        } catch (e) {
            console.error(`[iOS Storage] localStorage fehler:`, e);
        }

        console.log(`[iOS Storage] ${key} nicht gefunden`);
        return null;
    }

    /**
     * Remove item using Capacitor or localStorage
     */
    async removeItem(key) {
        if (this.useCapacitor) {
            try {
                const { Preferences } = Capacitor.plugins;
                await Preferences.remove({ key: key });
                console.log(`[iOS Storage] Capacitor: ${key} gelöscht`);
            } catch (e) {
                console.error(`[iOS Storage] Capacitor fehler beim Löschen:`, e);
            }
        }

        try {
            localStorage.removeItem(key);
            console.log(`[iOS Storage] localStorage: ${key} gelöscht`);
        } catch (e) {
            console.error(`[iOS Storage] localStorage fehler beim Löschen:`, e);
        }
    }

    /**
     * Clear all storage
     */
    async clear() {
        if (this.useCapacitor) {
            try {
                const { Preferences } = Capacitor.plugins;
                await Preferences.clear();
                console.log(`[iOS Storage] Capacitor gelöscht`);
            } catch (e) {
                console.error(`[iOS Storage] Capacitor fehler beim Clear:`, e);
            }
        }

        try {
            localStorage.clear();
            console.log(`[iOS Storage] localStorage gelöscht`);
        } catch (e) {
            console.error(`[iOS Storage] localStorage fehler beim Clear:`, e);
        }
    }
}

// Erstelle globale Instanz
const iosStorage = new IOSStorage();
