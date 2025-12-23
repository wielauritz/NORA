/**
 * Keycloak Authentication Service for NORA
 * Handles OAuth2/OpenID Connect authentication via Keycloak
 */

(function() {
    // Keycloak Instance
    let keycloak = null;
    let initPromise = null;

    /**
     * Get tenant slug from environment
     * In production, this should match the DEFAULT_TENANT_SLUG in backend .env
     */
    function getTenantSlug() {
        // For now, hardcoded. Could be made dynamic later.
        return 'nordakademie-hh';
    }

    /**
     * Initialize Keycloak
     * @returns {Promise<boolean>} - true if authenticated, false otherwise
     */
    async function initKeycloak() {
        // Return existing initialization promise if already initializing
        if (initPromise) {
            return initPromise;
        }

        initPromise = (async () => {
            const tenantSlug = getTenantSlug();
            const keycloakConfig = {
                url: 'https://auth.nora-nak.de',
                realm: `${tenantSlug}-realm`,
                clientId: 'nora-backend'
            };

            console.log('[Keycloak] Initializing with config:', keycloakConfig);

            keycloak = new Keycloak(keycloakConfig);

            try {
                const authenticated = await keycloak.init({
                    onLoad: 'check-sso',
                    checkLoginIframe: false, // Disable iframe check to avoid CSP issues
                    pkceMethod: 'S256',
                    enableLogging: true
                });

                console.log('[Keycloak] Initialized. Authenticated:', authenticated);

                // Setup event handlers
                setupEventHandlers();

                // Setup automatic token refresh if authenticated
                if (authenticated) {
                    setupTokenRefresh();
                    console.log('[Keycloak] Token:', keycloak.token?.substring(0, 50) + '...');
                }

                return authenticated;
            } catch (error) {
                console.error('[Keycloak] Failed to initialize:', error);
                return false;
            }
        })();

        return initPromise;
    }

    /**
     * Setup Keycloak event handlers
     */
    function setupEventHandlers() {
        keycloak.onAuthSuccess = () => {
            console.log('[Keycloak] ✅ Authentication successful');
        };

        keycloak.onAuthError = () => {
            console.error('[Keycloak] ❌ Authentication error');
        };

        keycloak.onAuthRefreshSuccess = () => {
            console.log('[Keycloak] 🔄 Token refreshed');
        };

        keycloak.onAuthRefreshError = () => {
            console.error('[Keycloak] ❌ Token refresh failed - logging out');
            logout();
        };

        keycloak.onTokenExpired = () => {
            console.warn('[Keycloak] ⏰ Token expired - refreshing...');
            keycloak.updateToken(30).catch((err) => {
                console.error('[Keycloak] Failed to refresh expired token:', err);
                logout();
            });
        };
    }

    /**
     * Setup automatic token refresh
     * Refreshes token every 60 seconds (token expires after 5 minutes by default)
     */
    function setupTokenRefresh() {
        setInterval(() => {
            keycloak.updateToken(70).then((refreshed) => {
                if (refreshed) {
                    console.log('[Keycloak] Token auto-refreshed');
                }
            }).catch(() => {
                console.error('[Keycloak] Failed to auto-refresh token');
                logout();
            });
        }, 60000); // Every 60 seconds
    }

    /**
     * Login - Redirect to Keycloak login page
     * @param {string} redirectUri - Optional redirect URI after login
     */
    function login(redirectUri = null) {
        if (!keycloak) {
            console.error('[Keycloak] Not initialized. Call init() first.');
            return;
        }

        const options = {
            redirectUri: redirectUri || window.location.origin + '/dashboard.html'
        };

        console.log('[Keycloak] Redirecting to login with options:', options);
        keycloak.login(options);
    }

    /**
     * Register - Redirect to Keycloak registration page
     * @param {string} redirectUri - Optional redirect URI after registration
     */
    function register(redirectUri = null) {
        if (!keycloak) {
            console.error('[Keycloak] Not initialized. Call init() first.');
            return;
        }

        const options = {
            redirectUri: redirectUri || window.location.origin + '/dashboard.html'
        };

        console.log('[Keycloak] Redirecting to registration with options:', options);
        keycloak.register(options);
    }

    /**
     * Logout - Clear session and redirect to Keycloak logout
     * @param {string} redirectUri - Optional redirect URI after logout
     */
    function logout(redirectUri = null) {
        if (!keycloak) {
            console.error('[Keycloak] Not initialized.');
            return;
        }

        const options = {
            redirectUri: redirectUri || window.location.origin + '/login.html'
        };

        console.log('[Keycloak] Logging out with options:', options);
        keycloak.logout(options);
    }

    /**
     * Get Access Token
     * @returns {string|undefined} - JWT access token
     */
    function getAccessToken() {
        return keycloak?.token;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    function isAuthenticated() {
        return keycloak?.authenticated || false;
    }

    /**
     * Get User Info from Keycloak
     * @returns {Promise<Object|null>} - User info object or null
     */
    async function getUserInfo() {
        if (!keycloak || !keycloak.authenticated) {
            return null;
        }

        try {
            const userInfo = await keycloak.loadUserInfo();
            const tokenParsed = keycloak.tokenParsed || {};
            const roles = tokenParsed.realm_access?.roles || [];

            return {
                sub: userInfo.sub,
                email: userInfo.email,
                firstName: userInfo.given_name || '',
                lastName: userInfo.family_name || '',
                fullName: `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
                roles: roles,
                isAdmin: roles.includes('admin'),
                isTeacher: roles.includes('teacher'),
                isStudent: roles.includes('student')
            };
        } catch (error) {
            console.error('[Keycloak] Failed to load user info:', error);
            return null;
        }
    }

    /**
     * Check if user has a specific role
     * @param {string} role - Role name to check
     * @returns {boolean}
     */
    function hasRole(role) {
        if (!keycloak || !keycloak.authenticated) {
            return false;
        }

        const tokenParsed = keycloak.tokenParsed || {};
        const roles = tokenParsed.realm_access?.roles || [];
        return roles.includes(role);
    }

    /**
     * Check if user has any of the specified roles
     * @param {string[]} roles - Array of role names
     * @returns {boolean}
     */
    function hasAnyRole(roles) {
        return roles.some(role => hasRole(role));
    }

    /**
     * Get Account Management URL
     * @returns {string} - Keycloak account management URL
     */
    function getAccountUrl() {
        if (!keycloak) {
            return null;
        }
        return keycloak.createAccountUrl();
    }

    // Export to window
    window.KeycloakAuth = {
        init: initKeycloak,
        login: login,
        register: register,
        logout: logout,
        getToken: getAccessToken,
        isAuthenticated: isAuthenticated,
        getUserInfo: getUserInfo,
        hasRole: hasRole,
        hasAnyRole: hasAnyRole,
        getAccountUrl: getAccountUrl
    };

    console.log('[Keycloak] Auth service loaded');
})();
