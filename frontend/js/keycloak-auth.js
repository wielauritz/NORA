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
        return 'nora-nak';
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
                clientId: 'nora-frontend'
            };

            console.log('[Keycloak] Initializing with config:', keycloakConfig);

            keycloak = new Keycloak(keycloakConfig);

            try {
                const authenticated = await keycloak.init({
                    onLoad: 'check-sso',
                    silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
                    checkLoginIframe: false, // Disable iframe check (causes issues with third-party cookie blocking)
                    pkceMethod: 'S256',
                    enableLogging: true,
                    flow: 'standard', // Explicitly use Authorization Code Flow
                    timeSkew: 10 // Allow 10 seconds skew between browser and server
                });

                console.log('[Keycloak] Initialized. Authenticated:', authenticated);

                // If not authenticated via check-sso, try to restore from localStorage
                if (!authenticated) {
                    const restored = restoreTokenFromStorage();
                    if (restored) {
                        console.log('[Keycloak] Token restored from localStorage');
                        authenticated = true;
                    }
                }

                // Setup event handlers
                setupEventHandlers();

                // Setup automatic token refresh if authenticated
                if (authenticated) {
                    setupTokenRefresh();
                    console.log('[Keycloak] Token:', keycloak.token?.substring(0, 50) + '...');

                    // Save token to localStorage for persistence
                    saveTokenToStorage();
                }

                return authenticated;
            } catch (error) {
                console.error('[Keycloak] Failed to initialize:', error);

                // If it's a nonce error, clear local storage and try a fresh login
                if (error && (error.toString().includes('nonce') || error.toString().includes('Invalid'))) {
                    console.warn('[Keycloak] Nonce/validation error detected. Clearing storage and retrying...');
                    // Clear any stored Keycloak state
                    try {
                        Object.keys(localStorage).forEach(key => {
                            if (key.startsWith('kc-') || key.includes('keycloak')) {
                                localStorage.removeItem(key);
                            }
                        });
                        Object.keys(sessionStorage).forEach(key => {
                            if (key.startsWith('kc-') || key.includes('keycloak')) {
                                sessionStorage.removeItem(key);
                            }
                        });
                    } catch (storageError) {
                        console.error('[Keycloak] Failed to clear storage:', storageError);
                    }
                }

                return false;
            }
        })();

        return initPromise;
    }

    /**
     * Save token to localStorage for persistence across page reloads
     */
    function saveTokenToStorage() {
        if (!keycloak || !keycloak.token) {
            return;
        }

        try {
            const tokenData = {
                token: keycloak.token,
                refreshToken: keycloak.refreshToken,
                idToken: keycloak.idToken,
                timeSkew: keycloak.timeSkew
            };

            localStorage.setItem('kc_token', JSON.stringify(tokenData));
            console.log('[Keycloak] Token saved to localStorage');
        } catch (error) {
            console.error('[Keycloak] Failed to save token to localStorage:', error);
        }
    }

    /**
     * Restore token from localStorage
     * @returns {boolean} - true if token was successfully restored
     */
    function restoreTokenFromStorage() {
        try {
            const tokenDataStr = localStorage.getItem('kc_token');
            if (!tokenDataStr) {
                console.log('[Keycloak] No token found in localStorage');
                return false;
            }

            const tokenData = JSON.parse(tokenDataStr);

            // Restore tokens to Keycloak instance
            keycloak.token = tokenData.token;
            keycloak.refreshToken = tokenData.refreshToken;
            keycloak.idToken = tokenData.idToken;
            keycloak.timeSkew = tokenData.timeSkew;

            // Parse token to get expiration and other claims
            if (keycloak.token) {
                keycloak.tokenParsed = decodeToken(keycloak.token);
                keycloak.sessionId = keycloak.tokenParsed.session_state;
                keycloak.authenticated = true;
                keycloak.subject = keycloak.tokenParsed.sub;
                keycloak.realmAccess = keycloak.tokenParsed.realm_access;
                keycloak.resourceAccess = keycloak.tokenParsed.resource_access;
            }

            if (keycloak.refreshToken) {
                keycloak.refreshTokenParsed = decodeToken(keycloak.refreshToken);
            }

            if (keycloak.idToken) {
                keycloak.idTokenParsed = decodeToken(keycloak.idToken);
            }

            // Check if token is expired
            if (keycloak.isTokenExpired(5)) {
                console.log('[Keycloak] Restored token is expired, attempting refresh...');
                // Token is expired, try to refresh
                keycloak.updateToken(5).then((refreshed) => {
                    if (refreshed) {
                        console.log('[Keycloak] Token refreshed successfully');
                        saveTokenToStorage(); // Save the new token
                    } else {
                        console.log('[Keycloak] Token is still valid');
                    }
                }).catch((error) => {
                    console.error('[Keycloak] Token refresh failed:', error);
                    // Clear invalid token
                    localStorage.removeItem('kc_token');
                    return false;
                });
            }

            console.log('[Keycloak] Token restored successfully from localStorage');
            return true;
        } catch (error) {
            console.error('[Keycloak] Failed to restore token from localStorage:', error);
            localStorage.removeItem('kc_token'); // Remove corrupted token
            return false;
        }
    }

    /**
     * Decode JWT token (base64url decode)
     * @param {string} token - JWT token
     * @returns {object} - Decoded token payload
     */
    function decodeToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid token format');
            }

            const payload = parts[1];
            // Replace base64url chars
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            // Add padding if needed
            const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
            const decoded = atob(padded);
            return JSON.parse(decoded);
        } catch (error) {
            console.error('[Keycloak] Failed to decode token:', error);
            return null;
        }
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
                    // Save the refreshed token to localStorage
                    saveTokenToStorage();
                }
            }).catch(() => {
                console.error('[Keycloak] Failed to auto-refresh token');
                localStorage.removeItem('kc_token'); // Clear invalid token
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

        // Clear token from localStorage
        try {
            localStorage.removeItem('kc_token');
            console.log('[Keycloak] Token cleared from localStorage');
        } catch (error) {
            console.error('[Keycloak] Failed to clear token from localStorage:', error);
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
