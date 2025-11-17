/**
 * Authentication Helper Functions
 * Gemeinsame Funktionen für Auth-Flows
 */

(function() {
// Local reference to storage (exported by storage-manager.js to window.storage)
const storage = window.storage;

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
function showSuccess(title, message, buttonText = 'Zum Login', buttonLink = 'login.html') {
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
            <h3 class="text-lg font-semibold text-secondary dark:text-primary">${title}</h3>
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
function showErrorState(title, message, buttonText = 'Zurück', buttonLink = 'login.html') {
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
            <h3 class="text-lg font-semibold text-secondary dark:text-primary">${title}</h3>
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
 * Format email-based name to proper capitalization
 * Examples:
 * - hanna-marie.obst -> Hanna-Marie Obst
 * - finn.kionka-lewin -> Finn Kionka-Lewin
 * - max.mustermann -> Max Mustermann
 */
function formatName(email) {
    // Extract name part before @
    const namePart = email.includes('@') ? email.split('@')[0] : email;

    // Split by dot (vorname.nachname)
    const parts = namePart.split('.');

    // Capitalize each part (handles hyphens too)
    const formatted = parts.map(part => {
        // Split by hyphen
        const subParts = part.split('-');
        // Capitalize each sub-part
        const capitalizedSubParts = subParts.map(sub => {
            if (sub.length === 0) return sub;
            return sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
        });
        // Join with hyphen
        return capitalizedSubParts.join('-');
    });

    // Join with space instead of dot
    return formatted.join(' ');
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
        <h3 class="text-lg font-semibold text-secondary dark:text-primary">${action}!</h3>
        <p class="text-sm text-gray-600">Willkommen, <strong>${userName}</strong>!</p>
        <p class="text-xs text-gray-500">Du wirst weitergeleitet...</p>
    `;

    container.innerHTML = '';
    container.appendChild(successDiv);
}

/**
 * Show verification required message (for index.html)
 */
function showVerificationRequired(email, authMode = "BOTH") {
    console.log('[AUTH] showVerificationRequired called with:', { email, authMode });

    const form = document.getElementById('loginForm');

    if (!form || !form.parentElement) {
        console.error('Login form not found');
        return;
    }

    // Store reference to container BEFORE clearing innerHTML
    const container = form.parentElement;

    const verifyDiv = document.createElement('div');
    verifyDiv.className = 'text-center space-y-4 fade-in';

    // Generate HTML based on AUTH_MODE
    let contentHTML = '';
    console.log('[AUTH] Generating UI for mode:', authMode);

    if (authMode === "LINK") {
        // LINK mode - no code input, just message to check email
        contentHTML = `
            <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-secondary dark:text-primary">E-Mail-Verifizierung erforderlich</h3>
            <p class="text-sm text-gray-600">
                Wir haben eine Verifizierungs-E-Mail an <strong>${email}</strong> gesendet.<br>
                <strong>Bitte klicke auf den Link in der E-Mail</strong>, um deine E-Mail-Adresse zu verifizieren.
            </p>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p>💡 <strong>Tipp:</strong> Überprüfe auch deinen Spam-Ordner, falls die E-Mail nicht im Posteingang erscheint.</p>
            </div>
            <p class="text-xs text-gray-500">
                Keine E-Mail erhalten?
            </p>
            <button id="resendBtn" class="btn-hover bg-white border border-gray-300 text-gray-700 py-2 px-6 rounded-lg font-medium hover:bg-gray-50">
                E-Mail erneut senden
            </button>
            <div class="pt-4">
                <a href="login.html" class="text-sm text-primary hover:text-secondary transition-colors">
                    Zurück zum Login
                </a>
            </div>
        `;
    } else if (authMode === "BOTH") {
        // BOTH mode - Link is primary, code input is collapsible fallback
        contentHTML = `
            <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-secondary dark:text-primary">E-Mail-Verifizierung erforderlich</h3>
            <p class="text-sm text-gray-600">
                Wir haben eine Verifizierungs-E-Mail an <strong>${email}</strong> gesendet.<br>
                <strong>Bitte klicke auf den Link in der E-Mail</strong>, um deine E-Mail-Adresse zu verifizieren.
            </p>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p>💡 <strong>Tipp:</strong> Überprüfe auch deinen Spam-Ordner, falls die E-Mail nicht im Posteingang erscheint.</p>
            </div>

            <!-- Collapsible Code Input -->
            <div class="mt-4">
                <button id="toggleCodeBtn" class="text-sm text-gray-600 hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto">
                    <span>Probleme mit dem Link? Code eingeben</span>
                    <svg id="toggleIcon" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>
                <div id="codeInputSection" class="hidden mt-4 space-y-3">
                    <p class="text-xs text-gray-600 text-center">Gib den 6-stelligen Code aus der E-Mail ein:</p>
                    <input
                        type="text"
                        id="verificationCode"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest font-mono"
                        placeholder="000000"
                        maxlength="6"
                        pattern="[0-9]{6}"
                        inputmode="numeric"
                        autocomplete="off"
                    />
                    <button id="verifyBtn" class="w-full btn-hover bg-gradient-to-r from-primary to-secondary text-white py-3 px-6 rounded-lg font-medium">
                        Code verifizieren
                    </button>
                </div>
            </div>

            <p class="text-xs text-gray-500 mt-4">
                Keine E-Mail erhalten?
            </p>
            <button id="resendBtn" class="btn-hover bg-white border border-gray-300 text-gray-700 py-2 px-6 rounded-lg font-medium hover:bg-gray-50">
                E-Mail erneut senden
            </button>
            <div class="pt-4">
                <a href="login.html" class="text-sm text-primary hover:text-secondary transition-colors">
                    Zurück zum Login
                </a>
            </div>
        `;
    } else {
        // OTP mode - show code input directly
        contentHTML = `
            <div class="inline-flex items-center justify-center w-16 h-16 bg-yellow-50 rounded-full">
                <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-secondary dark:text-primary">E-Mail-Verifizierung erforderlich</h3>
            <p class="text-sm text-gray-600">
                Wir haben einen 6-stelligen Verifizierungscode an <strong>${email}</strong> gesendet.<br>
                Bitte gib den Code ein, um deine E-Mail-Adresse zu bestätigen.
            </p>
            <div class="space-y-3">
                <input
                    type="text"
                    id="verificationCode"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    maxlength="6"
                    pattern="[0-9]{6}"
                    inputmode="numeric"
                    autocomplete="off"
                />
                <button id="verifyBtn" class="w-full btn-hover bg-gradient-to-r from-primary to-secondary text-white py-3 px-6 rounded-lg font-medium">
                    Code verifizieren
                </button>
            </div>
            <p class="text-xs text-gray-500">
                Keine E-Mail erhalten?
            </p>
            <button id="resendBtn" class="btn-hover bg-white border border-gray-300 text-gray-700 py-2 px-6 rounded-lg font-medium hover:bg-gray-50">
                E-Mail erneut senden
            </button>
            <div class="pt-4">
                <a href="login.html" class="text-sm text-primary hover:text-secondary transition-colors">
                    Zurück zum Login
                </a>
            </div>
        `;
    }

    verifyDiv.innerHTML = contentHTML;

    container.innerHTML = '';
    container.appendChild(verifyDiv);

    const codeInput = document.getElementById('verificationCode');
    const verifyBtn = document.getElementById('verifyBtn');
    const resendBtn = document.getElementById('resendBtn');

    // Setup toggle for BOTH mode
    if (authMode === "BOTH") {
        const toggleCodeBtn = document.getElementById('toggleCodeBtn');
        const codeInputSection = document.getElementById('codeInputSection');
        const toggleIcon = document.getElementById('toggleIcon');

        toggleCodeBtn.addEventListener('click', () => {
            const isHidden = codeInputSection.classList.contains('hidden');
            if (isHidden) {
                codeInputSection.classList.remove('hidden');
                toggleIcon.style.transform = 'rotate(180deg)';
            } else {
                codeInputSection.classList.add('hidden');
                toggleIcon.style.transform = 'rotate(0deg)';
            }
        });
    }

    // Only setup code input handlers if not in LINK mode
    if (authMode !== "LINK") {
        // Auto-format code input (only allow numbers)
        codeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });

        // Handle code verification
        verifyBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();

        if (code.length !== 6) {
            showError('Bitte gib einen 6-stelligen Code ein.');
            return;
        }

        // Disable button and show loading
        verifyBtn.disabled = true;
        const originalText = verifyBtn.textContent;
        verifyBtn.textContent = 'Wird verifiziert...';

        try {
            const data = await AuthAPI.verifyEmailWithCode(email, code);

            // Verification successful - store token and redirect
            if (data.token) {
                await storeToken(data.token);

                // Store user info
                const userName = data.user?.first_name || email.split('@')[0];
                const userInfo = {
                    email: email,
                    name: formatName(userName),
                };
                try {
                    localStorage.setItem('user', JSON.stringify(userInfo));
                } catch (e) {
                    console.error('Error storing user info:', e);
                }

                // Show success and redirect
                showLoginSuccess('E-Mail erfolgreich verifiziert! Du wirst weitergeleitet...', userInfo.name);
                setTimeout(() => {
                    window.location.replace('dashboard.html');
                }, 1500);
            }
        } catch (error) {
            showError(error.message || 'Ungültiger Verifizierungscode');
            verifyBtn.disabled = false;
            verifyBtn.textContent = originalText;
        }
        });
    } // End of authMode !== "LINK" check

    // Function to start countdown (available in all modes)
    const startResendCountdown = (sendEmail = false) => {
        resendBtn.disabled = true;
        const originalText = 'E-Mail erneut senden';
        let countdown = 30;

        // Update button text with countdown
        resendBtn.textContent = `Erneut senden (${countdown}s)`;

        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                resendBtn.textContent = `Erneut senden (${countdown}s)`;
            } else {
                clearInterval(countdownInterval);
                resendBtn.disabled = false;
                resendBtn.textContent = originalText;
            }
        }, 1000);

        // Only send email if explicitly requested
        if (sendEmail) {
            AuthAPI.resendVerificationEmail(email)
                .then(() => {
                    showError('Neuer Verifizierungscode wurde gesendet. Bitte überprüfe dein Postfach.');
                })
                .catch((error) => {
                    showError('Fehler beim Senden des Codes: ' + error.message);
                    // If error occurs, stop countdown and re-enable button
                    clearInterval(countdownInterval);
                    resendBtn.disabled = false;
                    resendBtn.textContent = originalText;
                });
        }
    };

    // Add event listener for resend button
    resendBtn.addEventListener('click', () => {
        startResendCountdown(true);
    });

    // Start initial countdown immediately (without sending email)
    startResendCountdown(false);
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
 * Store token using filesystem persistent storage
 * Fast, non-blocking, and reliable across app restarts
 */
function storeToken(token) {
    if (!token) {
        console.warn('⚠️ Attempted to store empty token');
        return false;
    }

    // Use the persistent storage module (defined in persistent-storage.js)
    // This handles both localStorage and filesystem storage
    storeTokenPersistent(token).catch(e => {
        console.error('❌ [storeToken] Error:', e);
    });

    return true;
}

/**
 * Check if user is authenticated
 * Uses persistent storage (filesystem first, then localStorage)
 * Validates token with server to ensure it's not expired
 */
async function checkAuth() {
    // Initialize persistent storage first
    try {
        await initPersistentStorage();
    } catch (e) {
        console.warn('⚠️ Failed to initialize persistent storage:', e);
    }

    // Try to load token from persistent storage (filesystem first, then localStorage)
    const token = await loadTokenPersistent();

    if (!token) {
        console.log('❌ Kein Token gefunden - Weiterleitung zum Login');
        window.location.href = 'login.html';
        return false;
    }

    // Validate token with server
    try {
        // Check if UserAPI is available (some pages may not have api-helper.js loaded yet)
        if (typeof UserAPI !== 'undefined' && UserAPI.getProfile) {
            console.log('🔍 Validating token with server...');

            // Make API call to validate token
            // If token is expired/invalid, this will throw an error (401 handler in api-helper.js)
            await UserAPI.getProfile();

            console.log('✅ Token validated - Benutzer ist authentifiziert');

            // Load and apply user theme settings
            loadAndApplyUserTheme().catch(e => {
                console.warn('⚠️ Failed to load theme settings:', e);
            });

            return true;
        } else {
            // UserAPI not available yet - trust the token for now
            // This can happen during page load before api-helper.js is loaded
            console.warn('⚠️ UserAPI not available yet, skipping server validation');
            console.log('✅ Token geladen - Benutzer ist (lokal) authentifiziert');

            return true;
        }
    } catch (error) {
        console.error('❌ Token validation failed:', error);

        // Token is invalid/expired - clear it from storage
        await clearTokenPersistent();

        console.log('❌ Token ungültig oder abgelaufen - Weiterleitung zum Login');
        window.location.href = 'login.html';
        return false;
    }
}

/**
 * Load user theme settings from API and apply them
 * This syncs the database theme setting to localStorage
 */
async function loadAndApplyUserTheme() {
    try {
        // Check if UserAPI is available
        if (typeof UserAPI === 'undefined' || !UserAPI.getSettings) {
            console.warn('⚠️ UserAPI not available yet, skipping theme load');
            return;
        }

        // Load settings from API
        const settings = await UserAPI.getSettings();

        if (settings && settings.theme) {
            const theme = settings.theme;

            // Sync to localStorage based on backend setting
            if (theme === 'dunkel') {
                localStorage.setItem('theme', 'dark');
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else if (theme === 'hell') {
                localStorage.setItem('theme', 'light');
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
            } else {
                // "auto" - remove localStorage setting to use system preference
                localStorage.removeItem('theme');
                document.documentElement.classList.remove('light');
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }

            console.log('✅ Theme settings loaded:', theme);
        }
    } catch (error) {
        console.warn('⚠️ Failed to load theme settings:', error);
        // Don't fail the page load if theme loading fails
    }
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
    // Clear token from persistent storage (filesystem and localStorage)
    await clearTokenPersistent();

    // 2. Clear user data from localStorage
    try {
        localStorage.removeItem('user');
        console.log('✅ User aus localStorage gelöscht');
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

// Export auth functions to window for global access
window.storeToken = storeToken;
window.checkAuth = checkAuth;
window.clearAuthStorage = clearAuthStorage;
window.getUrlParameter = getUrlParameter;
window.formatName = formatName;
window.disableSubmitButton = disableSubmitButton;
window.enableSubmitButton = enableSubmitButton;
window.showError = showError;
window.showLoginSuccess = showLoginSuccess;
window.showVerificationRequired = showVerificationRequired;
window.showConfirmDialog = showConfirmDialog;
window.closeConfirmDialog = closeConfirmDialog;
console.log('[Auth] Functions exported to window');
})();
