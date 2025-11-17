/**
 * Dashboard JavaScript
 * Lädt und zeigt Dashboard-Daten vom NORA Backend
 */

// Get storage instance from window (exported by storage-manager.js)
var storage = window.storage;

// Initialize dashboard with auto-login support
// This ensures auto-login completes BEFORE authentication check
(async function initializeAuth() {
    // Check URL parameter for token (from email verification)
    // Format: ?token=xxx
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        try {
            console.log('✅ Auto-login token detected from email verification');
            console.log('🔑 Token:', token.substring(0, 8) + '...');

            // Initialize persistent storage
            try {
                await initPersistentStorage();
                console.log('✅ Persistent storage initialized');
            } catch (e) {
                console.warn('⚠️ Failed to initialize persistent storage:', e);
            }

            // Store token using persistent storage (filesystem + localStorage)
            try {
                await storeTokenPersistent(token);
                console.log('✅ Token stored via persistent storage');
            } catch (e) {
                console.error('❌ Error storing token via persistent storage:', e);
                // Fallback to localStorage only
                try {
                    localStorage.setItem('token', token);
                    console.log('✅ Token stored to localStorage (fallback)');
                } catch (storageError) {
                    console.error('❌ localStorage error:', storageError);
                }
            }

            // Also store to StorageManager if available
            if (typeof storage !== 'undefined' && storage.setItem) {
                try {
                    storage.setItem('token', token);
                    console.log('✅ Token stored to StorageManager');
                } catch (e) {
                    console.warn('⚠️ StorageManager error:', e);
                }
            }

            // Remove token parameter from URL without reload
            const cleanUrl = window.location.pathname;
            history.replaceState(null, '', cleanUrl);

            console.log('✅ Auto-login completed - token stored for all future requests');
        } catch (error) {
            console.error('❌ Error processing auto-login token:', error);
            // Continue with normal auth check even if auto-login fails
        }
    }

    // Check URL hash for auto-login (password reset legacy support)
    // Format: #auth=base64({"token":"xxx","email":"yyy"})
    const hash = window.location.hash;
    if (hash && hash.startsWith('#auth=')) {
        try {
            console.log('✅ Auto-login from hash detected (password reset)');
            // Extract and decode credentials from hash
            const encodedCreds = hash.substring(6); // Remove '#auth='
            const decodedCreds = atob(encodedCreds);
            const { token: hashToken, email: hashEmail } = JSON.parse(decodedCreds);

            if (hashToken && hashEmail) {
                console.log('📧 Email:', hashEmail);
                console.log('🔑 Token:', hashToken.substring(0, 8) + '...');

                // Initialize persistent storage
                try {
                    await initPersistentStorage();
                    console.log('✅ Persistent storage initialized');
                } catch (e) {
                    console.warn('⚠️ Failed to initialize persistent storage:', e);
                }

                // Store token using persistent storage
                try {
                    await storeTokenPersistent(hashToken);
                    console.log('✅ Token stored via persistent storage');
                } catch (e) {
                    console.error('❌ Error storing token via persistent storage:', e);
                    try {
                        localStorage.setItem('token', hashToken);
                        console.log('✅ Token stored to localStorage (fallback)');
                    } catch (storageError) {
                        console.error('❌ localStorage error:', storageError);
                    }
                }

                // Also store to StorageManager if available
                if (typeof storage !== 'undefined' && storage.setItem) {
                    try {
                        storage.setItem('token', hashToken);
                        console.log('✅ Token stored to StorageManager');
                    } catch (e) {
                        console.warn('⚠️ StorageManager error:', e);
                    }
                }

                // Extract user info from email
                const userName = hashEmail.split('@')[0];
                const userInfo = {
                    email: hashEmail,
                    name: userName,
                };
                try {
                    localStorage.setItem('user', JSON.stringify(userInfo));
                    console.log('✅ User info stored');
                } catch (e) {
                    console.error('❌ Error storing user info:', e);
                }

                // Remove hash from URL without reload
                history.replaceState(null, '', window.location.pathname + window.location.search);

                console.log('✅ Auto-login from hash completed');
            }
        } catch (error) {
            console.error('❌ Error processing auto-login hash:', error);
            // Continue with normal auth check even if auto-login fails
        }
    }

    // NOW check authentication (after auto-login is complete)
    console.log('🔍 Checking authentication...');
    if (!(await checkAuth())) {
        // checkAuth() redirects to login if not authenticated
        console.log('❌ Authentication check failed - redirecting to login');
    } else {
        console.log('✅ Authentication check passed');
    }
})();

