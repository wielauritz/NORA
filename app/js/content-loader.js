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

        // Add global error handler to catch script execution errors
        window.addEventListener('error', (event) => {
            console.error('[ContentLoader] Global error caught:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });
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

        // Extract page name once for use throughout the function
        const pageName = page.replace('.html', '');

        // Set base URL for relative paths BEFORE extracting resources
        // This ensures all relative URLs (css, js, images) resolve to the server
        const baseElement = doc.createElement('base');
        baseElement.href = CONFIG.SERVER_URL + '/';
        const docHead = doc.querySelector('head');
        if (docHead) {
            docHead.insertBefore(baseElement, docHead.firstChild);
            console.log(`[ContentLoader] Set base URL: ${baseElement.href}`);
        }

        // Extract all <style> blocks from the loaded HTML (both <head> and <body>)
        // This captures styles that are outside <main> which would otherwise be lost
        const allStyles = doc.querySelectorAll('style');
        const stylesToInject = [];
        allStyles.forEach((styleEl, index) => {
            // Clone the style element to preserve attributes (id, class, etc.)
            const clonedStyle = styleEl.cloneNode(true);

            // CRITICAL: Assign generated ID if style doesn't have one
            // This prevents style accumulation on navigation
            if (!clonedStyle.id) {
                clonedStyle.id = `${pageName}-style-${index}`;
                console.log(`[ContentLoader] Assigned generated ID: ${clonedStyle.id}`);
            }

            stylesToInject.push(clonedStyle);
        });
        console.log(`[ContentLoader] Extracted ${stylesToInject.length} style blocks`);

        // Extract body-level elements (toasts, modals, etc.) that are outside <main>
        // but need to be present in the app (e.g., toast notifications)
        const bodyLevelElements = doc.querySelectorAll('body > div[id], body > aside[id], body > nav[id]');
        const elementsToInject = [];
        bodyLevelElements.forEach(el => {
            // Skip main element, navbar placeholders, shell navbars, and elements that already exist
            const skipIds = ['navbar-placeholder', 'content-loader', 'top-navbar', 'bottom-navbar'];
            if (el.tagName !== 'MAIN' && !skipIds.includes(el.id) && !document.getElementById(el.id)) {
                elementsToInject.push(el.cloneNode(true));
            }
        });
        console.log(`[ContentLoader] Extracted ${elementsToInject.length} body-level elements`);

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

        // Inject all extracted <style> blocks into document head
        // This ensures styles defined outside <main> are not lost
        stylesToInject.forEach(style => {
            // Check if style with same id already exists (to avoid duplicates on navigation)
            if (style.id && document.getElementById(style.id)) {
                // Replace existing style with new one
                const existingStyle = document.getElementById(style.id);
                existingStyle.replaceWith(style);
                console.log(`[ContentLoader] Replaced existing style: ${style.id}`);
            } else {
                // Append new style to head
                document.head.appendChild(style);
                console.log(`[ContentLoader] Injected style block${style.id ? ` (id: ${style.id})` : ''}`);
            }
        });

        // Inject body-level elements (toasts, modals, etc.)
        // These are elements that need to exist at body level for proper positioning/functionality
        elementsToInject.forEach(el => {
            document.body.appendChild(el);
            console.log(`[ContentLoader] Injected body-level element: ${el.tagName}#${el.id}`);
        });

        // Clear any form initialization flags from previous page loads
        if (document.body.dataset.formInitialized) {
            delete document.body.dataset.formInitialized;
            console.log('[ContentLoader] Cleared form initialization flag');
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

        // Fire custom event for page re-initialization
        // This allows dynamically loaded scripts to re-initialize even if already loaded
        const event = new CustomEvent('nora:pageLoaded', {
            detail: { page: pageName }
        });
        window.dispatchEvent(event);
        console.log(`[ContentLoader] Fired pageLoaded event for: ${pageName}`);

        // REMOVED: Automatic pageContentReady call
        // Pages should call pageContentReady() themselves when their async initialization completes
        // This prevents the loader from hiding before data is loaded
        // Old code:
        // if (typeof window.Shell !== 'undefined' && typeof window.Shell.pageContentReady === 'function') {
        //     window.Shell.pageContentReady();
        // }
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

                // Fetch script content as text and inject inline to avoid CORS issues
                this.fetchWithTimeout(url).then(async (response) => {
                    if (!response.ok) {
                        console.error(`[ContentLoader] Failed to fetch script: ${src} (${response.status})`);
                        reject(new Error(`Script fetch failed: ${src}`));
                        return;
                    }

                    const scriptContent = await response.text();

                    // Create a new script element for inline execution
                    const inlineScript = document.createElement('script');
                    inlineScript.type = 'text/javascript';

                    // Wrap in try-catch to catch execution errors
                    const wrappedContent = `
                        try {
                            ${scriptContent}
                        } catch (error) {
                            console.error('[ContentLoader] Script execution error in ${src}:', error);
                            throw error;
                        }
                    `;

                    inlineScript.textContent = wrappedContent;
                    console.log(`[ContentLoader] Script loaded and injected: ${src}`);
                    this.loadedScripts.add(src);

                    // Append to execute
                    document.body.appendChild(inlineScript);

                    // Small delay to ensure execution completes
                    setTimeout(() => resolve(), 50);
                }).catch(error => {
                    console.error(`[ContentLoader] Error fetching script ${src}:`, error);
                    reject(error);
                });

                // Don't append script here - it's done in the then() after content is set
                return;
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
