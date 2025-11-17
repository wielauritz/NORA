/**
 * Navbar Utilities for NORA Mobile App
 * Friend requests, user menu, and navbar interactions
 */

/**
 * Friends API V2 Module
 */
const FriendsAPI = {
    /**
     * Get all friend requests (incoming + outgoing)
     * @returns {Promise<{incoming: Array, outgoing: Array}>}
     */
    async getRequests() {
        const token = await window.AppStorage.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${window.AppConfig.API_BASE_URL_V2}/friends/requests`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Accept a friend request
     * @param {number} requestId - Request ID
     * @returns {Promise<{message: string}>}
     */
    async acceptRequest(requestId) {
        const token = await window.AppStorage.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${window.AppConfig.API_BASE_URL_V2}/friends/requests/${requestId}/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Reject a friend request
     * @param {number} requestId - Request ID
     * @returns {Promise<{message: string}>}
     */
    async rejectRequest(requestId) {
        const token = await window.AppStorage.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${window.AppConfig.API_BASE_URL_V2}/friends/requests/${requestId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Cancel an outgoing friend request
     * @param {number} requestId - Request ID
     * @returns {Promise<{message: string}>}
     */
    async cancelRequest(requestId) {
        const token = await window.AppStorage.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${window.AppConfig.API_BASE_URL_V2}/friends/requests/${requestId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }
};

/**
 * Global state for friend requests
 */
let friendRequestsData = { incoming: [], outgoing: [] };
let friendRequestsPollingInterval = null;

/**
 * Toggle friend requests dropdown
 */
async function toggleFriendRequestsDropdown() {
    const dropdown = document.getElementById('friendRequestsDropdown');
    if (!dropdown) return;

    const isHidden = dropdown.classList.contains('hidden');

    if (isHidden) {
        // Show dropdown and load requests
        dropdown.classList.remove('hidden');
        await loadFriendRequests();
    } else {
        // Hide dropdown
        dropdown.classList.add('hidden');
    }
}

/**
 * Load friend requests from API
 */
async function loadFriendRequests() {
    const loadingEl = document.getElementById('friendRequestsLoading');
    const contentEl = document.getElementById('friendRequestsContent');

    if (!loadingEl || !contentEl) return;

    try {
        // Show loading state
        loadingEl.classList.remove('hidden');
        contentEl.classList.add('hidden');

        // Fetch requests
        const data = await FriendsAPI.getRequests();
        friendRequestsData = data;

        // Render requests
        renderFriendRequests();

        // Update badge
        updateFriendRequestsBadge();

        // Hide loading, show content
        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');

    } catch (error) {
        console.error('[NavbarUtils] Error loading friend requests:', error);

        // Show error message
        loadingEl.innerHTML = `
            <div class="p-6 text-center">
                <svg class="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-sm text-gray-600 dark:text-gray-400">Fehler beim Laden der Anfragen</p>
                <button onclick="loadFriendRequests()" class="mt-3 text-sm text-primary hover:text-secondary font-medium">
                    Erneut versuchen
                </button>
            </div>
        `;
    }
}

/**
 * Render friend requests in dropdown
 */
function renderFriendRequests() {
    const incomingList = document.getElementById('incomingRequestsList');
    const outgoingList = document.getElementById('outgoingRequestsList');

    if (!incomingList || !outgoingList) return;

    // Render incoming requests
    if (friendRequestsData.incoming && friendRequestsData.incoming.length > 0) {
        incomingList.innerHTML = friendRequestsData.incoming.map(request => {
            const initials = request.initials || '??';
            const fullName = `${request.first_name || ''} ${request.last_name || ''}`.trim() || 'Unbekannt';
            const zenturie = request.zenturie || 'Keine Zenturie';

            return `
                <div class="p-4 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3 flex-1 min-w-0">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                ${initials}
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${fullName}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${zenturie}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 flex-shrink-0 ml-3">
                            <button onclick="acceptFriendRequest(${request.id})" class="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors" title="Annehmen">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                            </button>
                            <button onclick="rejectFriendRequest(${request.id})" class="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors" title="Ablehnen">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        incomingList.innerHTML = `
            <div class="p-6 text-center text-gray-500 dark:text-gray-400">
                <p class="text-sm">Du hast keine eingehenden Anfragen</p>
            </div>
        `;
    }

    // Render outgoing requests
    if (friendRequestsData.outgoing && friendRequestsData.outgoing.length > 0) {
        outgoingList.innerHTML = friendRequestsData.outgoing.map(request => {
            const initials = request.initials || '??';
            const fullName = `${request.first_name || ''} ${request.last_name || ''}`.trim() || 'Unbekannt';
            const zenturie = request.zenturie || 'Keine Zenturie';

            return `
                <div class="p-4 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3 flex-1 min-w-0">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                ${initials}
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${fullName}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${zenturie}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 flex-shrink-0 ml-3">
                            <span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">Ausstehend</span>
                            <button onclick="cancelFriendRequest(${request.id})" class="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors" title="Abbrechen">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        outgoingList.innerHTML = `
            <div class="p-6 text-center text-gray-500 dark:text-gray-400">
                <p class="text-sm">Du hast keine gesendeten Anfragen</p>
            </div>
        `;
    }
}

/**
 * Update friend requests badge count (Desktop + Mobile)
 */
function updateFriendRequestsBadge() {
    const badgeDesktop = document.getElementById('friendRequestsBadge');
    const badgeMobile = document.getElementById('friendRequestsBadgeMobile');

    const incomingCount = friendRequestsData.incoming ? friendRequestsData.incoming.length : 0;
    const badgeText = incomingCount > 9 ? '9+' : incomingCount;

    // Update Desktop Badge
    if (badgeDesktop) {
        if (incomingCount > 0) {
            badgeDesktop.textContent = badgeText;
            badgeDesktop.classList.remove('hidden');
        } else {
            badgeDesktop.classList.add('hidden');
        }
    }

    // Update Mobile Badge
    if (badgeMobile) {
        if (incomingCount > 0) {
            badgeMobile.textContent = badgeText;
            badgeMobile.classList.remove('hidden');
        } else {
            badgeMobile.classList.add('hidden');
        }
    }
}

/**
 * Accept friend request
 */
async function acceptFriendRequest(requestId) {
    try {
        const result = await FriendsAPI.acceptRequest(requestId);

        // Show success toast
        if (typeof showToast === 'function') {
            showToast(result.message || 'Freundschaftsanfrage angenommen!', 'success');
        }

        // Reload requests
        await loadFriendRequests();

        // Reload friends list if on dashboard
        if (typeof loadFriends === 'function') {
            await loadFriends();
        }

    } catch (error) {
        console.error('[NavbarUtils] Error accepting friend request:', error);
        if (typeof showToast === 'function') {
            showToast(error.message || 'Fehler beim Annehmen der Anfrage', 'error');
        }
    }
}

/**
 * Reject friend request
 */
async function rejectFriendRequest(requestId) {
    try {
        const result = await FriendsAPI.rejectRequest(requestId);

        // Show success toast
        if (typeof showToast === 'function') {
            showToast(result.message || 'Freundschaftsanfrage abgelehnt', 'success');
        }

        // Reload requests
        await loadFriendRequests();

    } catch (error) {
        console.error('[NavbarUtils] Error rejecting friend request:', error);
        if (typeof showToast === 'function') {
            showToast(error.message || 'Fehler beim Ablehnen der Anfrage', 'error');
        }
    }
}

/**
 * Cancel outgoing friend request
 */
async function cancelFriendRequest(requestId) {
    try {
        const result = await FriendsAPI.cancelRequest(requestId);

        // Show success toast
        if (typeof showToast === 'function') {
            showToast(result.message || 'Anfrage abgebrochen', 'success');
        }

        // Reload requests
        await loadFriendRequests();

    } catch (error) {
        console.error('[NavbarUtils] Error cancelling friend request:', error);
        if (typeof showToast === 'function') {
            showToast(error.message || 'Fehler beim Abbrechen der Anfrage', 'error');
        }
    }
}

/**
 * Start polling for friend requests
 */
async function startFriendRequestsPolling() {
    // Only poll if user is authenticated
    const token = await window.AppStorage.getToken();
    if (!token) return;

    // Initial load
    updateFriendRequestsBadge();

    // Load requests in background (don't show dropdown)
    try {
        const data = await FriendsAPI.getRequests();
        friendRequestsData = data;
        updateFriendRequestsBadge();
    } catch (error) {
        console.error('[NavbarUtils] Error polling friend requests:', error);
    }

    // Clear existing interval if any
    if (friendRequestsPollingInterval) {
        clearInterval(friendRequestsPollingInterval);
    }

    // Poll every 30 seconds
    friendRequestsPollingInterval = setInterval(async () => {
        try {
            const data = await FriendsAPI.getRequests();
            const previousIncomingCount = friendRequestsData.incoming ? friendRequestsData.incoming.length : 0;
            const newIncomingCount = data.incoming ? data.incoming.length : 0;

            friendRequestsData = data;
            updateFriendRequestsBadge();

            // Show toast if new incoming request
            if (newIncomingCount > previousIncomingCount && typeof showToast === 'function') {
                showToast('Du hast eine neue Freundschaftsanfrage erhalten!', 'info');
            }
        } catch (error) {
            console.error('[NavbarUtils] Error polling friend requests:', error);
        }
    }, 30000); // 30 seconds
}

/**
 * Stop polling for friend requests
 */
function stopFriendRequestsPolling() {
    if (friendRequestsPollingInterval) {
        clearInterval(friendRequestsPollingInterval);
        friendRequestsPollingInterval = null;
    }
}

/**
 * Toggle user dropdown menu
 */
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

/**
 * Set user initials in navbar (Desktop + Mobile)
 * @param {string} initials - User initials (e.g., "AB")
 */
function setUserInitials(initials) {
    console.log('[NavbarUtils] setUserInitials called with:', initials);

    const avatarDesktop = document.getElementById('userInitials');
    const avatarMobile = document.getElementById('userInitialsMobile');

    console.log('[NavbarUtils] Elements found:', {
        desktop: !!avatarDesktop,
        mobile: !!avatarMobile
    });

    if (avatarDesktop) {
        avatarDesktop.textContent = initials;
        console.log('[NavbarUtils] Desktop initials set to:', initials);
    } else {
        console.warn('[NavbarUtils] Desktop avatar element not found!');
    }

    if (avatarMobile) {
        avatarMobile.textContent = initials;
        console.log('[NavbarUtils] Mobile initials set to:', initials);
    } else {
        console.warn('[NavbarUtils] Mobile avatar element not found!');
    }
}

/**
 * Close dropdowns when clicking outside
 */
document.addEventListener('click', function(event) {
    const userDropdown = document.getElementById('userDropdown');
    const userInitials = document.getElementById('userInitials');
    const userInitialsMobile = document.getElementById('userInitialsMobile');
    const friendRequestsDropdown = document.getElementById('friendRequestsDropdown');
    const friendRequestsBtn = document.getElementById('friendRequestsBtn');
    const friendRequestsBtnMobile = document.getElementById('friendRequestsBtnMobile');

    // Close user dropdown if clicking outside
    if (userDropdown) {
        const isClickInsideDropdown = userDropdown.contains(event.target);
        const isClickOnDesktopButton = userInitials && userInitials.contains(event.target);
        const isClickOnMobileButton = userInitialsMobile && userInitialsMobile.contains(event.target);

        if (!isClickInsideDropdown && !isClickOnDesktopButton && !isClickOnMobileButton) {
            userDropdown.classList.add('hidden');
        }
    }

    // Close friend requests dropdown if clicking outside
    if (friendRequestsDropdown) {
        const isClickInsideDropdown = friendRequestsDropdown.contains(event.target);
        const isClickOnDesktopButton = friendRequestsBtn && friendRequestsBtn.contains(event.target);
        const isClickOnMobileButton = friendRequestsBtnMobile && friendRequestsBtnMobile.contains(event.target);

        if (!isClickInsideDropdown && !isClickOnDesktopButton && !isClickOnMobileButton) {
            friendRequestsDropdown.classList.add('hidden');
        }
    }
});

// Export functions for global use
window.FriendsAPI = FriendsAPI;
window.toggleFriendRequestsDropdown = toggleFriendRequestsDropdown;
window.loadFriendRequests = loadFriendRequests;
window.renderFriendRequests = renderFriendRequests;
window.updateFriendRequestsBadge = updateFriendRequestsBadge;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.cancelFriendRequest = cancelFriendRequest;
window.startFriendRequestsPolling = startFriendRequestsPolling;
window.stopFriendRequestsPolling = stopFriendRequestsPolling;
window.toggleUserDropdown = toggleUserDropdown;
window.setUserInitials = setUserInitials;

console.log('[NavbarUtils] Loaded successfully');
