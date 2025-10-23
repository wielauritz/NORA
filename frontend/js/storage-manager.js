/**
 * Storage Manager für sichere Token/User Persistierung
 * Kombiniert localStorage mit In-Memory Fallback
 */

class StorageManager {
    constructor() {
        this.inMemoryStorage = {};
        this.useLocalStorage = this.checkLocalStorage();
    }

    /**
     * Check if localStorage is available and working
     */
    checkLocalStorage() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage nicht verfügbar, nutze in-memory storage');
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
            } catch (e) {
                console.warn(`Fehler beim Speichern in localStorage: ${e}`);
                this.inMemoryStorage[key] = stringValue;
            }
        } else {
            this.inMemoryStorage[key] = stringValue;
        }

        console.log(`[Storage] Gespeichert: ${key}`);
    }

    /**
     * Get item from storage
     */
    getItem(key) {
        let value = null;

        if (this.useLocalStorage) {
            try {
                value = localStorage.getItem(key);
            } catch (e) {
                console.warn(`Fehler beim Abrufen aus localStorage: ${e}`);
                value = this.inMemoryStorage[key] || null;
            }
        } else {
            value = this.inMemoryStorage[key] || null;
        }

        console.log(`[Storage] Abgerufen: ${key} = ${value ? '***' : 'null'}`);
        return value;
    }

    /**
     * Remove item from storage
     */
    removeItem(key) {
        if (this.useLocalStorage) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn(`Fehler beim Löschen aus localStorage: ${e}`);
                delete this.inMemoryStorage[key];
            }
        } else {
            delete this.inMemoryStorage[key];
        }

        console.log(`[Storage] Gelöscht: ${key}`);
    }

    /**
     * Clear all storage
     */
    clear() {
        if (this.useLocalStorage) {
            try {
                localStorage.clear();
            } catch (e) {
                console.warn(`Fehler beim Löschen des localStorage: ${e}`);
                this.inMemoryStorage = {};
            }
        } else {
            this.inMemoryStorage = {};
        }

        console.log('[Storage] Alle Daten gelöscht');
    }
}

// Erstelle globale Instanz
const storage = new StorageManager();
