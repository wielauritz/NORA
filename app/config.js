/**
 * NORA Mobile App Configuration
 */

const AppConfig = {
    // Server URLs
    SERVER_URL: 'https://new.nora-nak.de',
    API_BASE_URL: 'https://api.new.nora-nak.de/v1',
    API_BASE_URL_V2: 'https://api.new.nora-nak.de/v2',

    // Timeout settings
    TIMEOUT: {
        GLOBAL: 10000,      // 10 seconds for initial load
        AUTH: 5000,         // 5 seconds for auth check
        CONTENT: 10000      // 10 seconds for content loading
    },

    // Development mode
    DEV_MODE: false,

    // Logging
    ENABLE_LOGGING: true,

    // Pages
    PAGES: {
        LOGIN: 'login.html',
        DASHBOARD: 'dashboard.html',
        STUNDENPLAN: 'stundenplan.html',
        KURSE: 'kurse.html',
        KLAUSUREN: 'klausuren.html',
        SEARCH: 'search.html',
        FRIENDS: 'friends.html'
    },

    // Storage keys
    STORAGE: {
        AUTH_TOKEN: 'auth_token',
        USER_DATA: 'user_data',
        LAST_PAGE: 'last_page'
    }
};

// For development, you can override settings here
if (AppConfig.DEV_MODE) {
    // Example: use local server
    // AppConfig.SERVER_URL = 'http://localhost:8000';
    // AppConfig.API_BASE_URL = 'http://localhost:3000/v1';
}

// Make config globally available
window.AppConfig = AppConfig;
