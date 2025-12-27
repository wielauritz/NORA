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
            // Check if we have tokens from backend callback in URL hash
            const hash = window.location.hash;
            if (hash && hash.includes('access_token=')) {
                console.log('[Keycloak] Detected tokens from backend callback');
                const authenticated = handleCallbackTokens(hash);
                if (authenticated) {
                    // Clean up URL hash
                    window.location.hash = '';
                    return true;
                }
            }

            const tenantSlug = getTenantSlug();
            const keycloakConfig = {
                url: 'https://auth.nora-nak.de',
                realm: `${tenantSlug}-realm`,
                clientId: 'nora-frontend'
            };

            console.log('[Keycloak] Initializing with config:', keycloakConfig);

            keycloak = new Keycloak(keycloakConfig);

            try {
                var authenticated = await keycloak.init({
                    onLoad: 'check-sso',
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
     * Handle tokens from backend callback (URL hash)
     * @param {string} hash - URL hash containing tokens
     * @returns {boolean} - true if tokens were successfully processed
     */
    function handleCallbackTokens(hash) {
        try {
            // Parse hash parameters
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const sessionState = params.get('session_state');
            const expiresIn = parseInt(params.get('expires_in') || '300');

            if (!accessToken) {
                console.error('[Keycloak] No access token in callback hash');
                return false;
            }

            console.log('[Keycloak] Processing tokens from backend callback');

            // Initialize keycloak object if not exists
            if (!keycloak) {
                const tenantSlug = getTenantSlug();
                keycloak = new Keycloak({
                    url: 'https://auth.nora-nak.de',
                    realm: `${tenantSlug}-realm`,
                    clientId: 'nora-frontend'
                });
            }

            // Set tokens manually
            keycloak.token = accessToken;
            keycloak.refreshToken = refreshToken;
            keycloak.sessionId = sessionState;
            keycloak.authenticated = true;

            // Parse token to get claims
            keycloak.tokenParsed = decodeToken(accessToken);
            if (keycloak.tokenParsed) {
                keycloak.subject = keycloak.tokenParsed.sub;
                keycloak.realmAccess = keycloak.tokenParsed.realm_access;
                keycloak.resourceAccess = keycloak.tokenParsed.resource_access;
            }

            if (refreshToken) {
                keycloak.refreshTokenParsed = decodeToken(refreshToken);
            }

            // Save to localStorage
            saveTokenToStorage();

            // Setup event handlers and token refresh
            setupEventHandlers();
            setupTokenRefresh();

            console.log('[Keycloak] ✅ Tokens successfully loaded from backend callback');
            return true;
        } catch (error) {
            console.error('[Keycloak] Failed to process callback tokens:', error);
            return false;
        }
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
     * Custom implementation to use backend callback endpoint
     * @param {string} redirectUri - Optional redirect URI after login
     */
    function login(redirectUri = null) {
        // Build backend callback URL
        const backendCallbackUrl = 'https://new.nora-nak.de/v1/auth/callback';

        // Build Keycloak authorization URL
        const tenantSlug = getTenantSlug();
        const state = generateRandomString(32);
        const nonce = generateRandomString(32);

        const authUrl = new URL(`https://auth.nora-nak.de/realms/${tenantSlug}-realm/protocol/openid-connect/auth`);
        authUrl.searchParams.set('client_id', 'nora-frontend');
        authUrl.searchParams.set('redirect_uri', backendCallbackUrl);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid profile email');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('nonce', nonce);

        console.log('[Keycloak] Redirecting to login:', authUrl.toString());
        window.location.href = authUrl.toString();
    }

    /**
     * Generate random string for PKCE
     */
    function generateRandomString(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let result = '';
        const randomValues = new Uint8Array(length);
        crypto.getRandomValues(randomValues);
        for (let i = 0; i < length; i++) {
            result += charset[randomValues[i] % charset.length];
        }
        return result;
    }

    /**
     * Generate PKCE code verifier
     */
    function generateCodeVerifier() {
        return generateRandomString(128);
    }

    /**
     * Generate PKCE code challenge from verifier
     */
    function generateCodeChallenge(verifier) {
        // For simplicity, use plain method (S256 would require crypto.subtle.digest)
        // Most Keycloak setups accept 'plain' as fallback
        return verifier;
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
            const tokenParsed = keycloak.tokenParsed || {};
            const roles = tokenParsed.realm_access?.roles || [];

            // Try to load userInfo from Keycloak API if method is available
            // Otherwise, fall back to token claims
            let userInfo = null;
            if (keycloak.loadUserInfo && typeof keycloak.loadUserInfo === 'function') {
                try {
                    userInfo = await keycloak.loadUserInfo();
                } catch (err) {
                    console.warn('[Keycloak] loadUserInfo not available, using token claims:', err.message);
                }
            }

            // Fallback to token claims if loadUserInfo failed or is not available
            if (!userInfo) {
                userInfo = {
                    sub: tokenParsed.sub,
                    email: tokenParsed.email || tokenParsed.preferred_username,
                    given_name: tokenParsed.given_name,
                    family_name: tokenParsed.family_name,
                    preferred_username: tokenParsed.preferred_username
                };
            }

            return {
                sub: userInfo.sub,
                email: userInfo.email || userInfo.preferred_username,
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
