/**
 * NORA - Centralized Navbar Component
 * Renders navbar dynamically with preloader
 */

/**
 * Render navbar
 * @param {string} activePage - Current active page ('dashboard', 'stundenplan', or 'raumplan')
 */
function renderNavbar(activePage = '') {
    const navbarHTML = `
        <!-- Navigation -->
        <nav class="glass-effect shadow-lg fixed top-0 left-0 right-0 z-50 w-full" style="padding-top: max(0.5rem, env(safe-area-inset-top));">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-12">

                    <!-- Logo -->
                    <div class="flex items-center space-x-3">
                        <a href="/dashboard" class="hover:cursor-pointer"><img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" class="h-8"></a>
                    </div>

                    <!-- Desktop Navigation Links -->
                    <div class="hidden md:flex items-center space-x-1">
                        <a href="dashboard.html" class="px-4 py-2 rounded-lg ${activePage === 'dashboard' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'} transition-colors">
                            Dashboard
                        </a>
                        <a href="stundenplan.html" class="px-4 py-2 rounded-lg ${activePage === 'stundenplan' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'} transition-colors">
                            Stundenplan
                        </a>
                        <a href="raumplan.html" class="px-4 py-2 rounded-lg ${activePage === 'raumplan' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'} transition-colors">
                            Raumplan
                        </a>
                    </div>

                    <!-- Desktop User Menu -->
                    <div class="hidden md:flex items-center space-x-4">
                        <!-- Search -->
                        <button onclick="showGlobalSearch()" class="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Suche (Strg+K)">
                            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </button>

                        <!-- User Profile -->
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold" id="userInitials">

                            </div>
                            <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors" onclick="logout()" title="Logout">
                                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </nav>

        <!-- Bottom Navigation Bar (Mobile only) -->
        <nav class="fixed md:hidden bottom-0 left-0 right-0 glass-effect border-t border-gray-200 z-50" style="padding-bottom: calc(env(safe-area-inset-bottom) * 0.25);">
            <div class="flex items-stretch w-full">
                <a href="dashboard.html" class="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activePage === 'dashboard' ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}">
                    <svg class="w-6 h-6" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5,10 L5,19 C5,19.5523 5.44772,20 6,20 L18,20 C18.5523,20 19,19.5523 19,19 L19,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"></path>
                        <path d="M21,11 L12.307,4.23875 C12.1264,4.09832 11.8736,4.09832 11.693,4.23875 L3,11" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"></path>
                    </svg>
                    <span class="text-xs font-medium whitespace-nowrap">Start</span>
                </a>
                <a href="stundenplan.html" class="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activePage === 'stundenplan' ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span class="text-xs font-medium whitespace-nowrap">Stundenplan</span>
                </a>
                <a href="raumplan.html" class="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activePage === 'raumplan' ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4 0h1m-1 4h1"/>
                    </svg>
                    <span class="text-xs font-medium whitespace-nowrap">Raumplan</span>
                </a>
                <button onclick="showGlobalSearch()" class="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activePage === 'search' ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <span class="text-xs font-medium whitespace-nowrap">Suche</span>
                </button>
                <button onclick="logout()" class="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-gray-600 hover:text-red-600 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    <span class="text-xs font-medium whitespace-nowrap">Logout</span>
                </button>
            </div>
        </nav>
    `;

    // Insert navbar at the beginning of body
    const navPlaceholder = document.getElementById('navbar-placeholder');
    if (navPlaceholder) {
        navPlaceholder.innerHTML = navbarHTML;
    } else {
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    }
}

/**
 * Show content preloader (behind navbar) - hidden by default to prevent layout shift
 */
function showContentLoader() {
    const loader = document.getElementById('content-loader');
    if (!loader) return;

    // Add visible class to show preloader (CSS already handles display)
    loader.classList.add('visible');

    // Store the time when loader was shown using sessionStorage (persists across page navigations)
    sessionStorage.setItem('loaderShowTime', Date.now().toString());
}

/**
 * Hide content preloader with minimum display duration
 */
function hideContentLoader() {
    const loader = document.getElementById('content-loader');
    if (!loader) return;

    // Get the time from sessionStorage (set when preloader was shown)
    const showTimeStr = sessionStorage.getItem('loaderShowTime');
    const showTime = showTimeStr ? parseInt(showTimeStr) : Date.now();
    const elapsed = Date.now() - showTime;
    const minDuration = 800; // Minimum 800ms display time for visibility

    function removeLoader() {
        // Just remove the visible class to hide the preloader
        const l = document.getElementById('content-loader');
        if (l) {
            l.classList.remove('visible');
        }

        // Clear the sessionStorage timestamp
        sessionStorage.removeItem('loaderShowTime');
    }

    if (elapsed < minDuration) {
        // Wait for minimum duration before hiding
        setTimeout(removeLoader, minDuration - elapsed);
    } else {
        // Already displayed long enough, hide immediately
        removeLoader();
    }
}

/**
 * Initialize navbar on page load
 * Call this at the end of each page's script
 */
function initNavbar(pageName) {
    // Render navbar
    renderNavbar(pageName);

    // Attach preloader handlers to tab navigation links
    attachNavbarPreloaderHandlers();

    // Hide loader after a short delay or when content is ready
    // This will be called by the page's init function
}

/**
 * Attach preloader handlers to navbar links
 * Shows preloader when navigating between tabs
 */
function attachNavbarPreloaderHandlers() {
    // Get all navbar links (desktop and mobile) that navigate to pages
    // Exclude logo by checking href contains a page name
    const navLinks = document.querySelectorAll('nav a[href$=".html"]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Show preloader when navigating to dashboard, stundenplan, raumplan, or search
            const href = link.getAttribute('href');
            if (href.includes('dashboard.html') ||
                href.includes('stundenplan.html') ||
                href.includes('raumplan.html') ||
                href.includes('search.html')) {
                showContentLoader();
            }
        });
    });
}

/**
 * Check if preloader should be shown on page load
 * Call this at the beginning of each page's script
 */
function restorePreloaderIfNeeded() {
    // If a preloader was triggered (sessionStorage has loaderShowTime), show it
    const loaderShowTime = sessionStorage.getItem('loaderShowTime');
    if (loaderShowTime) {
        showContentLoader();
    }
}

/**
 * Call this when page content is fully loaded
 */
function pageContentReady() {
    hideContentLoader();
}

// Mobile menu functions are no longer needed with bottom navigation bar
