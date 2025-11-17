/**
 * Shell Module for NORA Mobile App
 * Main application logic and orchestration
 */

const API_CONFIG = {
    BASE_URL: 'https://api.new.nora-nak.de/v1',
    BASE_URL_V2: 'https://api.new.nora-nak.de/v2',
    TIMEOUT: 10000 // 10 seconds
};

/**
 * Shell Application class
 */
class ShellApp {
    constructor() {
        this.preloader = document.getElementById('preloader');
        this.offlineScreen = document.getElementById('offline-screen');
        this.contentLoader = document.getElementById('content-loader');
        this.retryButton = document.getElementById('retry-button');
        this.topNavbar = document.getElementById('top-navbar');
        this.bottomNavbar = document.getElementById('bottom-navbar');
        this.timeoutId = null;
        this.initialized = false;
        this.currentPage = null;

        // Listen for login success events from server-loaded content
        this.setupLoginBridge();
    }

    /**
     * Setup bridge between server-loaded login and shell storage
     */
    setupLoginBridge() {
        window.addEventListener('nora:loginSuccess', async (event) => {
            console.log('[Shell] Login success event received');
            const { token } = event.detail;

            if (token) {
                // Store token in shell's AppStorage (Capacitor Preferences)
                try {
                    await window.AppStorage.storeToken(token);
                    console.log('[Shell] Token stored in AppStorage after login');
                } catch (e) {
                    console.error('[Shell] Failed to store token in AppStorage:', e);
                }

                // CRITICAL: Also store token in localStorage for dynamically loaded scripts
                try {
                    localStorage.setItem('token', token);
                    console.log('[Shell] Token synced to localStorage after login');
                } catch (e) {
                    console.warn('[Shell] Failed to sync token to localStorage:', e);
                }
            }
        });
        console.log('[Shell] Login bridge setup complete');
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) {
            console.warn('[Shell] Already initialized');
            return;
        }

        console.log('[Shell] Initializing NORA Mobile App...');

        // Show preloader
        this.showPreloader();

        // Setup retry button
        this.retryButton.addEventListener('click', () => {
            console.log('[Shell] Retry button clicked');
            this.retry();
        });

        // Setup navbar navigation handlers
        this.setupNavbarHandlers();

