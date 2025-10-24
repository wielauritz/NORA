/**
 * Authentication Helper Functions
 * Gemeinsame Funktionen für Auth-Flows
 */

/**
 * Get URL parameter by name
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * Show error message in form
 */
function showError(message, formId = null) {
    let errorDiv = document.getElementById('error-message');

    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm fade-in';

        if (formId) {
            const form = document.getElementById(formId);
            if (form) {
                form.prepend(errorDiv);
            } else {
                document.body.appendChild(errorDiv);
            }
        } else {
            // Find first form or container - try multiple selectors
            const container = document.querySelector('form') || document.querySelector('.bg-white') || document.querySelector('.glass-effect');
            if (container) {
                container.prepend(errorDiv);
            } else {
                document.body.appendChild(errorDiv);
            }
        }
    }

    errorDiv.innerHTML = `
        <div class="flex items-start space-x-3">
            <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="flex-1">
                ${message.replace(/\n/g, '<br>')}
            </div>
        </div>
    `;

    // Auto-remove nach 8 Sekunden
    setTimeout(() => {
        errorDiv.remove();
    }, 8000);
}

/**
 * Show success message (replaces form)
 */
function showSuccess(title, message, buttonText = 'Zum Login', buttonLink = 'index.html') {
    // Try multiple selectors for compatibility
    const container = document.querySelector('.bg-white') || document.querySelector('.glass-effect');

    if (!container) {
        console.error('Container not found');
        return;
    }

    container.innerHTML = `
        <div class="text-center space-y-4 fade-in">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full">
                <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-secondary">${title}</h3>
            <p class="text-sm text-gray-600">${message}</p>
            <div class="pt-4">
                <a href="${buttonLink}" class="btn-hover inline-block bg-gradient-to-r from-primary to-secondary text-white py-3 px-6 rounded-lg font-medium">
                    ${buttonText}
                </a>
            </div>
        </div>
    `;
}

/**
 * Show loading state
 */
function showLoading(message = 'Wird verarbeitet...') {
    // Try multiple selectors for compatibility
    const container = document.querySelector('.bg-white') || document.querySelector('.glass-effect');

    if (!container) {
        console.error('Container not found');
        return;
    }

    container.innerHTML = `
        <div class="text-center space-y-4">
            <div class="spinner mx-auto"></div>
            <p class="text-sm text-gray-600">${message}</p>
        </div>
    `;
}

/**
 * Show error state (replaces content)
 */
function showErrorState(title, message, buttonText = 'Zurück', buttonLink = 'index.html') {
    // Try multiple selectors for compatibility
    const container = document.querySelector('.bg-white') || document.querySelector('.glass-effect');

    if (!container) {
        console.error('Container not found');
        return;
    }

    container.innerHTML = `
        <div class="text-center space-y-4 fade-in">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full">
                <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-secondary">${title}</h3>
            <p class="text-sm text-gray-600">${message}</p>
            <div class="pt-4">
                <a href="${buttonLink}" class="btn-hover inline-block bg-gradient-to-r from-primary to-secondary text-white py-3 px-6 rounded-lg font-medium">
                    ${buttonText}
                </a>
            </div>
        </div>
    `;
}

/**
 * Show login success message (for index.html)
 */
function showLoginSuccess(action, userName) {
    const form = document.getElementById('loginForm');

    if (!form || !form.parentElement) {
        console.error('Login form not found');
        return;
    }

    // Store reference to container BEFORE clearing innerHTML
    const container = form.parentElement;

    const successDiv = document.createElement('div');
    successDiv.className = 'text-center space-y-4 fade-in';
    successDiv.innerHTML = `
        <div class="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full">
            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
        </div>
        <h3 class="text-lg font-semibold text-secondary">${action}!</h3>
        <p class="text-sm text-gray-600">Willkommen, <strong>${userName}</strong>!</p>
        <p class="text-xs text-gray-500">Du wirst weitergeleitet...</p>
    `;

    container.innerHTML = '';
    container.appendChild(successDiv);
}