// Global state
let userData = null;
let todayEvents = [];
let upcomingExams = [];
let friendsList = [];

/**
 * Helper: Clean event title (remove everything after first comma)
 */
function cleanEventTitle(title) {
    if (!title) return '';
    const commaIndex = title.indexOf(',');
    return commaIndex !== -1 ? title.substring(0, commaIndex).trim() : title;
}

/**
 * Helper: Convert newlines to <br> tags
 */
function nl2br(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
}

/**
 * Initialize dashboard
 */
async function initDashboard() {
    try {
        // Always show preloader on dashboard load (both initial load and tab navigation)
        if (typeof showContentLoader === 'function') {
            showContentLoader();
        }

        // Load user data
        await loadUserData();

        // Check if user has a Zenturie assigned
        if (!userData || !userData.zenturie) {
            console.log('⚠️ User has no Zenturie assigned, showing selection modal');

            // Hide content loader first
            if (typeof pageContentReady === 'function') {
                pageContentReady();
            }

            // Show Zenturie selection modal
            await showZenturieSelectionModal();
            return; // Stop here, page will reload after Zenturie is selected
        }

        // Update UI with user info
        updateUserDisplay();

        // Load dashboard data in parallel
        await Promise.all([
            loadTodaySchedule(),
            loadUpcomingExams(),
            loadFriends()
        ]);

        // Update statistics
        updateStatistics();

        // Hide content loader
        if (typeof pageContentReady === 'function') {
            pageContentReady();
        }

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        handleAPIError(error, 'Fehler beim Laden der Dashboard-Daten');

        // Hide loader even on error
        if (typeof pageContentReady === 'function') {
            pageContentReady();
        }
    }
}

/**
 * Load user data from API
 */
async function loadUserData() {
    try {
        userData = await UserAPI.getProfile();
        console.log('✅ User data loaded:', userData);

        // Store in localStorage for offline access
        localStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
        console.error('Error loading user data:', error);

        // Try to load from localStorage as fallback
        const cached = localStorage.getItem('userData');
        if (cached) {
            userData = JSON.parse(cached);
            console.log('📦 Using cached user data');
        } else {
            throw error;
        }
    }
}

/**
 * Update user display in UI
 */
function updateUserDisplay() {
    if (!userData) return;

    const firstName = userData.first_name || 'User';
    const lastName = userData.last_name || '';
    const initials = userData.initials || 'U';

    // Update welcome message
    const welcomeEl = document.querySelector('h1 .gradient-text');
    if (welcomeEl) {
        welcomeEl.textContent = firstName;
    }

    // Update user initials in avatar
    const avatarEl = document.getElementById('userInitials');
    if (avatarEl) {
        avatarEl.textContent = initials;
    }

    // Update current date display
    const today = new Date();
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateStr = today.toLocaleDateString('de-DE', dateOptions);

    const dateEl = document.getElementById('dashboardDateText');
    if (dateEl) {
        if (userData.zenturie) {
            dateEl.textContent = `Hier ist deine Übersicht für heute, ${dateStr} • Zenturie: ${userData.zenturie}`;
        } else {
            dateEl.textContent = `Hier ist deine Übersicht für heute, ${dateStr}`;
        }
    }
}

/**
 * Load today's schedule
 */
