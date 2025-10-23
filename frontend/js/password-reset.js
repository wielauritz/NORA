/**
 * Password Reset Page JavaScript
 */

// Reset Form Handler
document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;

    // Disable submit button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = disableSubmitButton(submitBtn, 'Wird gesendet...');

    try {
        // API Call - Backend returns 204 No Content regardless of whether account exists
        await AuthAPI.resetPassword(email);

        // Always show success message (security measure to not reveal if account exists)
        document.getElementById('resetForm').classList.add('hidden');
        document.getElementById('successMessage').classList.remove('hidden');
        document.getElementById('sentEmail').textContent = email;
    } catch (error) {
        console.error('Reset Error:', error);
        // Even on error, show success (backend returns 204 for security)
        // But if there's a network error, show it
        if (error.message && error.message.includes('fetch')) {
            alert('Netzwerkfehler: Bitte überprüfe deine Internetverbindung.');
            enableSubmitButton(submitBtn, originalText);
        } else {
            // For any other error, still show success screen
            document.getElementById('resetForm').classList.add('hidden');
            document.getElementById('successMessage').classList.remove('hidden');
            document.getElementById('sentEmail').textContent = email;
        }
    }
});