/**
 * Show verification required message (for index.html)
 */
function showVerificationRequired(email) {
    const form = document.getElementById('loginForm');

    if (!form || !form.parentElement) {
        console.error('Login form not found');
        return;
    }

    // Store reference to container BEFORE clearing innerHTML
    const container = form.parentElement;

    const verifyDiv = document.createElement('div');
    verifyDiv.className = 'text-center space-y-4 fade-in';
    verifyDiv.innerHTML = `
        <div class="inline-flex items-center justify-center w-16 h-16 bg-yellow-50 rounded-full">
            <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
        </div>
        <h3 class="text-lg font-semibold text-secondary">E-Mail-Verifizierung erforderlich</h3>
        <p class="text-sm text-gray-600">
            Deine E-Mail-Adresse muss verifiziert werden.<br>
            Bitte überprüfe dein Postfach (<strong>${email}</strong>) und klicke auf den Verifizierungslink.
        </p>
        <p class="text-xs text-gray-500">
            Keine E-Mail erhalten?
        </p>
        <button id="resendBtn" class="btn-hover bg-gradient-to-r from-primary to-secondary text-white py-2 px-6 rounded-lg font-medium">
            Verifizierungs-E-Mail erneut senden
        </button>
        <div class="pt-4">
            <a href="index.html" class="text-sm text-primary hover:text-secondary transition-colors">
                Zurück zum Login
            </a>
        </div>
    `;

    container.innerHTML = '';
    container.appendChild(verifyDiv);

    // Add event listener for resend button
    document.getElementById('resendBtn').addEventListener('click', async () => {
        try {
            await AuthAPI.resendVerificationEmail(email);
            showError('Verifizierungs-E-Mail wurde erneut gesendet. Bitte überprüfe dein Postfach.');
        } catch (error) {
            showError('Fehler beim Senden der E-Mail: ' + error.message);
        }
    });
}

/**
 * Disable submit button with loading state
 */
function disableSubmitButton(button, loadingText = 'Wird verarbeitet...') {
    if (!button) return null;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;

    return originalText;
}

/**
 * Enable submit button
 */
function enableSubmitButton(button, originalText) {
    if (!button) return;

    button.disabled = false;
    button.textContent = originalText;
}

/**
 * Password strength checker
 */
function checkPasswordStrength(password) {
    let strength = 0;
    let text = '';
    let color = '';

    if (password.length >= 6) {
        strength = 1;
        text = 'Schwach';
        color = 'bg-red-500';
    }
    if (password.length >= 8) {
        strength = 2;
        text = 'Mittel';
        color = 'bg-yellow-500';
    }
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
        strength = 3;
        text = 'Stark';
        color = 'bg-green-500';
    }

    return { strength, text, color };
}

/**
 * Setup password strength indicator
 */
function setupPasswordStrength(passwordInputId, strengthBarId, strengthTextId) {
    const passwordInput = document.getElementById(passwordInputId);
    const strengthBar = document.getElementById(strengthBarId);
    const strengthText = document.getElementById(strengthTextId);

    if (!passwordInput || !strengthBar || !strengthText) {
        console.error('Password strength elements not found');
        return;
    }

    passwordInput.addEventListener('input', (e) => {
        const password = e.target.value;
        const { strength, text, color } = checkPasswordStrength(password);

        strengthBar.className = `password-strength ${color}`;
        strengthBar.style.width = `${strength * 33.33}%`;
        strengthText.textContent = text || 'Mindestens 6 Zeichen erforderlich';
    });
}

/**
 * Setup password match checker
 */
