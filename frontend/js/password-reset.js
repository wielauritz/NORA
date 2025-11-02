/**
 * Password Reset Page JavaScript
 */

let resetEmail = ''; // Store email for code verification

// Reset Form Handler - Request reset code
document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    resetEmail = email;

    // Disable submit button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = disableSubmitButton(submitBtn, 'Wird gesendet...');

    try {
        // API Call - Backend sends 6-digit code via email
        await AuthAPI.resetPassword(email);

        // Show code verification form
        document.getElementById('resetForm').classList.add('hidden');
        showCodeVerificationForm(email);
    } catch (error) {
        console.error('Reset Error:', error);
        // Even on error, show code form (backend returns 204 for security)
        // But if there's a network error, show it
        if (error.message && error.message.includes('fetch')) {
            alert('Netzwerkfehler: Bitte überprüfe deine Internetverbindung.');
            enableSubmitButton(submitBtn, originalText);
        } else {
            // For any other error, still show code form
            document.getElementById('resetForm').classList.add('hidden');
            showCodeVerificationForm(email);
        }
    }
});

/**
 * Show code verification and password reset form
 */
function showCodeVerificationForm(email) {
    const container = document.querySelector('.bg-white');

    // Create the code verification UI
    const formHTML = `
        <div class="space-y-6 fade-in">
            <div class="text-center">
                <div class="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full mb-3">
                    <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-secondary mb-2">Code eingeben</h3>
                <p class="text-sm text-gray-600 mb-1">
                    Wir haben dir einen 6-stelligen Code an
                </p>
                <p class="text-sm font-medium text-secondary mb-4">${email}</p>
                <p class="text-xs text-gray-500">
                    Der Code ist 1 Stunde gültig. Prüfe auch deinen Spam-Ordner.
                </p>
            </div>

            <form id="codeVerifyForm" class="space-y-4">
                <!-- Code Input -->
                <div>
                    <label for="resetCode" class="block text-sm font-medium text-gray-700 mb-2">
                        Bestätigungscode
                    </label>
                    <input
                        type="text"
                        id="resetCode"
                        maxlength="6"
                        pattern="[0-9]{6}"
                        inputmode="numeric"
                        required
                        class="input-focus block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-all bg-white text-center text-2xl tracking-widest font-mono"
                        placeholder="000000"
                        autocomplete="off"
                    >
                    <p class="text-xs text-gray-500 mt-1 text-center">Gib den 6-stelligen Code aus der E-Mail ein</p>
                </div>

                <!-- New Password Input -->
                <div>
                    <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
                        Neues Passwort
                    </label>
                    <div class="relative">
                        <input
                            type="password"
                            id="newPassword"
                            required
                            minlength="8"
                            class="input-focus block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-all bg-white"
                            placeholder="Mindestens 8 Zeichen"
                            autocomplete="new-password"
                        >
                        <button
                            type="button"
                            id="togglePassword"
                            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                        </button>
                    </div>
                    <!-- Password Strength Indicator -->
                    <div class="mt-2">
                        <div class="h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div id="strengthBar" class="h-full transition-all duration-300 w-0"></div>
                        </div>
                        <p id="strengthText" class="text-xs mt-1 text-gray-500"></p>
                    </div>
                </div>

                <!-- Confirm Password Input -->
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
                        Passwort bestätigen
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        required
                        minlength="8"
                        class="input-focus block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-all bg-white"
                        placeholder="Passwort wiederholen"
                        autocomplete="new-password"
                    >
                    <p id="matchText" class="text-xs mt-1"></p>
                </div>

                <!-- Submit Button -->
                <button
                    type="submit"
                    id="verifyBtn"
                    class="btn-hover w-full bg-gradient-to-r from-primary to-secondary text-white py-3 px-4 rounded-lg font-medium"
                >
                    Passwort zurücksetzen
                </button>
            </form>

            <!-- Resend Code Button -->
            <div class="text-center">
                <button
                    id="resendCodeBtn"
                    class="text-sm text-primary hover:text-secondary transition-colors font-medium"
                >
                    Code erneut senden
                </button>
                <p id="resendTimer" class="text-xs text-gray-500 mt-1 hidden"></p>
            </div>

            <!-- Back to email input -->
            <div class="text-center">
                <button
                    id="backToEmailBtn"
                    class="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Andere E-Mail-Adresse verwenden
                </button>
            </div>
        </div>
    `;

    container.innerHTML = formHTML;

    // Setup event listeners
    setupCodeFormListeners();
}

/**
 * Setup event listeners for code verification form
 */
function setupCodeFormListeners() {
    // Code input - only allow numbers
    const codeInput = document.getElementById('resetCode');
    codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // Password strength indicator
    setupPasswordStrength('newPassword', 'strengthBar', 'strengthText');

    // Password match checker
    setupPasswordMatch('newPassword', 'confirmPassword', 'matchText');

    // Password toggle
    setupPasswordToggle('newPassword', 'togglePassword');

    // Code verification form submit
    document.getElementById('codeVerifyForm').addEventListener('submit', handleCodeVerification);

    // Resend code button
    document.getElementById('resendCodeBtn').addEventListener('click', () => {
        startResendCountdown(true);
    });

    // Back to email button
    document.getElementById('backToEmailBtn').addEventListener('click', () => {
        showEmailForm();
    });

    // Start initial countdown immediately (without sending email)
    startResendCountdown(false);
}

