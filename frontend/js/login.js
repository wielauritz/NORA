/**
 * Login Page JavaScript
 */

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
            // Token speichern
            storage.setItem('token', data.token);

            // Extract user info from email
            const userName = email.split('@')[0];
            const userInfo = {
                email: email,
                name: userName,
            };
            storage.setItem('user', JSON.stringify(userInfo));

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