function setupPasswordMatch(passwordInputId, confirmInputId, matchTextId) {
    const passwordInput = document.getElementById(passwordInputId);
    const confirmInput = document.getElementById(confirmInputId);
    const matchText = document.getElementById(matchTextId);

    if (!passwordInput || !confirmInput || !matchText) {
        console.error('Password match elements not found');
        return;
    }

    confirmInput.addEventListener('input', (e) => {
        const password = passwordInput.value;
        const confirm = e.target.value;

        if (confirm.length === 0) {
            matchText.textContent = '';
            return;
        }

        if (password === confirm) {
            matchText.textContent = '✓ Passwörter stimmen überein';
            matchText.className = 'text-xs text-green-600 mt-2';
        } else {
            matchText.textContent = '✗ Passwörter stimmen nicht überein';
            matchText.className = 'text-xs text-red-600 mt-2';
        }
    });
}

/**
 * Toggle password visibility
 */
function setupPasswordToggle(inputId, toggleButtonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(toggleButtonId);

    if (!input || !button) {
        console.error('Password toggle elements not found');
        return;
    }

    button.addEventListener('click', () => {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
    });
}

/**
 * Try to store token in Capacitor Preferences with aggressive retry logic
 * Retries for up to 60 seconds to account for iOS plugin initialization timing
 */
async function storeTokenInPreferences(token, maxRetries = 120) {
    console.log('🔄 [storeTokenInPreferences] Starting background Preferences storage task (will retry for ~60 seconds)');

    if (!token) {
        console.warn('🔄 [storeTokenInPreferences] Token is empty');
        return false;
    }

    if (typeof Capacitor === 'undefined') {
        console.warn('🔄 [storeTokenInPreferences] Capacitor not available');
        return false;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Log every 10th attempt to reduce log spam
            if (attempt === 1 || attempt % 10 === 0 || (Capacitor.plugins && Capacitor.plugins.Preferences)) {
                console.log(`🔄 [storeTokenInPreferences] Attempt ${attempt}/${maxRetries}`);
            }

            if (Capacitor.plugins && Capacitor.plugins.Preferences) {
                console.log(`✅ [storeTokenInPreferences] Plugins FINALLY available on attempt ${attempt}! Calling Preferences.set()`);
                await Capacitor.plugins.Preferences.set({
                    key: 'token',
                    value: token
                });
                console.log('✅ Token in Capacitor Preferences gespeichert (after ' + attempt + ' attempts)');
                return true;
            }
        } catch (e) {
            console.error(`🔄 [storeTokenInPreferences] Attempt ${attempt}/${maxRetries} - Preferences.set() error:`, e.message || JSON.stringify(e));
        }

        // Wait before retrying (500ms = 60 seconds total for 120 retries)
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log('⏱️ [storeTokenInPreferences] GAVE UP after ' + maxRetries + ' attempts (~60 seconds). Preferences plugin never became available.');
    return false;
}

/**
 * Store token in localStorage and attempt Preferences in background
 * Does not block - localStorage is stored immediately, Preferences attempted asynchronously
 */
async function storeToken(token) {
    if (!token) {
        console.warn('⚠️ Attempted to store empty token');
        return false;
    }

    let storedInLocalStorage = false;

    // Always store in localStorage first (non-blocking)
    try {
        localStorage.setItem('token', token);
        console.log('✅ Token in localStorage gespeichert');
        storedInLocalStorage = true;
    } catch (e) {
        console.warn('⚠️ localStorage nicht verfügbar:', e.message);
    }

    // Try Capacitor Preferences in the background (non-blocking)
    // Don't await this - let it happen asynchronously
    if (typeof Capacitor !== 'undefined') {
        console.log('🔄 Triggering background Preferences storage task...');
        storeTokenInPreferences(token).then(success => {
            if (success) {
                console.log('✅ Background task: Token successfully stored to Preferences');
            } else {
                console.warn('⚠️ Background task: Failed to store token to Preferences after retries');
            }
        }).catch(e => {
            console.error('❌ Background task error:', e);
        });
    } else {
        console.warn('⚠️ Capacitor not available for background storage');
    }

    return storedInLocalStorage;
}

/**
 * Check if user is authenticated
 * Reads from Capacitor Preferences (iOS persistent) first, then localStorage
 */
