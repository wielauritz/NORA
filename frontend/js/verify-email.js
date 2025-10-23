/**
 * Email Verification Page JavaScript
 */

// Get UUID from URL parameters
const uuid = getUrlParameter('uuid');

// Verify email on page load
async function verifyEmail() {
    if (!uuid) {
        showErrorState('Kein Verifizierungscode gefunden', 'Der Verifizierungslink ist ungültig. Bitte verwende den Link aus deiner E-Mail.', 'Zurück zum Login', 'index.html');
        return;
    }

    try {
        // Call verification API
        await AuthAPI.verifyEmail(uuid);

        // Show success
        showSuccess(
            'E-Mail erfolgreich verifiziert!',
            'Deine E-Mail-Adresse wurde erfolgreich bestätigt.<br>Du kannst dich jetzt anmelden.',
            'Zum Login',
            'index.html'
        );
    } catch (error) {
        console.error('Verification Error:', error);
        showErrorState(
            'Verifizierung fehlgeschlagen',
            error.message || 'Die Verifizierung ist fehlgeschlagen. Bitte versuche es erneut.',
            'Zurück zum Login',
            'index.html'
        );
    }
}

// Start verification when page loads
window.addEventListener('DOMContentLoaded', verifyEmail);
