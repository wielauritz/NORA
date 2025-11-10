/**
 * Content Loader Module for NORA Mobile App
 * Loads HTML content from server with timeout support
 */

const CONFIG = {
    SERVER_URL: 'https://new.nora-nak.de',
    TIMEOUT: 10000, // 10 seconds
    PAGES: {
        LOGIN: 'login.html',
        DASHBOARD: 'dashboard.html',
        STUNDENPLAN: 'stundenplan.html',
        RAUMPLAN: 'raumplan.html',
        KURSE: 'kurse.html',
        KLAUSUREN: 'klausuren.html',
        SEARCH: 'search.html',
        FRIENDS: 'friends.html',
        SETTINGS: 'settings.html'
    }
};

/**
 * Helper: Detect if running in Capacitor native app
 */
function isCapacitorNative() {
    return typeof window !== 'undefined' &&
           typeof window.Capacitor !== 'undefined' &&
           typeof window.Capacitor.isNativePlatform === 'function' &&
           window.Capacitor.isNativePlatform() === true;
}

/**
 * Content Loader class
 */
class ContentLoader {
    constructor() {
        this.container = document.getElementById('app-container');
        this.currentPage = null;
        this.loadedScripts = new Set();
    }

    /**
     * Fetch with timeout support (Capacitor HTTP or browser fetch)
     * @param {string} url - URL to fetch
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Response>}
     */
    async fetchWithTimeout(url, timeout = CONFIG.TIMEOUT) {
        // Use Capacitor HTTP for native apps (bypasses WebView/CORS restrictions)
        if (isCapacitorNative() && window.Capacitor.Plugins?.CapacitorHttp) {
            console.log('[ContentLoader] Using Capacitor HTTP (Native)');

            try {
                const { CapacitorHttp } = window.Capacitor.Plugins;

                const response = await CapacitorHttp.request({
                    url: url,
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    readTimeout: timeout,
                    connectTimeout: timeout
                });

                console.log(`[ContentLoader] Response received (Capacitor):`, {
                    status: response.status,
                    url: url,
                    dataLength: response.data?.length || 0
                });

                // Return a Response-like object for compatibility
                return {
                    ok: response.status >= 200 && response.status < 300,
                    status: response.status,
                    statusText: response.status === 200 ? 'OK' : 'Error',
                    text: async () => response.data,
                    headers: response.headers
                };

            } catch (error) {
                console.error('[ContentLoader] Capacitor HTTP error:', {
                    message: error.message,
                    url: url
                });
                throw error;
            }
        }

        // Fallback to browser fetch
        console.log('[ContentLoader] Using browser fetch');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                credentials: 'omit',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            clearTimeout(timeoutId);

            console.log(`[ContentLoader] Response received (fetch):`, {
                status: response.status,
                statusText: response.statusText,
                type: response.type,
                url: url
            });

            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                const timeoutError = new Error(`Request timeout after ${timeout}ms`);
                console.error('[ContentLoader] Timeout:', url);
                throw timeoutError;
            }
            console.error('[ContentLoader] Fetch error:', {
                message: error.message,
                name: error.name,
                type: error.constructor.name,
                url: url
            });
            throw error;
        }
    }

    /**
     * Load HTML page from server
     * @param {string} page - Page filename (e.g., 'dashboard.html')
     * @returns {Promise<void>}
     */
    async loadPage(page) {
        const url = `${CONFIG.SERVER_URL}/${page}`;
        console.log(`[ContentLoader] Loading page: ${url}`);

        try {
            const response = await this.fetchWithTimeout(url);

            if (!response.ok) {
                const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                console.error(`[ContentLoader] ${errorMsg} for ${page}`);
                throw new Error(errorMsg);
            }

            const html = await response.text();
            console.log(`[ContentLoader] Page loaded successfully: ${page} (${html.length} bytes)`);

            // Inject content
            await this.injectContent(html, page);

            this.currentPage = page;
            return;

        } catch (error) {
            console.error(`[ContentLoader] Failed to load page ${page}:`, {
                message: error.message,
                name: error.name,
                url: url
            });
            throw error;
        }
    }

    /**
     * Inject HTML content into container
     * @param {string} html - HTML content
     * @param {string} page - Page identifier
     */
    async injectContent(html, page) {
        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Set base URL for relative paths BEFORE extracting resources
        // This ensures all relative URLs (css, js, images) resolve to the server
        const baseElement = doc.createElement('base');
        baseElement.href = CONFIG.SERVER_URL + '/';
        const docHead = doc.querySelector('head');
        if (docHead) {
            docHead.insertBefore(baseElement, docHead.firstChild);
            console.log(`[ContentLoader] Set base URL: ${baseElement.href}`);
        }

        // Extract MAIN content only (not bottom navbar!)
        const mainContent = doc.querySelector('main');
        if (!mainContent) {
            console.warn('[ContentLoader] No <main> element found, using body content');
            // Fallback to body content, but remove navbar
            const body = doc.body.cloneNode(true);

            // Remove bottom navbar from loaded content (we have permanent one)
            const bottomNav = body.querySelector('nav[id*="bottom"]');
            if (bottomNav) {
                bottomNav.remove();
                console.log('[ContentLoader] Removed bottom navbar from loaded content');
            }

            this.container.innerHTML = body.innerHTML;
        } else {
            // Use only main content
            this.container.innerHTML = mainContent.outerHTML;
            console.log('[ContentLoader] Extracted <main> content');
        }

        // Extract and load stylesheets
        const stylesheets = doc.querySelectorAll('link[rel="stylesheet"]');
        for (const link of stylesheets) {
            await this.loadStylesheet(link.href);
        }

        // Extract and execute scripts
        const scripts = doc.querySelectorAll('script');
        for (const script of scripts) {
            await this.loadScript(script);
        }

        // Mark container as loaded
        this.container.classList.add('loaded');

        console.log(`[ContentLoader] Content injected for ${page}`);

        // Call pageContentReady callback
        if (typeof window.Shell !== 'undefined' && typeof window.Shell.pageContentReady === 'function') {
            window.Shell.pageContentReady();
        }
    }

    /**
     * Load stylesheet dynamically
     * @param {string} href - Stylesheet URL
     */
    async loadStylesheet(href) {
        // Skip Tailwind and Google Fonts (already in shell)
        if (href.includes('tailwindcss.com') || href.includes('googleapis.com')) {
            return;
        }

        // Fix URL: Remove capacitor://localhost prefix if present
        let url = href;
        if (href.startsWith('capacitor://localhost/')) {
            url = href.replace('capacitor://localhost/', CONFIG.SERVER_URL + '/');
            console.log(`[ContentLoader] Converted capacitor URL: ${href} -> ${url}`);
        } else if (!href.startsWith('http')) {
            // Make URL absolute if still relative
            url = `${CONFIG.SERVER_URL}/${href.replace(/^\//, '')}`;
        }

        // Check if already loaded
        if (document.querySelector(`link[href="${url}"]`)) {
            return;
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = () => {
                console.log(`[ContentLoader] Stylesheet loaded: ${url}`);
                resolve();
            };
            link.onerror = () => {
                console.warn(`[ContentLoader] Failed to load stylesheet: ${url}`);
                resolve(); // Don't reject, continue loading
            };
            document.head.appendChild(link);
        });
    }

    /**
     * Load and execute script
     * @param {HTMLScriptElement} originalScript - Original script element
     */
    async loadScript(originalScript) {
        const src = originalScript.src;
        const content = originalScript.textContent;

        // Skip if already loaded
        if (src && this.loadedScripts.has(src)) {
            console.log(`[ContentLoader] Script already loaded: ${src}`);
            return;
        }

        // Skip Tailwind config and Capacitor (already in shell)
        if (content && (content.includes('tailwind.config') || content.includes('window.isCapacitor'))) {
            return;
        }

        // Skip ONLY shell scripts that are actually loaded from app/js/
        // DO NOT skip server-loaded scripts like persistent-storage.js, api-helper.js, etc.
        const shellScripts = ['storage.js', 'content-loader.js', 'shell.js', 'config.js', 'navbar-utils.js'];
        if (src) {
            const fileName = src.split('/').pop();
            if (shellScripts.includes(fileName)) {
                console.log(`[ContentLoader] Skipping shell script: ${fileName}`);
                return;
            }
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');

            // Copy attributes
            Array.from(originalScript.attributes).forEach(attr => {
                script.setAttribute(attr.name, attr.value);
            });

            if (src) {
                // External script - fix URL
                let url = src;
                if (src.startsWith('capacitor://localhost/')) {
                    url = src.replace('capacitor://localhost/', CONFIG.SERVER_URL + '/');
                    console.log(`[ContentLoader] Converted capacitor URL: ${src} -> ${url}`);
                } else if (!src.startsWith('http')) {
                    url = `${CONFIG.SERVER_URL}/${src.replace(/^\//, '')}`;
                }

                // Add cache-busting timestamp to force fresh load
                const cacheBuster = `?_=${Date.now()}`;
                url = url + cacheBuster;
                console.log(`[ContentLoader] Loading script with cache-buster: ${url}`);

                script.src = url;
                script.onload = () => {
                    console.log(`[ContentLoader] Script loaded: ${src}`);
                    this.loadedScripts.add(src);
                    resolve();
                };
                script.onerror = () => {
                    console.error(`[ContentLoader] Failed to load script: ${src}`);
                    reject(new Error(`Script load failed: ${src}`));
                };
            } else if (content) {
                // Inline script
                script.textContent = content;
                setTimeout(() => resolve(), 0);
            } else {
                resolve();
                return;
            }

            document.body.appendChild(script);
        });
    }

    /**
     * Navigate to a page
     * @param {string} page - Page name from CONFIG.PAGES
     */
    async navigateTo(page) {
        const pageName = CONFIG.PAGES[page.toUpperCase()];
        if (!pageName) {
            throw new Error(`Unknown page: ${page}`);
        }

        await this.loadPage(pageName);
        await window.AppStorage.storeLastPage(pageName);
    }

    /**
     * Clear loaded content
     */
    clear() {
        this.container.innerHTML = '';
        this.container.classList.remove('loaded');
        this.currentPage = null;
        console.log('[ContentLoader] Content cleared');
    }

    /**
     * Get current page
     * @returns {string|null}
     */
    getCurrentPage() {
        return this.currentPage;
    }
}

// Create singleton instance
const contentLoader = new ContentLoader();

// Export for use in other modules
window.ContentLoader = contentLoader;
window.ContentLoaderConfig = CONFIG;
