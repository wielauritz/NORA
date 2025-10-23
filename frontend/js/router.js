/**
 * Simple Client-Side Router
 * Prevents full page reloads - only swaps content
 */

// Map of page names to init functions
const pageInitFunctions = {
    'dashboard': initDashboard,
    'stundenplan': initStundenplan,
    'raumplan': initRaumplan
};

/**
 * Get page name from URL
 */
function getPageNameFromUrl(url) {
    const path = new URL(url).pathname;
    if (path.includes('stundenplan')) return 'stundenplan';
    if (path.includes('raumplan')) return 'raumplan';
    if (path.includes('dashboard')) return 'dashboard';
    return 'dashboard';
}

/**
 * Load page content without full reload
 */
async function loadPageContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            window.location.href = url;
            return;
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract main content from new page
        const newMain = doc.querySelector('main');
        if (!newMain) {
            window.location.href = url;
            return;
        }

        // Replace current main content
        const currentMain = document.querySelector('main');
        if (currentMain) {
            currentMain.innerHTML = newMain.innerHTML;
        }

        // Get page name and update navbar
        const pageName = getPageNameFromUrl(url);
        renderNavbar(pageName);

        // Call appropriate init function
        if (pageInitFunctions[pageName]) {
            await pageInitFunctions[pageName]();
        }

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Update history
        window.history.pushState({ page: pageName }, '', url);
    } catch (error) {
        console.error('Router error:', error);
        window.location.href = url;
    }
}

/**
 * Initialize router
 * Intercept all navigation links
 */
function initRouter() {
    // Intercept link clicks
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');

        // Only handle internal links
        if (!href || href.startsWith('http') || href.startsWith('#') || href === '/') {
            return;
        }

        // Only handle page navigation links
        if (!href.includes('.html') || href.includes('login') || href.includes('verify') || href.includes('password')) {
            return;
        }

        e.preventDefault();
        loadPageContent(href);
    });

    // Handle back/forward buttons
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.page) {
            // Reload the page since state was stored
            window.location.href = window.location.pathname;
        }
    });
}

// Auto-initialize when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initRouter, 100);
    });
} else {
    setTimeout(initRouter, 100);
}