        try {
            // Wait for Capacitor to be ready
            await this.waitForCapacitor();

            // Check authentication and load appropriate page
            // Note: checkAuthAndNavigate will handle its own timeout
            await this.checkAuthAndNavigate();

            // Success - hide preloader
            this.hidePreloader();

            this.initialized = true;
            console.log('[Shell] Initialization complete');

        } catch (error) {
            console.error('[Shell] Initialization failed:', {
                message: error.message,
                name: error.name
            });
            this.hidePreloader();
            this.showOfflineScreen();
        }
    }

    /**
     * Setup navbar navigation handlers (Top + Bottom)
     */
    setupNavbarHandlers() {
        // Bottom Navbar
        const bottomNavItems = this.bottomNavbar.querySelectorAll('.nav-item');
        bottomNavItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();

                const page = item.getAttribute('data-page');

                if (page === 'search') {
                    // Search button - special handling
                    this.handleSearch();
                    return;
                }

                // Navigate to page
                await this.navigateTo(page);
            });
        });

        // Top Navbar - Logo
        const logoLink = this.topNavbar.querySelector('a[data-page="dashboard"]');
        if (logoLink) {
            logoLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.navigateTo('dashboard');
            });
        }

        // Top Navbar - Desktop Nav Links
        const topNavLinks = this.topNavbar.querySelectorAll('.nav-link');
        topNavLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                await this.navigateTo(page);
            });
        });

        // Top Navbar - Search Button (Desktop)
        const searchBtn = this.topNavbar.querySelector('button[data-page="search"]');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }

        // Top Navbar - Settings Link
        const settingsLink = this.topNavbar.querySelector('a[data-page="settings"]');
        if (settingsLink) {
            settingsLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.navigateTo('settings');
            });
        }

        console.log('[Shell] Navbar handlers setup complete');
    }

    /**
     * Handle search button click
     */
    handleSearch() {
        console.log('[Shell] Search button clicked');
        // Search functionality will be implemented in loaded content
        // Try to call global search function if available
        if (typeof window.showGlobalSearch === 'function') {
            window.showGlobalSearch();
        } else {
            console.warn('[Shell] Search function not available yet');
        }
    }

    /**
     * Update active navbar item (Top + Bottom)
     * @param {string} page - Page name (e.g., 'dashboard', 'stundenplan')
     */
    updateActiveNavItem(page) {
        // Update Bottom Navbar
        const bottomNavItems = this.bottomNavbar.querySelectorAll('.nav-item');
        bottomNavItems.forEach(item => {
            item.classList.remove('active');
            item.classList.remove('text-primary');
            item.classList.add('text-gray-600');

            // Dark mode
            item.classList.remove('dark:text-primary');
            item.classList.add('dark:text-gray-400');
        });

        const activeBottomItem = this.bottomNavbar.querySelector(`.nav-item[data-page="${page}"]`);
        if (activeBottomItem) {
            activeBottomItem.classList.add('active');
            activeBottomItem.classList.remove('text-gray-600', 'dark:text-gray-400');
            activeBottomItem.classList.add('text-primary');
        }

        // Update Top Navbar Desktop Links
        const topNavLinks = this.topNavbar.querySelectorAll('.nav-link');
        topNavLinks.forEach(link => {
            link.classList.remove('active');
            link.classList.remove('bg-primary/10', 'text-primary', 'font-medium');
            link.classList.add('text-gray-600');
            link.classList.add('dark:text-gray-300');
        });

        const activeTopLink = this.topNavbar.querySelector(`.nav-link[data-page="${page}"]`);
        if (activeTopLink) {
            activeTopLink.classList.add('active');
            activeTopLink.classList.remove('text-gray-600', 'dark:text-gray-300');
            activeTopLink.classList.add('bg-primary/10', 'text-primary', 'font-medium');
        }

        this.currentPage = page;
        console.log(`[Shell] Navbar active state updated: ${page}`);
    }

    /**
     * Show content loader
     */
    showContentLoader() {
        this.contentLoader.classList.remove('hidden');
        this.contentLoader.classList.add('visible');
        console.log('[Shell] Content loader shown');
    }

    /**
     * Hide content loader
     */
    hideContentLoader() {
        this.contentLoader.classList.remove('visible');
        this.contentLoader.classList.add('hidden');
        console.log('[Shell] Content loader hidden');
    }

    /**
     * Wait for Capacitor to be ready
     */
    async waitForCapacitor() {
        // If not in Capacitor, resolve immediately
        if (typeof window.Capacitor === 'undefined') {
            console.log('[Shell] Running in web mode (no Capacitor)');
            return;
        }

        // Wait for Capacitor plugins to be ready
        return new Promise((resolve) => {
            if (window.Capacitor.isPluginAvailable('Preferences')) {
                console.log('[Shell] Capacitor ready');
                resolve();
            } else {
                // Give it a moment to load
                setTimeout(() => {
                    console.log('[Shell] Capacitor plugins loaded');
                    resolve();
                }, 100);
            }
        });
    }

    /**
     * Check authentication and navigate to appropriate page
     */
    async checkAuthAndNavigate() {
        console.log('[Shell] Checking authentication...');

        // Use ONLY AppStorage (Capacitor Preferences)
        // Server-loaded content manages its own persistent storage
        const token = await window.AppStorage.getToken();

        if (!token) {
            console.log('[Shell] No token found - navigating to login');
            await this.loadLogin();
            return;
        }

        console.log('[Shell] Token found - validating...');

        // Validate token with server
        const isValid = await this.validateToken(token);

        if (isValid) {
            console.log('[Shell] Token valid - navigating to dashboard');
            await this.loadDashboard();
            this.updateActiveNavItem('dashboard');
        } else {
            console.log('[Shell] Token invalid - clearing and navigating to login');
            await window.AppStorage.clearToken();
            await this.loadLogin();
        }
    }

    /**
     * Validate token with server
     * @param {string} token - JWT token
     * @returns {Promise<boolean>}
     */
    async validateToken(token) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s for auth check

            const response = await fetch(`${API_CONFIG.BASE_URL}/user`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const userData = await response.json();
                await window.AppStorage.storeUserData(userData);

                // CRITICAL: Also store token and user data in localStorage
                // This makes them available to dynamically loaded frontend scripts
                try {
                    localStorage.setItem('token', token);
                    localStorage.setItem('user', JSON.stringify(userData));
                    console.log('[Shell] Token and user data synced to localStorage');
                } catch (e) {
                    console.warn('[Shell] Failed to sync to localStorage:', e);
                }

                console.log('[Shell] Token validated successfully');
                return true;
            }

            console.warn('[Shell] Token validation failed:', response.status);
            return false;

        } catch (error) {
            console.error('[Shell] Token validation error:', error);
            return false;
        }
    }

    /**
     * Show top navbar
     */
    showTopNavbar() {
        if (this.topNavbar) {
            this.topNavbar.classList.remove('hidden');
            this.topNavbar.classList.add('visible');
            console.log('[Shell] Top navbar shown');
        }
    }

    /**
     * Hide top navbar
     */
    hideTopNavbar() {
        if (this.topNavbar) {
            this.topNavbar.classList.add('hidden');
            this.topNavbar.classList.remove('visible');
            console.log('[Shell] Top navbar hidden');
        }
    }

    /**
     * Show bottom navbar
     */
    showBottomNavbar() {
        if (this.bottomNavbar) {
            this.bottomNavbar.classList.remove('hidden');
            console.log('[Shell] Bottom navbar shown');
        }
    }

    /**
     * Hide bottom navbar
     */
    hideBottomNavbar() {
        if (this.bottomNavbar) {
            this.bottomNavbar.classList.add('hidden');
            console.log('[Shell] Bottom navbar hidden');
        }
    }

    /**
     * Initialize user session (navbar, friend requests polling)
     */
    async initUserSession() {
        console.log('[Shell] Initializing user session...');

        // Get user data
        const userData = await window.AppStorage.getUserData();

        if (userData) {
            // Set user initials
            const initials = userData.initials || userData.first_name?.charAt(0) + userData.last_name?.charAt(0) || '??';
            if (typeof window.setUserInitials === 'function') {
                window.setUserInitials(initials);
            }
        }

        // Show navbars
        this.showTopNavbar();
        this.showBottomNavbar();

        // Start friend requests polling
        if (typeof window.startFriendRequestsPolling === 'function') {
            await window.startFriendRequestsPolling();
        }

        console.log('[Shell] User session initialized');
    }

    /**
     * Load login page
     */
    async loadLogin() {
        console.log('[Shell] Loading login page...');

        // Hide navbars for login
        this.hideTopNavbar();
        this.hideBottomNavbar();

        // Stop friend requests polling
        if (typeof window.stopFriendRequestsPolling === 'function') {
            window.stopFriendRequestsPolling();
        }

        await window.ContentLoader.loadPage('login.html');
    }

    /**
     * Load dashboard page
     */
    async loadDashboard() {
        console.log('[Shell] Loading dashboard page...');
        await window.ContentLoader.loadPage('dashboard.html');

        // Initialize user session
        await this.initUserSession();
    }

    /**
     * Navigate to a specific page (called from navbar or loaded content)
     * @param {string} page - Page name (dashboard, stundenplan, etc.)
     */
    async navigateTo(page) {
        if (this.currentPage === page) {
            console.log(`[Shell] Already on ${page} page`);
            return;
        }

        try {
            console.log(`[Shell] Navigating to ${page}...`);
            this.showContentLoader();

            // Load page
            await window.ContentLoader.loadPage(`${page}.html`);

            // Update navbar
            this.updateActiveNavItem(page);

            // Hide loader
            this.hideContentLoader();

            console.log(`[Shell] Navigation to ${page} complete`);

        } catch (error) {
            console.error(`[Shell] Navigation to ${page} failed:`, error);
            this.hideContentLoader();
            this.showOfflineScreen();
        }
    }

    /**
     * Show preloader
     */
    showPreloader() {
        this.preloader.classList.add('active');
        this.offlineScreen.classList.remove('active');
        console.log('[Shell] Preloader shown');
    }

    /**
     * Hide preloader
     */
    hidePreloader() {
        this.preloader.classList.add('hiding');
        setTimeout(() => {
            this.preloader.classList.remove('active', 'hiding');
        }, 300);
        console.log('[Shell] Preloader hidden');
    }

    /**
     * Show offline screen
     */
    showOfflineScreen() {
        this.preloader.classList.add('hiding');
        setTimeout(() => {
            this.preloader.classList.remove('active', 'hiding');
            this.offlineScreen.classList.add('active');
        }, 300);
        console.log('[Shell] Offline screen shown');
    }

    /**
     * Hide offline screen
     */
    hideOfflineScreen() {
        this.offlineScreen.classList.remove('active');
        console.log('[Shell] Offline screen hidden');
    }

    /**
     * Start global timeout (DEPRECATED - no longer used)
     * Timeout handling is now done per-request in content-loader.js
     */
    startTimeout() {
        // No-op: timeout handling moved to individual fetch calls
    }

    /**
     * Clear global timeout (DEPRECATED - no longer used)
     */
    clearTimeout() {
        // No-op: timeout handling moved to individual fetch calls
    }

    /**
     * Retry initialization
     */
    retry() {
        console.log('[Shell] Retrying initialization...');
        this.hideOfflineScreen();
        this.initialized = false;

        // Clear any loaded content
        window.ContentLoader.clear();

        // Restart initialization
        setTimeout(() => {
            this.init();
        }, 300);
    }

    /**
     * Logout user
     */
    async logout() {
        console.log('[Shell] Logging out...');

        // Stop friend requests polling
        if (typeof window.stopFriendRequestsPolling === 'function') {
            window.stopFriendRequestsPolling();
        }

        // Clear shell storage (Capacitor Preferences)
        await window.AppStorage.clearAll();

        // Clear localStorage (server-loaded content may use this)
        if (typeof localStorage !== 'undefined') {
            localStorage.clear();
        }

        // Clear content
        window.ContentLoader.clear();

        // Hide navbars
        this.hideTopNavbar();
        this.hideBottomNavbar();

        // Reset initialization
        this.initialized = false;

        // Restart initialization (will load login)
        await this.init();
    }

    /**
     * Page content ready callback (called from content-loader after scripts load)
     */
    pageContentReady() {
        console.log('[Shell] Page content ready');
        this.hideContentLoader();
    }
}

// Create singleton instance
const shell = new ShellApp();

// Export for use in loaded content
window.Shell = shell;
window.API_CONFIG = API_CONFIG;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        shell.init();
    });
} else {
    shell.init();
}