/**
 * Show email input form again
 */
function showEmailForm() {
    const container = document.querySelector('.bg-white');

    container.innerHTML = `
        <form id="resetForm" class="space-y-5">

            <!-- E-Mail Input -->
            <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                    E-Mail-Adresse
                </label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    autocomplete="email"
                    class="input-focus block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-all bg-white"
                    placeholder="vorname.nachname@nordakademie.de"
                    value="${resetEmail}"
                >
            </div>

            <!-- Submit Button -->
            <button
                type="submit"
                class="btn-hover w-full bg-gradient-to-r from-primary to-secondary text-white py-3 px-4 rounded-lg font-medium"
            >
                Reset-Link senden
            </button>

        </form>
    `;

    // Re-attach event listener
    document.getElementById('resetForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        resetEmail = email;

        // Disable submit button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = disableSubmitButton(submitBtn, 'Wird gesendet...');

        try {
            // API Call - Backend sends 6-digit code via email
            await AuthAPI.resetPassword(email);

            // Show code verification form
            document.getElementById('resetForm').classList.add('hidden');
            showCodeVerificationForm(email);
        } catch (error) {
            console.error('Reset Error:', error);
            // Even on error, show code form (backend returns 204 for security)
            // But if there's a network error, show it
            if (error.message && error.message.includes('fetch')) {
                alert('Netzwerkfehler: Bitte überprüfe deine Internetverbindung.');
                enableSubmitButton(submitBtn, originalText);
            } else {
                // For any other error, still show code form
                document.getElementById('resetForm').classList.add('hidden');
                showCodeVerificationForm(email);
            }
        }
    });
}

/**
 * Handle code verification and password reset
 */
async function handleCodeVerification(e) {
    e.preventDefault();

    const code = document.getElementById('resetCode').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate code length
    if (code.length !== 6) {
        showError('Der Code muss 6 Ziffern lang sein.', 'codeVerifyForm');
        return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        showError('Die Passwörter stimmen nicht überein.', 'codeVerifyForm');
        return;
    }

    // Validate password length
    if (newPassword.length < 8) {
        showError('Das Passwort muss mindestens 8 Zeichen lang sein.', 'codeVerifyForm');
        return;
    }

    // Disable submit button
    const submitBtn = document.getElementById('verifyBtn');
    const originalText = disableSubmitButton(submitBtn, 'Wird zurückgesetzt...');

    try {
        // Call API to verify code and reset password
        const data = await AuthAPI.resetPasswordWithCode(resetEmail, code, newPassword);

        // If successful, token is returned - auto-login user
        if (data.token) {
            await storeToken(data.token);

            // Store user info
            if (data.user) {
                storage.setItem('user', JSON.stringify(data.user));
            }

            // Show success and redirect
            showSuccess(
                'Passwort erfolgreich zurückgesetzt!',
                'Du wirst in wenigen Sekunden zum Dashboard weitergeleitet...',
                'Zum Dashboard',
                'dashboard.html'
            );

            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Code verification error:', error);
        showError(error.message || 'Code ist ungültig oder abgelaufen. Bitte fordere einen neuen Code an.', 'codeVerifyForm');
        enableSubmitButton(submitBtn, originalText);
    }
}

/**
 * Start resend countdown
 */
function startResendCountdown(sendEmail = false) {
    const resendBtn = document.getElementById('resendCodeBtn');
    const resendTimer = document.getElementById('resendTimer');

    // Disable button
    resendBtn.disabled = true;
    resendBtn.classList.add('opacity-50', 'cursor-not-allowed');

    // Start countdown (30 seconds)
    let countdown = 30;
    resendTimer.classList.remove('hidden');
    resendTimer.textContent = `Du kannst in ${countdown}s einen neuen Code anfordern`;

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            resendTimer.textContent = `Du kannst in ${countdown}s einen neuen Code anfordern`;
        } else {
            clearInterval(countdownInterval);
            resendTimer.classList.add('hidden');
            resendBtn.disabled = false;
            resendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }, 1000);

    // Only send email if explicitly requested
    if (sendEmail) {
        AuthAPI.resetPassword(resetEmail)
            .then(() => {
                // Show success message
                const container = document.querySelector('.bg-white');
                const tempMessage = document.createElement('div');
                tempMessage.className = 'text-center text-sm text-green-600 font-medium fade-in';
                tempMessage.textContent = 'Neuer Code wurde gesendet!';
                container.insertBefore(tempMessage, container.firstChild);

                setTimeout(() => tempMessage.remove(), 3000);
            })
            .catch((error) => {
                console.error('Resend code error:', error);
                // Enable button again on error
                clearInterval(countdownInterval);
                resendTimer.classList.add('hidden');
                resendBtn.disabled = false;
                resendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            });
    }
}
