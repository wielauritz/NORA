/**
 * API Helper Functions für Stundenplan Dashboard
 * Diese Datei enthält wiederverwendbare Funktionen für API-Calls
 */

// API Base URL - Backend Login Service
const API_BASE_URL = 'https://api.new.nora-nak.de/v1';
// For local development, uncomment:
// const API_BASE_URL = 'http://localhost:8000/v1';

/**
 * Helper: Detect if running in Capacitor
 */
function isCapacitor() {
    // Check if Capacitor is available and we're on native platform
    return typeof window !== 'undefined' &&
           typeof Capacitor !== 'undefined' &&
           Capacitor.isNativePlatform &&
           Capacitor.isNativePlatform() === true;
}

/**
 * Helper: API Request mit Authentication (Capacitor & Browser compatible)
 */
async function apiRequest(endpoint, options = {}) {
    const token = storage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    const url = `${API_BASE_URL}${endpoint}`;
    const method = options.method || 'GET';
    const body = options.body;

    try {
        let response;
        let data;

        // Debug Capacitor availability
        console.log('[API] Capacitor check:', {
            hasWindow: typeof window !== 'undefined',
            hasCapacitor: typeof window.Capacitor !== 'undefined',
            hasPlugins: window.Capacitor && typeof window.Capacitor.Plugins !== 'undefined',
            pluginsList: window.Capacitor && window.Capacitor.Plugins ? Object.keys(window.Capacitor.Plugins) : [],
            isNative: isCapacitor()
        });

        // Use Capacitor HTTP for native apps
        // In Capacitor 6+/7+, it's CapacitorHttp
        if (isCapacitor() && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp) {
            console.log('[API] Using Capacitor HTTP for native request');
            const { CapacitorHttp } = window.Capacitor.Plugins;

            const requestOptions = {
                url: url,
                method: method,
                headers: headers,
            };

            if (body) {
                requestOptions.data = JSON.parse(body);
            }

            console.log('[API] Request:', requestOptions);
            response = await CapacitorHttp.request(requestOptions);
            console.log('[API] Response:', response);

            // CapacitorHttp response format: { status, data, headers }
            const status = response.status;
            data = response.data;

            // Handle unauthorized
            if (status === 401) {
                const isAuthEndpoint = endpoint === '/login' || endpoint === '/resend-email' ||
                                       endpoint === '/reset' || endpoint === '/reset-confirm';

                if (!isAuthEndpoint) {
                    storage.removeItem('token');
                    storage.removeItem('user');
                    window.location.href = '/index.html';
                    return null;
                }
            }

            // Handle 204 No Content
            if (status === 204) {
                return { success: true };
            }

            // Handle errors
            if (status >= 400) {
                const errorMessage = typeof data === 'object' ? (data.detail || data.message) : data;
                throw new Error(errorMessage || `HTTP ${status}: API Request failed`);
            }

            return data;

        } else {
            // Use fetch for browser
            console.log('[API] Using fetch for browser request');
            const fetchOptions = {
                method: method,
                headers: headers,
            };

            if (body) {
                fetchOptions.body = body;
            }

            console.log('[API] Fetch request:', url, fetchOptions);
            response = await fetch(url, fetchOptions);
            console.log('[API] Fetch response:', response.status, response.statusText);

            // Handle unauthorized
            if (response.status === 401) {
                const isAuthEndpoint = endpoint === '/login' || endpoint === '/resend-email' ||
                                       endpoint === '/reset' || endpoint === '/reset-confirm';

                if (!isAuthEndpoint) {
                    storage.removeItem('token');
                    storage.removeItem('user');
                    window.location.href = '/index.html';
                    return null;
                }
            }

            // Handle 204 No Content
            if (response.status === 204) {
                return { success: true };
            }

            // Parse response
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                const errorMessage = typeof data === 'object' ? (data.detail || data.message) : data;
                throw new Error(errorMessage || `HTTP ${response.status}: API Request failed`);
            }

            return data;
        }
    } catch (error) {
        console.error('[API] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            error: error
        });
        throw error;
    }
}

/**
 * Authentication APIs - NORA Backend Login Service
 */
const AuthAPI = {
    // Login (with automatic registration for @nordakademie.de emails)
    async login(mail, passwort) {
        return await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ mail, passwort }),
        });
    },

    // Resend verification email
    async resendVerificationEmail(mail) {
        return await apiRequest('/resend-email', {
            method: 'POST',
            body: JSON.stringify({ mail }),
        });
    },

    // Verify email with UUID
    async verifyEmail(uuid) {
        return await apiRequest(`/verify?uuid=${uuid}`, {
            method: 'GET',
        });
    },

    // Request password reset
    async resetPassword(mail) {
        return await apiRequest('/reset', {
            method: 'POST',
            body: JSON.stringify({ mail }),
        });
    },

    // Confirm password reset with new password
    async resetPasswordConfirm(uuid, new_password) {
        return await apiRequest('/reset-confirm', {
            method: 'POST',
            body: JSON.stringify({ uuid, new_password }),
        });
    },

    // Logout (clear local storage)
    logout() {
        storage.removeItem('token');
        storage.removeItem('user');
        window.location.href = '/index.html';
    },

    // Health check
    async healthCheck() {
        return await apiRequest('/health', {
            method: 'GET',
        });
    },
};

