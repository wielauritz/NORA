/**
 * Auth Guard - Protect pages from unauthorized access
 * Include this script on any page that requires authentication
 */

(async function() {
    console.log('[AuthGuard] Checking authentication');

    try {
        // Initialize Keycloak
        const authenticated = await KeycloakAuth.init();

        if (!authenticated) {
            console.log('[AuthGuard] Not authenticated, redirecting to login');
            window.location.replace('login.html');
            return;
        }

        console.log('[AuthGuard] Authentication successful');

    } catch (error) {
        console.error('[AuthGuard] Auth check failed:', error);
        window.location.replace('login.html');
    }
})();
