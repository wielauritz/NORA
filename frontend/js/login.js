/**
 * Login Page JavaScript
 */

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
                // Use the helper function to store token
                await storeToken(token);
            } catch (e) {
                console.error('❌ Fehler beim Token speichern:', e.message || JSON.stringify(e));
            }

            // Extract user info from email
            const userName = email.split('@')[0];
            const userInfo = {
                email: email,
                name: userName,
            };
            try {
                localStorage.setItem('user', JSON.stringify(userInfo));
                console.log('✅ User info gespeichert');
            } catch (e) {
                console.error('❌ Fehler beim Speichern der User Info:', e);
            }

            // Zeige Success-Nachricht
            showLoginSuccess('Login erfolgreich', userName);

            // Weiterleitung zum Dashboard - nutze replace() für saubere Weiterleitung
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 1000);
        } else {
            // New user created, verification email sent
            showVerificationRequired(email);
        }
    } catch (error) {
        console.error('Login Error:', error);

        // Handle specific error cases
        const errorMessage = error.message || 'Ein Fehler ist aufgetreten';

        if (errorMessage.includes('verifiziert') || errorMessage.includes('verified')) {
            // Email not verified
            showVerificationRequired(email);
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
    document.addEventListener('deviceready', function() {
        console.log('✅ deviceready event fired - Capacitor plugins should now be available');
        initLoginForm();
    }, false);

    // Fallback timeout in case deviceready doesn't fire quickly
    setTimeout(() => {
        if (!document.body.dataset.formInitialized) {
            console.log('⏱️ deviceready timeout - initializing form anyway');
            initLoginForm();
            document.body.dataset.formInitialized = 'true';
        }
    }, 2000);
} else {
    // Web browser - initialize immediately
    initLoginForm();
}
