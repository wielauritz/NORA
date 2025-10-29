/**
 * NORA - Settings Page Script
 * Handles user settings management
 */

// Current settings cache
let currentSettings = null;
let allZenturien = [];
let userData = null;

/**
 * Initialize settings page
 */
async function initSettings() {
    try {
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
        populateZenturienDropdown();
        populateForm();

        pageContentReady();
    } catch (error) {
        console.error('Failed to load settings:', error);
        showToast('Fehler beim Laden der Einstellungen', 'error');
        pageContentReady();
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
 * Populate zenturien dropdown
 */
function populateZenturienDropdown() {
    const select = document.getElementById('zenturieSelect');
    if (!select) {
        console.error('❌ Zenturie select element not found');
        return;
    }

    // Clear existing options
    select.innerHTML = '';

    // Add "keine Zenturie" option
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'Keine Zenturie';
    select.appendChild(noneOption);

    // Debug: Check if allZenturien is an array and has items
    console.log('📋 All Zenturien:', allZenturien);
    console.log('📋 Zenturien type:', typeof allZenturien);
    console.log('📋 Is array:', Array.isArray(allZenturien));
    console.log('📋 Length:', allZenturien?.length);

    // Check if allZenturien is valid
    if (!allZenturien || !Array.isArray(allZenturien)) {
        console.error('❌ allZenturien is not an array:', allZenturien);
        return;
    }

    if (allZenturien.length === 0) {
        console.warn('⚠️ No zenturien available');
        const noOption = document.createElement('option');
        noOption.value = '';
        noOption.textContent = 'Keine Zenturien verfügbar';
        select.appendChild(noOption);
        return;
    }

    // Add all zenturien
    allZenturien.forEach((zenturie, index) => {
        console.log(`  ${index + 1}. ${zenturie.zenturie_name} (ID: ${zenturie.id})`);
        const option = document.createElement('option');
        option.value = zenturie.id;
        option.textContent = zenturie.zenturie_name;
        select.appendChild(option);
    });

    console.log(`✅ ${allZenturien.length} Zenturien added to dropdown`);
}

/**
 * Populate form with current settings
 */
function populateForm() {
    // Set zenturie
    const zenturieSelect = document.getElementById('zenturieSelect');
    if (zenturieSelect && currentSettings.zenturie_id) {
        zenturieSelect.value = currentSettings.zenturie_id;
    }

    // Set theme
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect && currentSettings.theme) {
        themeSelect.value = currentSettings.theme;
    }

    // Set notification preference
    const notificationSelect = document.getElementById('notificationSelect');
    if (notificationSelect && currentSettings.notification_preference) {
        notificationSelect.value = currentSettings.notification_preference;
    }
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
        const zenturieSelect = document.getElementById('zenturieSelect');
        const themeSelect = document.getElementById('themeSelect');
        const notificationSelect = document.getElementById('notificationSelect');

        const zenturieValue = zenturieSelect.value;
        const themeValue = themeSelect.value;
        const notificationValue = notificationSelect.value;

        // Build update object - only include changed values
        const updates = {};

        // Check zenturie change
        const newZenturieId = zenturieValue ? parseInt(zenturieValue) : null;
        if (newZenturieId !== currentSettings.zenturie_id) {
            updates.zenturie_id = newZenturieId;
        }

        // Check theme change
        if (themeValue !== currentSettings.theme) {
            updates.theme = themeValue;
        }

        // Check notification preference change
        if (notificationValue !== currentSettings.notification_preference) {
            updates.notification_preference = notificationValue;
        }

        // If nothing changed, just show success message
        if (Object.keys(updates).length === 0) {
            showToast('Keine Änderungen vorgenommen', 'info');
            saveButton.disabled = false;
            saveButton.textContent = 'Speichern';
            return;
        }

        // Send update to API
        await UserAPI.updateSettings(updates);

        // Update current settings cache
        if (updates.zenturie_id !== undefined) {
            currentSettings.zenturie_id = updates.zenturie_id;
        }
        if (updates.theme !== undefined) {
            currentSettings.theme = updates.theme;
        }
        if (updates.notification_preference !== undefined) {
            currentSettings.notification_preference = updates.notification_preference;
        }

        // Apply theme change if needed
        if (updates.theme !== undefined) {
            applyTheme(updates.theme);
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', initSettings);