async function loadTodaySchedule() {
    try {
        const today = formatDateForAPI(new Date());
        todayEvents = await ScheduleAPI.getEvents(today);

        console.log('✅ Today events loaded:', todayEvents.length);
        renderTodaySchedule();
    } catch (error) {
        console.error('Error loading today schedule:', error);
        // Show placeholder
        document.getElementById('todaySchedule').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <p>Keine Termine für heute</p>
            </div>
        `;
    }
}

/**
 * Render today's schedule
 */
function renderTodaySchedule() {
    const container = document.getElementById('todaySchedule');
    if (!container) return;

    const now = new Date();

    // Filter out events that have already ended
    const upcomingEvents = todayEvents.filter(event => {
        const endTime = new Date(event.end_time);
        return endTime > now; // Only show events that haven't ended yet
    });

    if (upcomingEvents.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <p>Keine weiteren Termine für heute</p>
            </div>
        `;
        return;
    }

    container.innerHTML = upcomingEvents.map((event, index) => {
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        const duration = Math.round((endTime - startTime) / 60000); // minutes

        // Check if event is currently active
        const isActive = now >= startTime && now <= endTime;

        // Different styling for timetable vs custom_hour vs exam
        const borderColor = event.event_type === 'timetable' ? 'border-primary' : (event.event_type === 'exam' ? 'border-accent' : 'border-purple');
        const eventColorKey = event.event_type === 'timetable' ? 'primary' : (event.event_type === 'exam' ? 'accent' : 'purple');
        const bgColor = isActive
            ? `bg-gradient-to-r from-${eventColorKey}/5 to-${eventColorKey}/10`
            : 'bg-gray-50 dark:bg-slate-800';

        const startTimeStr = formatTime(startTime.toTimeString());

        return `
            <div class="flex items-start space-x-4 p-4 ${bgColor} rounded-xl border-l-4 ${borderColor} cursor-pointer hover:shadow-md transition-shadow" onclick='showEventDetails(${JSON.stringify(event).replace(/'/g, "&#39;")})'>
                <div class="text-center flex-shrink-0">
                    <div class="text-sm font-medium text-gray-600 dark:text-gray-400">${startTimeStr}</div>
                    <div class="text-xs text-gray-400 dark:text-gray-500">${duration} min</div>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold text-gray-900 dark:text-white mb-1 event-title">${cleanEventTitle(event.title)}</h4>
                    <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        ${event.location ? `
                            <span class="flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                ${event.location}
                            </span>
                        ` : ''}
                        ${event.professor ? `
                            <span class="flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                                ${event.professor}
                            </span>
                        ` : ''}
                    </div>
                    ${(() => {
                        const filteredDesc = filterDescription(event.description);
                        return filteredDesc ? `
                            <div class="mt-2 text-xs text-gray-500 dark:text-gray-400" style="white-space: pre-line;">${filteredDesc}</div>
                        ` : '';
                    })()}
                </div>
                ${isActive ? `
                    <span class="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">Aktiv</span>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Load upcoming exams
 */
async function loadUpcomingExams() {
    try {
        upcomingExams = await ExamsAPI.getUpcomingExams();
        console.log('✅ Exams loaded:', upcomingExams.length);
        renderUpcomingExams();
    } catch (error) {
        console.error('Error loading exams:', error);
    }
}

/**
 * Render upcoming exams
 */
function renderUpcomingExams() {
    const container = document.getElementById('upcomingExamsContainer');
    if (!container) return;

    if (upcomingExams.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>Keine anstehenden Klausuren</p>
            </div>
        `;
        return;
    }

    const now = new Date();

    // Take only next 3 exams
    const nextExams = upcomingExams.slice(0, 3);

    container.innerHTML = nextExams.map(exam => {
        const examDate = new Date(exam.start_time);
        const daysUntil = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));

        const dateStr = examDate.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = examDate.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const isUrgent = daysUntil <= 7;
        const bgColor = isUrgent ? 'bg-gradient-to-r from-accent/5 to-accent/10' : 'bg-gray-50 dark:bg-slate-800';
        const iconBg = isUrgent ? 'bg-accent/20' : 'bg-gray-200 dark:bg-slate-700';
        const iconColor = isUrgent ? 'text-accent' : 'text-gray-600 dark:text-gray-400';
        const daysColor = isUrgent ? 'text-accent' : 'text-gray-600 dark:text-gray-400';

        // Convert exam to event format for modal
        const endTime = new Date(examDate.getTime() + exam.duration * 60000);
        const eventData = {
            title: exam.course_name,
            start_time: exam.start_time,
            end_time: endTime.toISOString(),
            location: exam.room || null,
            room: exam.room || null,
            professor: null,
            description: exam.is_verified ? 'Status: Verifiziert' : 'Status: Nicht verifiziert',
            event_type: 'exam'
        };

        return `
            <div class="flex items-center justify-between p-4 ${bgColor} rounded-xl cursor-pointer hover:shadow-md transition-shadow" onclick='showEventDetails(${JSON.stringify(eventData).replace(/'/g, "&#39;")})'>
                <div class="flex items-center space-x-4">
                    <div class="p-3 ${iconBg} rounded-xl">
                        <svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h4 class="font-semibold text-gray-900 dark:text-white event-title">${exam.course_name}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${dateStr}, ${timeStr} • ${exam.duration} Min${exam.room ? ` • ${exam.room}` : ''}</p>
                        ${exam.is_verified ? '<span class="text-xs text-green-600 dark:text-green-400">✓ Verifiziert</span>' : ''}
                    </div>
                </div>
                <span class="text-sm font-medium ${daysColor}">In ${daysUntil} ${daysUntil === 1 ? 'Tag' : 'Tagen'}</span>
            </div>
        `;
    }).join('');
}

/**
 * Load friends list
 */
async function loadFriends() {
    try {
        friendsList = await FriendsAPI.getFriends();
        console.log('✅ Friends loaded:', friendsList.length);
        renderFriends();
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

/**
 * Render friends list
 */
function renderFriends() {
    // Update friends count in stats
    const friendsCountEl = document.getElementById('friendsCount');
    if (friendsCountEl) {
        friendsCountEl.textContent = friendsList.length;
    }

    // Render friends list in sidebar
    const container = document.getElementById('friendsListContainer');
    if (!container) return;

    if (friendsList.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p class="text-sm">Noch keine Freunde</p>
                <button onclick="showAddFriendModal()" class="mt-3 text-sm text-primary hover:text-secondary font-medium">
                    + Anfrage senden
                </button>
            </div>
        `;
        return;
    }

    // Show max 3 friends
    const displayFriends = friendsList.slice(0, 3);

    container.innerHTML = displayFriends.map(friend => {
        const initials = friend.initials || 'UN';
        const fullName = `${friend.first_name || ''} ${friend.last_name || ''}`.trim() || 'Unbekannt';
        const zenturie = friend.zenturie || 'Keine Zenturie';

        return `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="relative">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm">
                            ${initials}
                        </div>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-900">${fullName}</p>
                        <p class="text-xs text-gray-500">${zenturie}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="viewFriendSchedule('${friend.zenturie}')" class="text-primary hover:text-secondary transition-colors" title="Stundenplan anzeigen">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                    </button>
                    <button onclick="removeFriend(${friend.user_id}, '${fullName.replace(/'/g, "\\'")}')" class="text-red-500 hover:text-red-700 transition-colors" title="Freund entfernen">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Update dashboard statistics
 */
function updateStatistics() {
    const now = new Date();

    // Filter out past events
    const upcomingEvents = todayEvents.filter(event => {
        const endTime = new Date(event.end_time);
        return endTime > now;
    });

    // Total upcoming events today (timetable + custom hours) - 1st card
    const todayEventsCountEl = document.getElementById('todayEventsCount');
    if (todayEventsCountEl) {
        todayEventsCountEl.textContent = upcomingEvents.length;
    }

    // Upcoming courses today (only timetable events, not custom hours) - 2nd card
    const coursesCount = upcomingEvents.filter(e => e.event_type === 'timetable').length;
    const coursesEl = document.getElementById('coursesTodayCount');
    if (coursesEl) {
        coursesEl.textContent = coursesCount;
    }

    // Upcoming exams (next 30 days) - 3rd card
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingExamsCount = upcomingExams.filter(e => {
        const examDate = new Date(e.start_time);
        return examDate <= thirtyDaysFromNow;
    }).length;

    const examsEl = document.getElementById('upcomingExamsCount');
    if (examsEl) {
        examsEl.textContent = upcomingExamsCount;
    }
}

/**
 * View friend's schedule
 */
function viewFriendSchedule(zenturie) {
    if (!zenturie) return;
    window.location.href = `stundenplan.html?zenturie=${zenturie}`;
}

/**
 * Remove friend from friends list
 */
async function removeFriend(friendUserId, friendName) {
    // Confirmation dialog
    showConfirmDialog(`Möchtest du ${friendName} wirklich aus deiner Freundesliste entfernen?`, async () => {
        try {
            const result = await FriendsAPI.removeFriend(friendUserId);

            // Show success message
            showToast(result.message || 'Freund erfolgreich entfernt!', 'success');

            // Reload friends list
            await loadFriends();

        } catch (error) {
            console.error('Error removing friend:', error);
            showToast(error.message || 'Fehler beim Entfernen des Freundes', 'error');
        }
    });
}

/**
 * Logout function
 */
function logout() {
    showConfirmDialog('Möchtest du dich wirklich abmelden?', async () => {
        await AuthAPI.logout();
    });
}

/**
 * Helper: Format time from Date object
 */
function formatTime(timeString) {
    const parts = timeString.split(':');
    return `${parts[0]}:${parts[1]}`;
}

/**
 * Show calendar subscription modal
 */
function showCalendarSubscription() {
    if (!userData || !userData.subscription_uuid) {
        showToast('Subscription UUID nicht gefunden', 'error');
        return;
    }

    const subscriptionURL = CalendarAPI.getSubscriptionURL(userData.subscription_uuid);
    const webcalURL = subscriptionURL.replace('https://', 'webcal://').replace('http://', 'webcal://');

    // Create modal
    const modalHTML = `
        <div id="calendarSubModal" class="modal-overlay">
            <div class="modal-content glass-effect rounded-3xl w-full max-w-2xl p-8 relative" onclick="event.stopPropagation()">
                <!-- Close Button -->
                <button onclick="closeCalendarSubModal()" class="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <!-- Header -->
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">📅 Kalender-Abonnement</h2>
                    <p class="text-gray-600">Integriere deinen NORA-Stundenplan in deine Kalender-App</p>
                </div>

                <div class="space-y-6">
                    <!-- What's included -->
                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h3 class="font-semibold text-blue-900 mb-2">Was ist enthalten?</h3>
                        <ul class="text-sm text-blue-800 space-y-1">
                            <li>✓ Alle Stundenplan-Events (Timetables)</li>
                            <li>✓ Deine eigenen Stunden (Custom Hours)</li>
                            <li>✓ Anstehende Klausuren</li>
                            <li>✓ Automatische Synchronisierung</li>
                        </ul>
                    </div>

                    <!-- Automatic Import Section -->
                    <div class="bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-xl p-5">
                        <h3 class="font-bold text-gray-900 mb-3 flex items-center">
                            <svg class="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            Automatisch importieren (empfohlen)
                        </h3>
                        <p class="text-sm text-gray-600 mb-4">
                            Ein Klick und dein Kalender wird automatisch abonniert und synchronisiert sich regelmäßig.
                        </p>
                        <a href="${webcalURL}" class="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            Jetzt abonnieren
                        </a>
                        <p class="text-xs text-gray-500 mt-2 text-center">
                            Funktioniert mit Apple Kalender, Outlook und den meisten Kalender-Apps
                        </p>
                    </div>

                    <!-- Divider -->
                    <div class="relative">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="divider-text px-4 text-gray-500 font-medium">ODER</span>
                        </div>
                    </div>

                    <!-- Manual Import Section -->
                    <div>
                        <h3 class="font-bold text-gray-900 mb-3">Manueller Import</h3>

                        <!-- URL Box -->
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Abonnement-URL:
                            </label>
                            <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                <input type="text" readonly
                                       value="${subscriptionURL}"
                                       id="subscriptionURL"
                                       class="w-full sm:flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-sm font-mono overflow-x-auto">
                                <button onclick="copySubscriptionURL()" class="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors whitespace-nowrap">
                                    Kopieren
                                </button>
                            </div>
                        </div>

                        <!-- Instructions for different apps -->
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="font-semibold text-gray-900 mb-3 text-sm">Anleitungen für verschiedene Apps:</h4>
                            <div class="space-y-3 text-sm text-gray-700">
                                <div>
                                    <p class="font-medium mb-1">📱 Apple Kalender (iPhone/Mac):</p>
                                    <ol class="list-decimal list-inside space-y-1 text-gray-600 ml-2 text-xs">
                                        <li>Kalender-App öffnen → "Kalender" → "Abonnement hinzufügen"</li>
                                        <li>URL einfügen und bestätigen</li>
                                    </ol>
                                </div>
                                <div>
                                    <p class="font-medium mb-1">📆 Google Calendar:</p>
                                    <ol class="list-decimal list-inside space-y-1 text-gray-600 ml-2 text-xs">
                                        <li>Google Calendar öffnen → Einstellungen</li>
                                        <li>"Kalender hinzufügen" → "Per URL"</li>
                                        <li>URL einfügen</li>
                                    </ol>
                                </div>
                                <div>
                                    <p class="font-medium mb-1">💻 Outlook:</p>
                                    <ol class="list-decimal list-inside space-y-1 text-gray-600 ml-2 text-xs">
                                        <li>Outlook öffnen → "Kalender hinzufügen"</li>
                                        <li>"Aus dem Internet" auswählen</li>
                                        <li>URL einfügen</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <!-- Download ICS option -->
                        <div class="mt-4">
                            <button onclick="window.open('${subscriptionURL}', '_blank')" class="w-full px-6 py-3 bg-gradient-to-r from-accent/80 to-orange-500/80 hover:from-accent hover:to-orange-500 text-white rounded-xl font-medium transition-all hover:shadow-md flex items-center justify-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                ICS-Datei herunterladen
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Close Button -->
                <div class="mt-6">
                    <button onclick="closeCalendarSubModal()" class="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors">
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('calendarSubModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    setTimeout(() => {
        document.getElementById('calendarSubModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 10);
}

/**
 * Copy subscription URL to clipboard
 */
async function copySubscriptionURL() {
    const input = document.getElementById('subscriptionURL');

    try {
        // Modern Clipboard API
        await navigator.clipboard.writeText(input.value);
        showToast('URL in Zwischenablage kopiert!', 'success');
    } catch (err) {
        // Fallback for older browsers
        console.log('Modern clipboard API failed, trying fallback:', err);
        try {
            input.select();
            input.setSelectionRange(0, 99999); // For mobile
            document.execCommand('copy');
            showToast('URL in Zwischenablage kopiert!', 'success');
        } catch (fallbackErr) {
            console.error('Copy failed:', fallbackErr);
            showToast('Kopieren fehlgeschlagen', 'error');
        }
    }
}

/**
 * Close calendar subscription modal
 */
function closeCalendarSubModal() {
    const modal = document.getElementById('calendarSubModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        setTimeout(() => modal.remove(), 300);
    }
}

/**
 * Helper: Convert newlines to <br> tags
 */
function nl2br(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
}

/**
 * Helper: Filter description to remove redundant information
 */
function filterDescription(description) {
    if (!description) return '';

    let normalizedDesc = description.replace(/\\n/g, '\n');
    const lines = normalizedDesc.split('\n');

    const redundantPrefixes = [
        'Veranstaltung:',
        'Dozent:',
        'Raum:',
        'Zeit:',
        'Dauer:'
    ];

    const filteredLines = lines.filter(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return false;
        return !redundantPrefixes.some(prefix => trimmedLine.startsWith(prefix));
    });

    return filteredLines.length > 0 ? filteredLines.join('\n') : '';
}

/**
 * Variable to store currently viewed event
 */
let currentlyViewedEvent = null;

/**
 * Show event details modal
 */
function showEventDetails(event) {
    currentlyViewedEvent = event;

    const modal = document.getElementById('eventModal');
    if (!modal) return;

    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    const duration = Math.round((endTime - startTime) / 60000);

    const cleanTitle = cleanEventTitle(event.title);

    const modalContent = document.getElementById('eventModalContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">${cleanTitle}</h3>

            <div class="space-y-3">
                <div class="flex items-center text-gray-700 dark:text-gray-300">
                    <svg class="w-5 h-5 mr-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>${formatTime(startTime.toTimeString())} - ${formatTime(endTime.toTimeString())} (${duration} Min)</span>
                </div>

                ${event.location || event.room ? `
                    <div class="flex items-center text-gray-700 dark:text-gray-300">
                        <svg class="w-5 h-5 mr-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span>${event.location || event.room}</span>
                    </div>
                ` : ''}

                ${event.professor ? `
                    <div class="flex items-center text-gray-700 dark:text-gray-300">
                        <svg class="w-5 h-5 mr-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        <span>${event.professor}</span>
                    </div>
                ` : ''}

                ${event.description ? (() => {
                    const filteredDesc = filterDescription(event.description);
                    return filteredDesc ? `
                        <div class="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                            <p class="text-sm text-gray-700 dark:text-gray-300" style="white-space: pre-line;">${filteredDesc}</p>
                        </div>
                    ` : '';
                })() : ''}

                ${event.event_type === 'custom_hour' ? `
                    <div class="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <span class="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
                            Eigener Termin
                        </span>
                    </div>
                ` : ''}
            </div>

            <div class="mt-6 flex justify-end">
                <button onclick="closeEventModal()" class="px-6 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">
                    Schließen
                </button>
            </div>
        `;
    }

    modal.classList.add('active');

    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeEventModal();
        }
    };
}

/**
 * Close event modal
 */
function closeEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Initialize dashboard when page loads (works for both static and dynamic loading)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardAndStartRefresh);
} else {
    // DOM already loaded (script loaded dynamically) - initialize immediately
    initDashboardAndStartRefresh();
}

function initDashboardAndStartRefresh() {
    console.log('🚀 Initializing dashboard...');
    initDashboard();

    // Auto-refresh every 60 seconds to update "Aktiv" badges and remove past events
    setInterval(() => {
        renderTodaySchedule();
        updateStatistics();
    }, 60000); // 60 seconds
}