/**
 * User APIs - NORA Timetable Service
 */
const UserAPI = {
    // Get user profile
    async getProfile() {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/user?session_id=${sessionId}`);
    },

    // Get all available Zenturien
    async getAllZenturien() {
        return await apiRequest('/all_zenturie');
    },

    // Set user's Zenturie
    async setZenturie(zenturie) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/zenturie?session_id=${sessionId}`, {
            method: 'POST',
            body: JSON.stringify({ zenturie }),
        });
    },
};

/**
 * Events/Schedule APIs - NORA Timetable Service
 */
const ScheduleAPI = {
    // Get events for a specific date (timetables + custom_hours)
    async getEvents(date) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/events?session_id=${sessionId}&date=${date}`);
    },

    // Get friend's timetable (only timetables, no custom hours)
    async getFriendSchedule(zenturie, date) {
        return await apiRequest(`/view?zenturie=${zenturie}&date=${date}`);
    },
};

/**
 * Exams APIs - NORA Timetable Service
 */
const ExamsAPI = {
    // Get all upcoming exams
    async getUpcomingExams() {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/exams?session_id=${sessionId}`);
    },

    // Add new exam
    async addExam(course, start_time, duration, room = null) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/add?session_id=${sessionId}`, {
            method: 'POST',
            body: JSON.stringify({ course, start_time, duration, room }),
        });
    },
};

/**
 * Room APIs - NORA Timetable Service
 */
const RoomAPI = {
    // Get all rooms
    async getAllRooms() {
        return await apiRequest('/rooms');
    },

    // Get free rooms for a time period
    async getFreeRooms(startTime, endTime) {
        return await apiRequest(`/free-rooms?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`);
    },

    // Get room details with occupancy
    async getRoomDetails(roomNumber) {
        return await apiRequest(`/room?room_number=${roomNumber}`);
    },
};

/**
 * Friends APIs - NORA Timetable Service
 */
const FriendsAPI = {
    // Get friends list
    async getFriends() {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/friends?session_id=${sessionId}`);
    },

    // Add friend by email
    async addFriend(friendMail) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/friends?session_id=${sessionId}`, {
            method: 'POST',
            body: JSON.stringify({ friend_mail: friendMail }),
        });
    },

    // Remove friend by user ID
    async removeFriend(friendUserId) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/friends?session_id=${sessionId}&friend_user_id=${friendUserId}`, {
            method: 'DELETE',
        });
    },
};

/**
 * Custom Hours APIs - NORA Timetable Service
 */
const CustomHoursAPI = {
    // Create custom hour
    async createCustomHour(title, description, start_time, end_time, room = null, custom_location = null) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/create?session_id=${sessionId}`, {
            method: 'POST',
            body: JSON.stringify({
                title,
                description,
                start_time,
                end_time,
                room,
                custom_location
            }),
        });
    },

    // Update custom hour
    async updateCustomHour(custom_hour_id, updates) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/update?session_id=${sessionId}`, {
            method: 'POST',
            body: JSON.stringify({
                custom_hour_id,
                ...updates
            }),
        });
    },

    // Delete custom hour
    async deleteCustomHour(custom_hour_id) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/delete?session_id=${sessionId}&custom_hour_id=${custom_hour_id}`, {
            method: 'DELETE',
        });
    },
};

/**
 * Courses API - NORA Timetable Service
 */
const CoursesAPI = {
    // Get all courses related to the user
    async getAllCourses() {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/courses?session_id=${sessionId}`);
    },
};

/**
 * Search API - NORA Timetable Service
 */
const SearchAPI = {
    // Global search
    async search(parameter) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/search?session_id=${sessionId}&parameter=${encodeURIComponent(parameter)}`);
    },
};

/**
 * Calendar Subscription API - NORA Timetable Service
 */
const CalendarAPI = {
    // Get ICS subscription URL
    getSubscriptionURL(subscriptionUuid) {
        return `${API_BASE_URL}/subscription/${subscriptionUuid}.ics`;
    },
};

/**
 * Utility Functions
 */

// Format date for API (using local timezone, not UTC)
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format time
function formatTime(timeString) {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Calculate duration
function calculateDuration(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end - start) / 1000 / 60; // minutes
    return diff;
}

// Get current week number
function getCurrentWeekNumber() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

// Get day name in German
function getDayName(dayIndex) {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return days[dayIndex];
}

// Show toast notification (requires implementation)
function showToast(message, type = 'info') {
    // Implement toast notification UI
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Error handler
function handleAPIError(error, fallbackMessage = 'Ein Fehler ist aufgetreten') {
    const message = error.message || fallbackMessage;
    showToast(message, 'error');
    console.error('Error:', error);
}

// Export APIs for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AuthAPI,
        UserAPI,
        ScheduleAPI,
        ExamsAPI,
        RoomAPI,
        FriendsAPI,
        CustomHoursAPI,
        SearchAPI,
        CalendarAPI,
        // Utilities
        formatDateForAPI,
        formatTime,
        calculateDuration,
        getCurrentWeekNumber,
        getDayName,
        showToast,
        handleAPIError,
    };
}
