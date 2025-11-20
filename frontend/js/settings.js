/**
 * NORA - Settings Page Script
 * Handles user settings management
 */

// Current settings cache
let currentSettings = null;
let allZenturien = [];
let userData = null;

// Initialization guards to prevent double initialization
let isInitializing = false;
let isInitialized = false;

/**
 * Initialize settings page
 */
async function initSettings() {
    // Prevent double initialization
    if (isInitializing) {
        console.log('⏭️ [Settings] Already initializing, skipping...');
        return;
    }

    if (isInitialized) {
        console.log('🔄 [Settings] Already initialized, reloading data only...');
        // Just reload settings data and refresh UI
        try {
            const settingsData = await UserAPI.getSettings();
            currentSettings = settingsData;

            // Refresh the form with current settings
            populateForm();

            // Refresh user display (initials)
            updateUserDisplay();

            console.log('✅ [Settings] Data reloaded successfully');

            // CRITICAL: Hide loader after reload complete
            pageContentReady();
        } catch (error) {
            console.error('[Settings] Error reloading data:', error);
            // Even on error, hide the loader
            pageContentReady();
        }
        return;
    }

    isInitializing = true;
    console.log('🚀 [Settings] Starting initialization...');

    try {
        // Check authentication first
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            return; // Redirect to login handled by checkAuth()
        }

        restorePreloaderIfNeeded();
        showContentLoader();

        // Load user profile, zenturien and settings in parallel
        const [profileData, zenturienData, settingsData] = await Promise.all([
            UserAPI.getProfile(),
            UserAPI.getAllZenturien(),
            UserAPI.getSettings()
        ]);

        userData = profileData;
        allZenturien = zenturienData;
        currentSettings = settingsData;

        console.log('✅ Settings loaded:', {
            user: userData,
            zenturien: allZenturien,
            settings: currentSettings
        });

        // Update user display (initials)
        updateUserDisplay();

        // Populate form with current settings
        populateForm();

        isInitialized = true;
        console.log('✅ [Settings] Initialization complete');
        pageContentReady();
    } catch (error) {
        console.error('Failed to load settings:', error);
        showToast('Fehler beim Laden der Einstellungen', 'error');
        pageContentReady();
    } finally {
        isInitializing = false;
    }
}

/**
 * Update user display (initials in avatar)
 */
function updateUserDisplay() {
    if (!userData) return;

    const initials = userData.initials || 'U';
    const avatarEl = document.getElementById('userInitials');
    if (avatarEl) {
        avatarEl.textContent = initials;
        console.log('✅ User initials set:', initials);
    }
}

/**
 * Show zenturie dropdown
 */
function showZenturieDropdown() {
    const dropdown = document.getElementById('zenturieDropdown');
    if (dropdown) {
        // Populate with all zenturien initially
        filterZenturien();
        dropdown.classList.remove('hidden');
    }
}

/**
 * Filter zenturien based on input
 */
function filterZenturien() {
    const input = document.getElementById('zenturieInput');
    const dropdown = document.getElementById('zenturieDropdown');

    if (!input || !dropdown) return;

    // Extract only the zenturie name (before " (Jahrgang")
    let searchTerm = input.value;
    const jahrgangIndex = searchTerm.indexOf(' (Jahrgang');
    if (jahrgangIndex !== -1) {
        searchTerm = searchTerm.substring(0, jahrgangIndex);
    }
    searchTerm = searchTerm.toLowerCase().trim();

    // Filter zenturien - only match against zenturie name, not display text
    const filtered = allZenturien.filter(zenturie => {
        return zenturie.zenturie.toLowerCase().includes(searchTerm);
    });

    // Populate dropdown
    dropdown.innerHTML = '';

    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Keine Zenturien gefunden</div>';
    } else {
        // Add "Keine Zenturie" option if search is empty
        if (searchTerm === '') {
            const noneItem = document.createElement('div');
            noneItem.className = 'px-4 py-3 hover:bg-primary/10 dark:hover:bg-primary/20 cursor-pointer transition-colors text-sm';
            noneItem.innerHTML = `
                <div class="font-medium text-gray-900 dark:text-white">Keine Zenturie</div>
            `;
            noneItem.onclick = () => selectZenturie(null);
            dropdown.appendChild(noneItem);
        }

        filtered.forEach(zenturie => {
            const item = document.createElement('div');
            item.className = 'px-4 py-3 hover:bg-primary/10 dark:hover:bg-primary/20 cursor-pointer transition-colors text-sm';

            const displayText = zenturie.year
                ? `${zenturie.zenturie} (Jahrgang ${zenturie.year})`
                : zenturie.zenturie;

            item.innerHTML = `
                <div class="font-medium text-gray-900 dark:text-white">${displayText}</div>
            `;

            item.onclick = () => selectZenturie(zenturie);
            dropdown.appendChild(item);
        });
    }

    dropdown.classList.remove('hidden');
}

