/**
 * Friends JavaScript
 * Freunde-Verwaltung und Modal
 */

/**
 * Show Add Friend Modal
 */
function showAddFriendModal() {
    const modal = document.getElementById('addFriendModal');
    if (!modal) {
        createAddFriendModal();
        // Immediately reset after creation
        setTimeout(() => {
            document.getElementById('friendForm').reset();
            document.getElementById('friendError').classList.add('hidden');
        }, 0);
        return showAddFriendModal();
    }

    // Reset form
    document.getElementById('friendForm').reset();
    document.getElementById('friendError').classList.add('hidden');

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Create Add Friend Modal
 */
function createAddFriendModal() {
    const modalHTML = `
        <div id="addFriendModal" class="modal-overlay">
            <div class="modal-content glass-effect rounded-3xl w-full max-w-md p-8 relative" onclick="event.stopPropagation()">

                <!-- Close Button -->
                <button onclick="closeAddFriendModal()" class="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <!-- Modal Header -->
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">Freundschaftsanfrage senden</h2>
                    <p class="text-gray-600">Sende eine Freundschaftsanfrage an einen Kommilitonen</p>
                </div>

                <!-- Error Message -->
                <div id="friendError" class="hidden mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                    <div class="flex items-start space-x-3">
                        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div id="friendErrorText" class="flex-1"></div>
                    </div>
                </div>

                <!-- Form -->
                <form id="friendForm" onsubmit="submitAddFriend(event)" class="space-y-4">

                    <!-- Email -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            E-Mail-Adresse *
                        </label>
                        <input type="email" id="friendEmail" required
                               class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                               placeholder="vorname.nachname@nordakademie.de">
                        <p class="text-xs text-gray-500 mt-1">Die @nordakademie.de E-Mail-Adresse deines Kommilitonen</p>
                    </div>

                    <!-- Info Box -->
                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div class="flex items-start space-x-3">
                            <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div class="text-sm text-blue-800">
                                <p class="font-medium mb-1">Freunde-Funktion</p>
                                <p>Dein Kommilitone muss die Anfrage annehmen, bevor du seinen Stundenplan sehen kannst. Du kannst dann seinen offiziellen Stundenplan (nur offizielle Kurse) einsehen.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex space-x-3 pt-4">
                        <button type="submit" id="submitFriendBtn"
                                class="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-shadow">
                            Anfrage senden
                        </button>
                        <button type="button" onclick="closeAddFriendModal()"
                                class="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors">
                            Abbrechen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Submit add friend form
 */
async function submitAddFriend(event) {
    event.preventDefault();

    const errorDiv = document.getElementById('friendError');
    const errorText = document.getElementById('friendErrorText');
    const submitBtn = document.getElementById('submitFriendBtn');

    // Hide previous errors
    errorDiv.classList.add('hidden');

    // Get form values
    const email = document.getElementById('friendEmail').value.trim();

    // Validate
    if (!email) {
        errorText.textContent = 'Bitte gib eine E-Mail-Adresse ein.';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Validate @nordakademie.de domain
    if (!email.endsWith('@nordakademie.de')) {
        errorText.textContent = 'Nur @nordakademie.de E-Mail-Adressen sind erlaubt.';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet...';

    try {
        const result = await FriendsAPI.sendRequest(email);

        // Success!
        showToast(result.message || 'Freundschaftsanfrage erfolgreich gesendet!', 'success');

        // Reset button before closing modal
        submitBtn.disabled = false;
        submitBtn.textContent = 'Anfrage senden';

        closeAddFriendModal();

        // Reload friend requests in navbar if function exists
        if (typeof loadFriendRequests === 'function') {
            loadFriendRequests();
        }

        // Also reload friends list if on dashboard page (in case of immediate acceptance)
        if (typeof loadFriends === 'function') {
            loadFriends();
        }

    } catch (error) {
        console.error('Error sending friend request:', error);
        errorText.textContent = error.message || 'Fehler beim Senden der Freundschaftsanfrage';
        errorDiv.classList.remove('hidden');

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Anfrage senden';
    }
}

/**
 * Close Add Friend Modal
 */
function closeAddFriendModal() {
    const modal = document.getElementById('addFriendModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}
