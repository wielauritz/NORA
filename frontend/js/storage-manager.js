/**
 * Storage Manager für Token/User Persistierung
 * Nutzt direkt localStorage mit Fallback
 */

class StorageManager {
    constructor() {
        this.useLocalStorage = this.testLocalStorage();
        this.fallbackStorage = {}; // In-Memory Fallback
    }

    /**
     * Test ob localStorage funktioniert
     */
    testLocalStorage() {
        try {
            const test = '__test__' + Date.now();
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            console.log('[Storage] localStorage verfügbar');
            return true;
        } catch (e) {
            console.warn('[Storage] localStorage nicht verfügbar, nutze Fallback');
            return false;
        }
    }

    /**
     * Set item in storage
     */
    setItem(key, value) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        if (this.useLocalStorage) {
            try {
                localStorage.setItem(key, stringValue);
                console.log(`[Storage] localStorage: ${key} = ${stringValue.substring(0, 50)}...`);
            } catch (e) {
                console.error(`[Storage] Fehler bei localStorage.setItem: ${e}`);
                this.fallbackStorage[key] = stringValue;
            }
        } else {
            this.fallbackStorage[key] = stringValue;
            console.log(`[Storage] Fallback: ${key} gespeichert`);
        }
    }

    /**
     * Get item from storage
     */
    getItem(key) {
        if (this.useLocalStorage) {
            try {
                const value = localStorage.getItem(key);
                if (value) {
                    console.log(`[Storage] localStorage: ${key} gefunden`);
                    return value;
                }
            } catch (e) {
                console.error(`[Storage] Fehler bei localStorage.getItem: ${e}`);
            }
        }

        // Fallback
        if (this.fallbackStorage[key]) {
            console.log(`[Storage] Fallback: ${key} gefunden`);
            return this.fallbackStorage[key];
        }

        console.log(`[Storage] ${key} nicht gefunden`);
        return null;
    }

    /**
     * Remove item from storage
     */
    removeItem(key) {
        if (this.useLocalStorage) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error(`[Storage] Fehler beim Löschen: ${e}`);
            }
        }
        delete this.fallbackStorage[key];
        console.log(`[Storage] ${key} gelöscht`);
    }

    /**
     * Clear all storage
     */
    clear() {
        if (this.useLocalStorage) {
            try {
                localStorage.clear();
            } catch (e) {
                console.error(`[Storage] Fehler beim Clear: ${e}`);
            }
        }
        this.fallbackStorage = {};
        console.log('[Storage] Alle Daten gelöscht');
    }
}

// Erstelle globale Instanz - assign to window first, then create global reference
window.storage = new StorageManager();

// Create global 'storage' variable without var/let/const (implicitly global)
// This works in dynamically loaded scripts without declaration conflicts
storage = window.storage;

console.log('[StorageManager] Exported to window.storage');