/**
 * Select a zenturie and auto-fill the field
 */
function selectZenturie(zenturie) {
    const input = document.getElementById('zenturieInput');
    const hiddenInput = document.getElementById('selectedZenturieValue');
    const dropdown = document.getElementById('zenturieDropdown');

    if (input && hiddenInput) {
        if (zenturie === null) {
            // "Keine Zenturie" selected
            input.value = 'Keine Zenturie';
            hiddenInput.value = '';
        } else {
            const displayText = zenturie.year
                ? `${zenturie.zenturie} (Jahrgang ${zenturie.year})`
                : zenturie.zenturie;
            input.value = displayText;
            hiddenInput.value = zenturie.zenturie;
        }

        // Hide dropdown
        if (dropdown) dropdown.classList.add('hidden');
    }
}

// Hide zenturie dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('zenturieDropdown');
    const input = document.getElementById('zenturieInput');

    if (dropdown && input && !input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

/**
 * Populate form with current settings
 */
function populateForm() {
    console.log('📝 Populating form with settings:', currentSettings);
    console.log('📝 User data:', userData);

    // Set zenturie (from userData, not currentSettings!)
    const zenturieInput = document.getElementById('zenturieInput');
    const zenturieHidden = document.getElementById('selectedZenturieValue');
    if (zenturieInput && zenturieHidden) {
        // The zenturie is stored in userData, not in currentSettings
        const userZenturie = userData?.zenturie;

        if (userZenturie) {
            console.log('  Setting zenturie to:', userZenturie);

            // Find the zenturie object to get the year
            const zenturieObj = allZenturien.find(z => z.zenturie === userZenturie);
            if (zenturieObj) {
                const displayText = zenturieObj.year
                    ? `${zenturieObj.zenturie} (Jahrgang ${zenturieObj.year})`
                    : zenturieObj.zenturie;
                zenturieInput.value = displayText;
                zenturieHidden.value = zenturieObj.zenturie;
                console.log('✅ Zenturie value set successfully:', displayText);
            } else {
                console.warn('⚠️ Zenturie not found in list!');
                zenturieInput.value = userZenturie;
                zenturieHidden.value = userZenturie;
            }
        } else {
            console.log('  No zenturie set (user has no zenturie assigned)');
            zenturieInput.value = 'Keine Zenturie';
            zenturieHidden.value = '';
        }
    }

    // Set theme
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect && currentSettings.theme) {
        console.log('  Setting theme to:', currentSettings.theme);
        themeSelect.value = currentSettings.theme;
    }

    // Set notification preference
    const notificationSelect = document.getElementById('notificationSelect');
    if (notificationSelect && currentSettings.notification_preference) {
        console.log('  Setting notification preference to:', currentSettings.notification_preference);
        notificationSelect.value = currentSettings.notification_preference;
    }

    console.log('✅ Form populated');
}

/**
 * Save settings
 */
