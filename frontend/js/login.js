/**
 * Login Page JavaScript
 */

/**
 * Check if user is already authenticated (for login page)
 * Returns true if user should stay on login page, false if redirect to dashboard
 */
async function checkAuthOnLoginPage() {
    try {
        // Initialize persistent storage
        await initPersistentStorage();
    } catch (e) {
        console.warn('⚠️ Failed to initialize persistent storage:', e);
    }

    // Try to load token from persistent storage
    const token = await loadTokenPersistent();

    if (token) {
        console.log('✅ Token found on login page - redirecting to dashboard');
        // Check if running in mobile app shell
        if (typeof window.Shell !== 'undefined' && typeof window.Shell.loadDashboard === 'function') {
            // Mobile app - use shell navigation
            console.log('[Login] Using Shell navigation to dashboard');
            window.Shell.loadDashboard();
        } else {
            // Web app - use traditional redirect
            window.location.href = 'dashboard.html';
        }
        return false; // Redirect happened
    }

    console.log('ℹ️ No token found - user can login');
    return true; // Show login form
}

// Wait for deviceready event, then setup the form
function initLoginForm() {
    // Prevent double initialization
    if (document.body.dataset.formInitialized === 'true') {
        console.log('ℹ️ Form already initialized, skipping');
        return;
    }
    document.body.dataset.formInitialized = 'true';

    console.log('🚀 initLoginForm called');

    // Login/Register Form Handler
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Disable submit button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = disableSubmitButton(submitBtn, 'Wird verarbeitet...');

        try {
            // Call Backend Login API
            const data = await AuthAPI.login(email, password);

        // Check if token is present (successful login)
        if (data.token) {
            // Token speichern - sowohl localStorage als auch Capacitor Preferences für iOS Persistierung
            const token = data.token;

            try {
                // Store token using persistent storage (localStorage + Capacitor Filesystem)
                await storeToken(token);
                console.log('✅ Token stored successfully');

                // Notify shell about successful login (shell will store in AppStorage)
                if (typeof window.Shell !== 'undefined') {
                    console.log('[Login] Dispatching loginSuccess event to shell');
                    window.dispatchEvent(new CustomEvent('nora:loginSuccess', {
                        detail: { token }
                    }));
                }
            } catch (e) {
                console.error('❌ Fehler beim Token speichern:', e.message || JSON.stringify(e));
            }

            // Extract user info from email
            const userName = email.split('@')[0];
            const formattedName = formatName(userName);
            const userInfo = {
                email: email,
                name: formattedName,
            };
            try {
                localStorage.setItem('user', JSON.stringify(userInfo));
                console.log('✅ User info gespeichert');
            } catch (e) {
                console.error('❌ Fehler beim Speichern der User Info:', e);
            }

            // Zeige Success-Nachricht
            showLoginSuccess('Login erfolgreich', formattedName);

            // Weiterleitung zum Dashboard - nutze replace() für saubere Weiterleitung
            setTimeout(() => {
                // Check if running in mobile app shell
                if (typeof window.Shell !== 'undefined' && typeof window.Shell.loadDashboard === 'function') {
                    // Mobile app - use shell navigation
                    console.log('[Login] Using Shell navigation to dashboard');
                    window.Shell.loadDashboard();
                } else {
                    // Web app - use traditional redirect
                    window.location.replace('dashboard.html');
                }
            }, 1000);
        } else {
            // New user created, verification email sent
            // Pass auth_mode from backend response (defaults to "BOTH" if not provided)
            const authMode = data.auth_mode || "BOTH";
            console.log('[LOGIN] New user - auth_mode from response:', data.auth_mode, 'Using:', authMode);
            showVerificationRequired(email, authMode);
        }
    } catch (error) {
        console.error('Login Error:', error);

        // Handle specific error cases
        const errorMessage = error.message || 'Ein Fehler ist aufgetreten';

        if (errorMessage.includes('verifiziert') || errorMessage.includes('verified')) {
            // Email not verified
            // Try to get auth_mode from error data, fall back to "BOTH"
            const authMode = error.data?.auth_mode || "BOTH";
            console.log('[LOGIN] Unverified user - error.data:', error.data, 'auth_mode:', authMode);
            showVerificationRequired(email, authMode);
        } else if (errorMessage.includes('Ungültige Zugangsdaten') || errorMessage.includes('401')) {
            showError('Ungültige E-Mail oder Passwort. Bitte überprüfe deine Eingaben.', 'loginForm');
        } else if (errorMessage.includes('E-Mail-Format') || errorMessage.includes('400')) {
            showError('Ungültiges E-Mail-Format. Bitte verwende eine gültige E-Mail-Adresse.', 'loginForm');
        } else {
            showError(`Login fehlgeschlagen: ${errorMessage}`, 'loginForm');
        }

        enableSubmitButton(submitBtn, originalText);
    }
    });
}

// Initialize login form after deviceready (ensures Capacitor plugins are available)
if (typeof Capacitor !== 'undefined') {
    // Capacitor app - wait for deviceready event
    document.addEventListener('deviceready', async function() {
        console.log('✅ deviceready event fired - Capacitor plugins should now be available');

        // Check if user is already authenticated (will redirect to dashboard if token found)
        await checkAuthOnLoginPage();

        // If we reach here, no token was found - show login form
        initLoginForm();
    }, false);

    // Fallback timeout in case deviceready doesn't fire quickly
    setTimeout(async () => {
        if (!document.body.dataset.formInitialized) {
            console.log('⏱️ deviceready timeout - checking auth and initializing form if needed');
            await checkAuthOnLoginPage();
            // If we reach here, no token was found - show login form
            initLoginForm();
        }
    }, 2000);
} else {
    // Web browser - initialize immediately
    checkAuthOnLoginPage().then(() => {
        // If we reach here, no token was found - show login form
        initLoginForm();
    });
}
