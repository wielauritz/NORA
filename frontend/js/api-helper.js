/**
 * API Helper Functions für Stundenplan Dashboard
 * Diese Datei enthält wiederverwendbare Funktionen für API-Calls
 */

// API Base URL - Backend Login Service
const API_BASE_URL = 'https://api.new.nora-nak.de/v1';
const API_BASE_URL_V2 = 'https://api.new.nora-nak.de/v2';
// For local development, uncomment:
// const API_BASE_URL = 'http://localhost:8000/v1';
// const API_BASE_URL_V2 = 'http://localhost:8000/v2';

// Get storage instance from window (exported by storage-manager.js)
// Use var to avoid redeclaration errors in browser when multiple scripts load
var storage = storage || window.storage;

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
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Request options
 * @param {string} baseUrl - Override base URL (defaults to API_BASE_URL)
 */
async function apiRequest(endpoint, options = {}, baseUrl = API_BASE_URL) {
    const token = storage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    const url = `${baseUrl}${endpoint}`;
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
                    // Clear tokens from ALL storage locations (localStorage + iOS filesystem)
                    storage.removeItem('token');
                    storage.removeItem('user');

                    // Also clear persistent storage to prevent redirect loop on iOS
                    if (typeof clearTokenPersistent === 'function') {
                        await clearTokenPersistent();
                    }

                    window.location.href = '/login.html';
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
                const error = new Error(errorMessage || `HTTP ${status}: API Request failed`);
                error.data = data; // Preserve full response data
                throw error;
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
                    // Clear tokens from ALL storage locations (localStorage + iOS filesystem)
                    storage.removeItem('token');
                    storage.removeItem('user');

                    // Also clear persistent storage to prevent redirect loop on iOS
                    if (typeof clearTokenPersistent === 'function') {
                        await clearTokenPersistent();
                    }

                    window.location.href = '/login.html';
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
                console.log('[API] Parsed JSON data:', data);
            } else {
                data = await response.text();
                console.log('[API] Parsed text data:', data);
            }

            if (!response.ok) {
                const errorMessage = typeof data === 'object' ? (data.detail || data.message) : data;
                const error = new Error(errorMessage || `HTTP ${response.status}: API Request failed`);
                error.data = data; // Preserve full response data
                throw error;
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

    // Verify email with 6-digit code
    async verifyEmailWithCode(mail, code) {
        return await apiRequest('/verify-code', {
            method: 'POST',
            body: JSON.stringify({ mail, code }),
        });
    },

    // Request password reset
    async resetPassword(mail) {
        return await apiRequest('/reset', {
            method: 'POST',
            body: JSON.stringify({ mail }),
        });
    },

    // Reset password with 6-digit code
    async resetPasswordWithCode(mail, code, new_password) {
        return await apiRequest('/reset-password-code', {
            method: 'POST',
            body: JSON.stringify({ mail, code, new_password }),
        });
    },

    // Confirm password reset with new password
    async resetPasswordConfirm(uuid, new_password) {
        return await apiRequest('/reset-confirm', {
            method: 'POST',
            body: JSON.stringify({ uuid, new_password }),
        });
    },

    // Logout (clear all auth storage including Capacitor Cookies)
    async logout() {
        // Clear from all storage mechanisms
        await clearAuthStorage();

        // Redirect to login
        window.location.href = '/login.html';
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
        return await apiRequest(`/user`);
    },

    // Get all available Zenturien
    async getAllZenturien() {
        return await apiRequest('/all_zenturie');
    },

    // Set user's Zenturie
    async setZenturie(zenturie) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/zenturie`, {
            method: 'POST',
            body: JSON.stringify({ zenturie }),
        });
    },

    // Get user settings
    async getSettings() {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/user_settings`);
    },

    // Update user settings (zenturie_id, theme, notification_preference)
    async updateSettings(settings) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/user_settings`, {
            method: 'POST',
            body: JSON.stringify(settings),
        });
    },
};

/**
 * Events/Schedule APIs - NORA Timetable Service
 */
const ScheduleAPI = {
    // Get events for a specific date or date range (timetables + custom_hours)
    // If endDate is provided, returns all events between startDate and endDate (inclusive)
    async getEvents(date, endDate = null) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');

        let url = `/events?date=${date}`;
        if (endDate) {
            url += `&end=${endDate}`;
        }

        return await apiRequest(url);
    },

    // Get friend's timetable (only timetables, no custom hours)
    // If endDate is provided, returns all events between startDate and endDate (inclusive)
    async getFriendSchedule(zenturie, date, endDate = null) {
        let url = `/view?zenturie=${zenturie}&date=${date}`;
        if (endDate) {
            url += `&end=${endDate}`;
        }

        return await apiRequest(url);
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
        return await apiRequest(`/exams`);
    },

    // Add new exam
    async addExam(course, start_time, duration, room = null) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/add`, {
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
 * Friends APIs V2 - NORA Timetable Service
 * Modern friend request system with request/accept/reject flow
 */
const FriendsAPI = {
    // Send friend request
    async sendRequest(friendMail) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest('/friends/request', {
            method: 'POST',
            body: JSON.stringify({ friend_mail: friendMail }),
        }, API_BASE_URL_V2);
    },

    // Get all friend requests (incoming and outgoing)
    async getRequests() {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest('/friends/requests', {}, API_BASE_URL_V2);
    },

    // Accept friend request
    async acceptRequest(requestId) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest('/friends/accept', {
            method: 'POST',
            body: JSON.stringify({ request_id: requestId }),
        }, API_BASE_URL_V2);
    },

    // Reject friend request
    async rejectRequest(requestId) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest('/friends/reject', {
            method: 'POST',
            body: JSON.stringify({ request_id: requestId }),
        }, API_BASE_URL_V2);
    },

    // Cancel outgoing friend request
    async cancelRequest(requestId) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/friends/request?request_id=${requestId}`, {
            method: 'DELETE',
        }, API_BASE_URL_V2);
    },

    // Get accepted friends list
    async getFriends() {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest('/friends', {}, API_BASE_URL_V2);
    },

    // Remove friend (delete accepted friendship)
    async removeFriend(friendUserId) {
        const sessionId = storage.getItem('token');
        if (!sessionId) throw new Error('Nicht eingeloggt');
        return await apiRequest(`/friends?friend_user_id=${friendUserId}`, {
            method: 'DELETE',
        }, API_BASE_URL_V2);
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
        return await apiRequest(`/create`, {
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
        return await apiRequest(`/update`, {
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
        return await apiRequest(`/delete?custom_hour_id=${custom_hour_id}`, {
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
        return await apiRequest(`/courses`);
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
        return await apiRequest(`/search?parameter=${encodeURIComponent(parameter)}`);
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
console.log('[API Helper] Script loaded, beginning exports...');
console.log('[API Helper] module check:', typeof module, typeof module !== 'undefined' && module.exports);

if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
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
} else {
    // Browser environment - assign to window for global access
    window.AuthAPI = AuthAPI;
    window.UserAPI = UserAPI;
    window.ScheduleAPI = ScheduleAPI;
    window.ExamsAPI = ExamsAPI;
    window.RoomAPI = RoomAPI;
    window.FriendsAPI = FriendsAPI;
    window.CustomHoursAPI = CustomHoursAPI;
    window.SearchAPI = SearchAPI;
    window.CalendarAPI = CalendarAPI;

    // Utilities
    window.formatDateForAPI = formatDateForAPI;
    window.formatTime = formatTime;
    window.calculateDuration = calculateDuration;
    window.getCurrentWeekNumber = getCurrentWeekNumber;
    window.getDayName = getDayName;
    window.showToast = showToast;
    window.handleAPIError = handleAPIError;

    console.log('[API Helper] APIs exported to window globally');
}