async function saveSettings() {
    const saveButton = document.getElementById('saveButton');
    if (!saveButton) return;

    try {
        // Disable button during save
        saveButton.disabled = true;
        saveButton.textContent = 'Speichern...';

        // Get form values
        const zenturieHidden = document.getElementById('selectedZenturieValue');
        const themeSelect = document.getElementById('themeSelect');
        const notificationSelect = document.getElementById('notificationSelect');

        const zenturieValue = zenturieHidden.value;
        const themeValue = themeSelect.value;
        const notificationValue = notificationSelect.value;

        // Check what changed
        const zenturieChanged = zenturieValue !== (userData?.zenturie || '');
        const themeChanged = themeValue !== currentSettings.theme;
        const notificationChanged = notificationValue !== currentSettings.notification_preference;

        // If nothing changed, just show info message
        if (!zenturieChanged && !themeChanged && !notificationChanged) {
            showToast('Keine Änderungen vorgenommen', 'info');
            saveButton.disabled = false;
            saveButton.textContent = 'Speichern';
            return;
        }

        // Save zenturie if changed (separate API call)
        if (zenturieChanged) {
            const newZenturie = zenturieValue || null;
            console.log('📝 Updating zenturie to:', newZenturie);
            await UserAPI.setZenturie(newZenturie);
            // Update userData cache
            if (userData) {
                userData.zenturie = newZenturie;
            }
        }

        // Save theme/notification if changed (separate API call)
        if (themeChanged || notificationChanged) {
            const settingsUpdates = {};
            if (themeChanged) {
                settingsUpdates.theme = themeValue;
            }
            if (notificationChanged) {
                settingsUpdates.notification_preference = notificationValue;
            }

            console.log('📝 Updating settings:', settingsUpdates);
            await UserAPI.updateSettings(settingsUpdates);

            // Update currentSettings cache
            if (themeChanged) {
                currentSettings.theme = themeValue;
            }
            if (notificationChanged) {
                currentSettings.notification_preference = notificationValue;
            }
        }

        // Apply theme change if needed
        if (themeChanged) {
            applyTheme(themeValue);
        }

        showToast('Einstellungen erfolgreich gespeichert', 'success');

    } catch (error) {
        console.error('Failed to save settings:', error);
        showToast(error.message || 'Fehler beim Speichern der Einstellungen', 'error');
    } finally {
        // Re-enable button
        saveButton.disabled = false;
        saveButton.textContent = 'Speichern';
    }
}

/**
 * Apply theme immediately
 */
function applyTheme(theme) {
    const html = document.documentElement;

    if (theme === 'dunkel') {
        html.classList.add('dark');
        html.classList.remove('light');
        localStorage.setItem('theme', 'dark');
    } else if (theme === 'hell') {
        html.classList.remove('dark');
        html.classList.add('light');
        localStorage.setItem('theme', 'light');
    } else {
        // Auto - use system preference
        localStorage.removeItem('theme');
        html.classList.remove('light');
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    if (!toast || !toastMessage || !toastIcon) return;

    // Set message
    toastMessage.textContent = message;

    // Set icon and color based on type
    let iconPath = '';
    let colorClass = '';

    if (type === 'success') {
        iconPath = 'M5 13l4 4L19 7';
        colorClass = 'text-green-600';
    } else if (type === 'error') {
        iconPath = 'M6 18L18 6M6 6l12 12';
        colorClass = 'text-red-600';
    } else {
        iconPath = 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
        colorClass = 'text-blue-600';
    }

    toastIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>`;
    toastIcon.className = `w-6 h-6 ${colorClass}`;

    // Show toast
    toast.classList.remove('hidden');

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Initialize on DOMContentLoaded for BROWSER compatibility
// In the app, Shell.triggerPageInit() will call initSettings() directly
// The isInitialized guard in initSettings() prevents double initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettings);
} else {
    // DOM already loaded (script loaded dynamically)
    initSettings();
}

// CRITICAL: Export initSettings to window so Shell.triggerPageInit() can call it
window.initSettings = initSettings;
