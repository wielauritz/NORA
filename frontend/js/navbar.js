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
        <nav class="glass-effect shadow-lg fixed pb-2 top-0 left-0 right-0 z-50 w-full" style="padding-top: max(0.5rem, env(safe-area-inset-top)); display: flex; flex-direction: column; justify-content: center;">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
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
                        <button onclick="showGlobalSearch()" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Suche (Strg+K)">
                            <svg class="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </button>

                        <!-- User Profile with Dropdown -->
                        <div class="relative">
                            <button onclick="toggleUserDropdown()" class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-primary/50 transition-all" id="userInitials" title="Profil-Menü">
                            </button>

                            <!-- Dropdown Menu -->
                            <div id="userDropdown" class="hidden absolute right-0 mt-2 w-48 rounded-xl shadow-lg glass-effect dark:bg-slate-800 border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
                                <a href="settings.html" class="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                                    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                    Einstellungen
                                </a>
                                <button onclick="logout()" class="flex items-center w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                    </svg>
                                    Abmelden
                                </button>
                            </div>
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
                <a href="settings.html" class="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activePage === 'settings' ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span class="text-xs font-medium whitespace-nowrap">Einstellungen</span>
                </a>
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
    const minDuration = 300; // Minimum 300ms display time for visibility

    function removeLoader() {
        // Hide the preloader
        const l = document.getElementById('content-loader');
        if (l) {
            l.classList.remove('visible');
        }

        // Show the main content
        const main = document.querySelector('main');
        if (main) {
            main.style.display = 'block';
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
    } else {
        // No preloader was triggered, just show the content directly
        const main = document.querySelector('main');
        if (main) {
            main.style.display = 'block';
        }
    }
}

/**
 * Call this when page content is fully loaded
 */
function pageContentReady() {
    hideContentLoader();
}

/**
 * Toggle user dropdown menu (desktop)
 */
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

/**
 * Close dropdown when clicking outside
 */
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('userDropdown');
    const userInitials = document.getElementById('userInitials');

    if (dropdown && userInitials) {
        // Check if click is outside both the dropdown and the user initials button
        if (!dropdown.contains(event.target) && !userInitials.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    }
});
