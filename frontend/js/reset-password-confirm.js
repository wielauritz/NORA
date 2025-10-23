/**
 * Reset Password Confirmation Page JavaScript
 */

// Get UUID from URL parameters
const uuid = getUrlParameter('uuid');

// Check if UUID exists on page load
if (!uuid) {
    showErrorState(
        'Ungültiger Link',
        'Kein Reset-Code gefunden. Bitte verwende den Link aus deiner E-Mail.',
        'Neuen Link anfordern',
        'password-reset.html'
    );
}

// Setup password strength indicator
setupPasswordStrength('newPassword', 'strengthBar', 'strengthText');

// Setup password match checker
setupPasswordMatch('newPassword', 'confirmPassword', 'matchText');

// Setup password toggle
setupPasswordToggle('newPassword', 'togglePassword');

// Form submit handler
document.getElementById('resetConfirmForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        showError('Die Passwörter stimmen nicht überein.', 'resetConfirmForm');
        return;
    }

    // Validate password length
    if (newPassword.length < 6) {
        showError('Das Passwort muss mindestens 6 Zeichen lang sein.', 'resetConfirmForm');
        return;
    }

    // Disable submit button
    const submitBtn = document.getElementById('submitBtn');
    const originalText = disableSubmitButton(submitBtn, 'Wird gespeichert...');

    try {
        // Call password reset confirmation API
        await AuthAPI.resetPasswordConfirm(uuid, newPassword);

        // Show success
        document.getElementById('resetConfirmForm').classList.add('hidden');
        document.getElementById('successMessage').classList.remove('hidden');
    } catch (error) {
        console.error('Reset Confirmation Error:', error);

        // Hide form and show error state
        document.getElementById('resetConfirmForm').classList.add('hidden');
        showErrorState(
            'Passwort-Reset fehlgeschlagen',
            error.message || 'Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.',
            'Neuen Link anfordern',
            'password-reset.html'
        );
    }
});