async function checkAuth() {
    let token = null;

    // 1. Try Capacitor Preferences first (iOS persistent across restarts)
    try {
        if (typeof Capacitor !== 'undefined' && Capacitor.plugins && Capacitor.plugins.Preferences) {
            console.log('📦 Attempting to read token from Capacitor Preferences');
            const result = await Capacitor.plugins.Preferences.get({ key: 'token' });
            console.log('📦 Capacitor Preferences.get() result:', result);
            if (result && result.value) {
                console.log('✅ Token aus Capacitor Preferences geladen');
                // Also update localStorage for immediate access
                try {
                    localStorage.setItem('token', result.value);
                } catch (e) {
                    console.warn('localStorage nicht verfügbar:', e);
                }
                return true;
            } else {
                console.log('ℹ️ Kein Token in Capacitor Preferences gefunden');
            }
        } else {
            console.log('ℹ️ Capacitor Preferences nicht verfügbar');
        }
    } catch (e) {
        console.error('❌ Capacitor Preferences Fehler:', e.message || JSON.stringify(e));
    }

    // 2. Try localStorage as fallback
    try {
        token = localStorage.getItem('token');
        if (token) {
            console.log('✅ Token aus localStorage geladen');
            return true;
        }
    } catch (e) {
        console.warn('localStorage nicht verfügbar:', e);
    }

    // 3. Fallback auf StorageManager
    if (!token && typeof storage !== 'undefined') {
        token = storage.getItem('token');
        if (token) {
            console.log('✅ Token aus StorageManager geladen');
            return true;
        }
    }

    console.log('❌ Kein Token gefunden - Weiterleitung zum Login');
    window.location.href = 'index.html';
    return false;
}

/**
 * Show custom confirm dialog with Ja/Nein buttons
 */
function showConfirmDialog(message, onConfirm, onCancel = null) {
    const dialogHTML = `
        <div id="confirmDialog" class="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl" onclick="event.stopPropagation()">
                <p class="text-gray-900 text-center">${message}</p>
                <div class="flex gap-3">
                    <button onclick="closeConfirmDialog(false)" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                        Nein
                    </button>
                    <button onclick="closeConfirmDialog(true)" class="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:shadow-lg transition-all">
                        Ja
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', dialogHTML);

    window.confirmDialogCallback = onConfirm;
    window.confirmDialogCancelCallback = onCancel;
}

/**
 * Close confirm dialog
 */
function closeConfirmDialog(confirmed) {
    const dialog = document.getElementById('confirmDialog');
    if (dialog) {
        dialog.remove();
    }

    if (confirmed && window.confirmDialogCallback) {
        window.confirmDialogCallback();
    } else if (!confirmed && window.confirmDialogCancelCallback) {
        window.confirmDialogCancelCallback();
    }
}

/**
 * Clear all auth data from storage (Preferences + localStorage)
 */
async function clearAuthStorage() {
    // 1. Clear Capacitor Preferences
    try {
        if (typeof Capacitor !== 'undefined' && Capacitor.plugins && Capacitor.plugins.Preferences) {
            await Capacitor.plugins.Preferences.remove({ key: 'token' });
            await Capacitor.plugins.Preferences.remove({ key: 'user' });
            console.log('✅ Token und User aus Capacitor Preferences gelöscht');
        }
    } catch (e) {
        console.warn('⚠️ Fehler beim Löschen von Capacitor Preferences:', e.message || JSON.stringify(e));
    }

    // 2. Clear localStorage
    try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.log('✅ Token und User aus localStorage gelöscht');
    } catch (e) {
        console.warn('localStorage nicht verfügbar:', e);
    }

    // 3. Clear StorageManager
    if (typeof storage !== 'undefined') {
        try {
            storage.removeItem('token');
            storage.removeItem('user');
            console.log('✅ Token und User aus StorageManager gelöscht');
        } catch (e) {
            console.warn('StorageManager Fehler:', e);
        }
    }
}
