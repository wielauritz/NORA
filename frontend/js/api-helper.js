/**
 * API Helper Functions for NORA Dashboard
 * Updated for Keycloak JWT Authentication
 */

(function() {
    // API Base URLs
    const API_BASE_URL = 'https://nora-nak.de/v1';
    const API_BASE_URL_V2 = 'https://nora-nak.de/v2';

    // For local development, uncomment:
    // const API_BASE_URL = 'http://localhost:8000/v1';
    // const API_BASE_URL_V2 = 'http://localhost:8000/v2';

    /**
     * Helper: Detect if running in Capacitor
     */
    function isCapacitor() {
        return typeof window !== 'undefined' &&
               typeof Capacitor !== 'undefined' &&
               Capacitor.isNativePlatform &&
               Capacitor.isNativePlatform() === true;
    }

    /**
     * Get JWT Token from Keycloak
     * @returns {string|null} - JWT token or null
     */
    function getToken() {
        if (!window.KeycloakAuth) {
            console.error('[API] KeycloakAuth not available');
            return null;
        }

        const token = window.KeycloakAuth.getToken();
        if (!token) {
            console.warn('[API] No Keycloak token available');
        }
        return token;
    }

    /**
     * Handle unauthorized response - redirect to login
     */
    function handleUnauthorized() {
        console.error('[API] Unauthorized - redirecting to login');

        // Use Keycloak logout if available
        if (window.KeycloakAuth && window.KeycloakAuth.logout) {
            window.KeycloakAuth.logout();
        } else {
            window.location.href = '/login.html';
        }
    }

    /**
     * API Request with Keycloak JWT Authentication
     * @param {string} endpoint - API endpoint path
     * @param {object} options - Request options
     * @param {string} baseUrl - Override base URL (defaults to API_BASE_URL)
     * @returns {Promise<any>} - Response data
     */
    async function apiRequest(endpoint, options = {}, baseUrl = API_BASE_URL) {
        const token = getToken();

        if (!token) {
            console.error('[API] No authentication token available');
            handleUnauthorized();
            throw new Error('Not authenticated');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        };

        const url = `${baseUrl}${endpoint}`;
        const method = options.method || 'GET';
        const body = options.body;

        console.log(`[API] ${method} ${endpoint}`);

        try {
            let response;
            let data;

            // Use Capacitor HTTP for native apps
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

                response = await CapacitorHttp.request(requestOptions);
                const status = response.status;
                data = response.data;

                // Handle unauthorized
                if (status === 401) {
                    handleUnauthorized();
                    throw new Error('Unauthorized');
                }

                // Handle 204 No Content
                if (status === 204) {
                    return { success: true };
                }

                // Handle errors
                if (status >= 400) {
                    const errorMessage = typeof data === 'object' ? (data.detail || data.error || data.message) : data;
                    const error = new Error(errorMessage || `HTTP ${status}: API Request failed`);
                    error.status = status;
                    error.data = data;
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

                response = await fetch(url, fetchOptions);

                // Handle unauthorized
                if (response.status === 401) {
                    handleUnauthorized();
                    throw new Error('Unauthorized');
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

                // Handle errors
                if (!response.ok) {
                    const errorMessage = typeof data === 'object' ? (data.detail || data.error || data.message) : data;
                    const error = new Error(errorMessage || `HTTP ${response.status}: API Request failed`);
                    error.status = response.status;
                    error.data = data;
                    throw error;
                }

                return data;
            }
        } catch (error) {
            console.error('[API] Request failed:', error);
            throw error;
        }
    }

    /**
     * Convenience method: GET request
     * @param {string} endpoint - API endpoint
     * @param {string} baseUrl - Optional base URL override
     * @returns {Promise<any>}
     */
    async function get(endpoint, baseUrl = API_BASE_URL) {
        return apiRequest(endpoint, { method: 'GET' }, baseUrl);
    }

    /**
     * Convenience method: POST request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @param {string} baseUrl - Optional base URL override
     * @returns {Promise<any>}
     */
    async function post(endpoint, data, baseUrl = API_BASE_URL) {
        return apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        }, baseUrl);
    }

    /**
     * Convenience method: PUT request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @param {string} baseUrl - Optional base URL override
     * @returns {Promise<any>}
     */
    async function put(endpoint, data, baseUrl = API_BASE_URL) {
        return apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        }, baseUrl);
    }

    /**
     * Convenience method: DELETE request
     * @param {string} endpoint - API endpoint
     * @param {string} baseUrl - Optional base URL override
     * @returns {Promise<any>}
     */
    async function deleteRequest(endpoint, baseUrl = API_BASE_URL) {
        return apiRequest(endpoint, { method: 'DELETE' }, baseUrl);
    }

    // Export API methods to window
    window.API = {
        request: apiRequest,
        get: get,
        post: post,
        put: put,
        delete: deleteRequest,
        V1: API_BASE_URL,
        V2: API_BASE_URL_V2
    };

    console.log('[API] Helper loaded with Keycloak authentication');
})();
