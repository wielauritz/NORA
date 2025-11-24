/**
 * NORA - Centralized Navbar Component
 * Renders navbar dynamically with preloader
 */

(function() {
// Local reference to storage (exported by storage-manager.js to window.storage)
    const storage = window.storage;

    /**
     * Render navbar
     * @param {string} activePage - Current active page ('dashboard', 'stundenplan', or 'raumplan')
     */
    function renderNavbar(activePage = '') {
        const navbarHTML = `
        <!-- Navigation -->
        <nav class="glass-effect shadow-lg fixed pb-2 top-0 left-0 right-0 z-50 w-full" style="padding-top: max(0.5rem, env(safe-area-inset-top)); display: flex; flex-direction: column; justify-content: center;">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div class="flex justify-between items-center h-12 relative">

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

                        <!-- Friend Requests Notification -->
                        <div class="relative">
                            <button onclick="toggleFriendRequestsDropdown()" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors relative" id="friendRequestsBtn" title="Freundschaftsanfragen">
                                <svg class="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                                <!-- Badge Counter -->
                                <span id="friendRequestsBadge" class="hidden absolute -top-1 -right-1 bg-accent text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"></span>
                            </button>
                        </div>

                        <!-- User Profile -->
                        <div class="relative">
                            <button onclick="toggleUserDropdown()" class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-primary/50 transition-all" id="userInitials" title="Profil-Menü">
                            </button>
                        </div>
                    </div>

                    <!-- Mobile User Menu (Friend Requests + Profile) -->
                    <div class="flex md:hidden items-center space-x-2">
                        <!-- Friend Requests (Mobile) -->
                        <div class="relative">
                            <button onclick="toggleFriendRequestsDropdown()" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors relative" id="friendRequestsBtnMobile" title="Freundschaftsanfragen">
                                <svg class="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                                <!-- Badge Counter (Mobile) -->
                                <span id="friendRequestsBadgeMobile" class="hidden absolute -top-1 -right-1 bg-accent text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"></span>
                            </button>
                        </div>

                        <!-- User Profile (Mobile) -->
                        <div class="relative">
                            <button onclick="toggleUserDropdown()" class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-primary/50 transition-all" id="userInitialsMobile" title="Profil-Menü">
                            </button>
                        </div>
                    </div>

                    <!-- Shared Dropdowns (positioned relative to container) -->
                    <div class="absolute top-full right-0 mt-2 z-50">
                        <!-- Friend Requests Dropdown -->
                        <div id="friendRequestsDropdown" class="hidden absolute right-0 w-96 max-w-[calc(100vw-2rem)] rounded-xl shadow-lg glass-effect dark:bg-slate-800 border border-gray-200 dark:border-slate-700 overflow-hidden max-h-96 overflow-y-auto">
                        <!-- Loading State -->
                        <div id="friendRequestsLoading" class="p-6 text-center">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p class="text-sm text-gray-500 mt-2">Lade Anfragen...</p>
                        </div>

                        <!-- Content -->
                        <div id="friendRequestsContent" class="hidden">
                            <!-- Header -->
                            <div class="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Freundschaftsanfragen</h3>
                                <button onclick="showAddFriendModal(); document.getElementById('friendRequestsDropdown').classList.add('hidden');"
                                        class="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        title="Freundschaftsanfrage senden">
                                    <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                    </svg>
                                </button>
                            </div>

                            <!-- Incoming Requests -->
                            <div id="incomingRequestsSection">
                                <div class="px-4 py-2 bg-gray-50 dark:bg-slate-700/50">
                                    <h4 class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Eingehende Anfragen</h4>
                                </div>
                                <div id="incomingRequestsList"></div>
                            </div>

                            <!-- Outgoing Requests -->
                            <div id="outgoingRequestsSection" class="border-t border-gray-200 dark:border-slate-700">
                                <div class="px-4 py-2 bg-gray-50 dark:bg-slate-700/50">
                                    <h4 class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Gesendete Anfragen</h4>
                                </div>
                                <div id="outgoingRequestsList"></div>
                            </div>
                        </div>
                    </div>

                        <!-- User Dropdown Menu -->
                        <div id="userDropdown" class="hidden absolute right-0 w-48 rounded-xl shadow-lg glass-effect dark:bg-slate-800 border border-gray-200 dark:border-slate-700 overflow-hidden">
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
     * Close dropdowns when clicking outside
     */
    document.addEventListener('click', function(event) {
        const userDropdown = document.getElementById('userDropdown');
        const userInitials = document.getElementById('userInitials');
        const userInitialsMobile = document.getElementById('userInitialsMobile');
        const friendRequestsDropdown = document.getElementById('friendRequestsDropdown');
        const friendRequestsBtn = document.getElementById('friendRequestsBtn');
        const friendRequestsBtnMobile = document.getElementById('friendRequestsBtnMobile');

        // Close user dropdown if clicking outside
        if (userDropdown && (userInitials || userInitialsMobile)) {
            const clickedOnDesktop = userInitials && userInitials.contains(event.target);
            const clickedOnMobile = userInitialsMobile && userInitialsMobile.contains(event.target);

            if (!userDropdown.contains(event.target) && !clickedOnDesktop && !clickedOnMobile) {
                userDropdown.classList.add('hidden');
            }
        }

        // Close friend requests dropdown if clicking outside
        if (friendRequestsDropdown && (friendRequestsBtn || friendRequestsBtnMobile)) {
            const clickedOnDesktop = friendRequestsBtn && friendRequestsBtn.contains(event.target);
            const clickedOnMobile = friendRequestsBtnMobile && friendRequestsBtnMobile.contains(event.target);

            if (!friendRequestsDropdown.contains(event.target) && !clickedOnDesktop && !clickedOnMobile) {
                friendRequestsDropdown.classList.add('hidden');
            }
        }
    });

    /**
     * Friend Requests Management
     */

// Global state for friend requests
    let friendRequestsData = { incoming: [], outgoing: [] };
    let friendRequestsPollingInterval = null;

    /**
     * Toggle friend requests dropdown
     */
    async function toggleFriendRequestsDropdown() {
        const dropdown = document.getElementById('friendRequestsDropdown');
        if (!dropdown) return;

        const isHidden = dropdown.classList.contains('hidden');

        if (isHidden) {
            // Show dropdown and load requests
            dropdown.classList.remove('hidden');
            await loadFriendRequests();
        } else {
            // Hide dropdown
            dropdown.classList.add('hidden');
        }
    }

    /**
     * Load friend requests from API
     */
    async function loadFriendRequests() {
        const loadingEl = document.getElementById('friendRequestsLoading');
        const contentEl = document.getElementById('friendRequestsContent');

        if (!loadingEl || !contentEl) return;

        try {
            // Show loading state
            loadingEl.classList.remove('hidden');
            contentEl.classList.add('hidden');

            // Fetch requests
            const data = await FriendsAPI.getRequests();
            friendRequestsData = data;

            // Render requests
            renderFriendRequests();

            // Update badge
            updateFriendRequestsBadge();

            // Hide loading, show content
            loadingEl.classList.add('hidden');
            contentEl.classList.remove('hidden');

        } catch (error) {
            console.error('Error loading friend requests:', error);

            // Show error message
            loadingEl.innerHTML = `
            <div class="p-6 text-center">
                <svg class="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-sm text-gray-600 dark:text-gray-400">Fehler beim Laden der Anfragen</p>
                <button onclick="loadFriendRequests()" class="mt-3 text-sm text-primary hover:text-secondary font-medium">
                    Erneut versuchen
                </button>
            </div>
        `;
        }
    }

    /**
     * Render friend requests in dropdown
     */
    function renderFriendRequests() {
        const incomingList = document.getElementById('incomingRequestsList');
        const outgoingList = document.getElementById('outgoingRequestsList');

        if (!incomingList || !outgoingList) return;

        // Render incoming requests
        if (friendRequestsData.incoming && friendRequestsData.incoming.length > 0) {
            incomingList.innerHTML = friendRequestsData.incoming.map(request => {
                const initials = request.initials || '??';
                const fullName = `${request.first_name || ''} ${request.last_name || ''}`.trim() || 'Unbekannt';
                const zenturie = request.zenturie || 'Keine Zenturie';

                return `
                <div class="p-4 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3 flex-1 min-w-0">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                ${initials}
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${fullName}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${zenturie}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 flex-shrink-0 ml-3">
                            <button onclick="acceptFriendRequest(${request.id})" class="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors" title="Annehmen">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                            </button>
                            <button onclick="rejectFriendRequest(${request.id})" class="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors" title="Ablehnen">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        } else {
            incomingList.innerHTML = `
            <div class="p-6 text-center text-gray-500 dark:text-gray-400">
                <p class="text-sm">Du hast keine eingehenden Anfragen</p>
            </div>
        `;
        }

        // Render outgoing requests
        if (friendRequestsData.outgoing && friendRequestsData.outgoing.length > 0) {
            outgoingList.innerHTML = friendRequestsData.outgoing.map(request => {
                const initials = request.initials || '??';
                const fullName = `${request.first_name || ''} ${request.last_name || ''}`.trim() || 'Unbekannt';
                const zenturie = request.zenturie || 'Keine Zenturie';

                return `
                <div class="p-4 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3 flex-1 min-w-0">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                ${initials}
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${fullName}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${zenturie}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 flex-shrink-0 ml-3">
                            <span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">Ausstehend</span>
                            <button onclick="cancelFriendRequest(${request.id})" class="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors" title="Abbrechen">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        } else {
            outgoingList.innerHTML = `
            <div class="p-6 text-center text-gray-500 dark:text-gray-400">
                <p class="text-sm">Du hast keine gesendeten Anfragen</p>
            </div>
        `;
        }
    }

    /**
     * Update friend requests badge count (Desktop + Mobile)
     */
    function updateFriendRequestsBadge() {
        const badgeDesktop = document.getElementById('friendRequestsBadge');
        const badgeMobile = document.getElementById('friendRequestsBadgeMobile');

        const incomingCount = friendRequestsData.incoming ? friendRequestsData.incoming.length : 0;
        const badgeText = incomingCount > 9 ? '9+' : incomingCount;

        // Update Desktop Badge
        if (badgeDesktop) {
            if (incomingCount > 0) {
                badgeDesktop.textContent = badgeText;
                badgeDesktop.classList.remove('hidden');
            } else {
                badgeDesktop.classList.add('hidden');
            }
        }

        // Update Mobile Badge
        if (badgeMobile) {
            if (incomingCount > 0) {
                badgeMobile.textContent = badgeText;
                badgeMobile.classList.remove('hidden');
            } else {
                badgeMobile.classList.add('hidden');
            }
        }
    }

    /**
     * Accept friend request
     */
    async function acceptFriendRequest(requestId) {
        try {
            const result = await FriendsAPI.acceptRequest(requestId);

            // Show success toast
            if (typeof showToast === 'function') {
                showToast(result.message || 'Freundschaftsanfrage angenommen!', 'success');
            }

            // Reload requests
            await loadFriendRequests();

            // Reload friends list if on dashboard
            if (typeof loadFriends === 'function') {
                await loadFriends();
            }

        } catch (error) {
            console.error('Error accepting friend request:', error);
            if (typeof showToast === 'function') {
                showToast(error.message || 'Fehler beim Annehmen der Anfrage', 'error');
            }
        }
    }

    /**
     * Reject friend request
     */
    async function rejectFriendRequest(requestId) {
        try {
            const result = await FriendsAPI.rejectRequest(requestId);

            // Show success toast
            if (typeof showToast === 'function') {
                showToast(result.message || 'Freundschaftsanfrage abgelehnt', 'success');
            }

            // Reload requests
            await loadFriendRequests();

        } catch (error) {
            console.error('Error rejecting friend request:', error);
            if (typeof showToast === 'function') {
                showToast(error.message || 'Fehler beim Ablehnen der Anfrage', 'error');
            }
        }
    }

    /**
     * Cancel outgoing friend request
     */
    async function cancelFriendRequest(requestId) {
        try {
            const result = await FriendsAPI.cancelRequest(requestId);

            // Show success toast
            if (typeof showToast === 'function') {
                showToast(result.message || 'Anfrage abgebrochen', 'success');
            }

            // Reload requests
            await loadFriendRequests();

        } catch (error) {
            console.error('Error cancelling friend request:', error);
            if (typeof showToast === 'function') {
                showToast(error.message || 'Fehler beim Abbrechen der Anfrage', 'error');
            }
        }
    }

    /**
     * Start polling for friend requests
     */
    function startFriendRequestsPolling() {
        // Only poll if user is authenticated
        if (!storage.getItem('token')) return;

        // Initial load
        updateFriendRequestsBadge();

        // Load requests in background (don't show dropdown)
        (async () => {
            try {
                const data = await FriendsAPI.getRequests();
                friendRequestsData = data;
                updateFriendRequestsBadge();
            } catch (error) {
                console.error('Error polling friend requests:', error);
            }
        })();

        // Clear existing interval if any
        if (friendRequestsPollingInterval) {
            clearInterval(friendRequestsPollingInterval);
        }

        // Poll every 30 seconds
        friendRequestsPollingInterval = setInterval(async () => {
            try {
                const data = await FriendsAPI.getRequests();
                const previousIncomingCount = friendRequestsData.incoming ? friendRequestsData.incoming.length : 0;
                const newIncomingCount = data.incoming ? data.incoming.length : 0;

                friendRequestsData = data;
                updateFriendRequestsBadge();

                // Show toast if new incoming request
                if (newIncomingCount > previousIncomingCount && typeof showToast === 'function') {
                    showToast('Du hast eine neue Freundschaftsanfrage erhalten!', 'info');
                }
            } catch (error) {
                console.error('Error polling friend requests:', error);
            }
        }, 30000); // 30 seconds
    }

    /**
     * Stop polling for friend requests
     */
    function stopFriendRequestsPolling() {
        if (friendRequestsPollingInterval) {
            clearInterval(friendRequestsPollingInterval);
            friendRequestsPollingInterval = null;
        }
    }

    /**
     * Set user initials in navbar (Desktop + Mobile)
     * @param {string} initials - User initials (e.g., "AB")
     */
    function setUserInitials(initials) {
        // This function exists in BOTH navbar.js (for browser) and navbar-utils.js (for app)
        // In the app, navbar-utils.js loads FIRST and sets window.setUserInitials
        // In the browser, this version will be used
        const avatarDesktop = document.getElementById('userInitials');
        const avatarMobile = document.getElementById('userInitialsMobile');

        if (avatarDesktop) {
            avatarDesktop.textContent = initials;
        }

        if (avatarMobile) {
            avatarMobile.textContent = initials;
        }

        console.log('[Navbar] User initials set to:', initials);
    }

// Initialize polling when navbar is loaded
    if (typeof storage !== 'undefined' && storage.getItem('token')) {
        // Start polling after a short delay to allow page to load
        setTimeout(() => {
            startFriendRequestsPolling();
        }, 1000);
    }

// Export navbar functions to window for global access
    window.renderNavbar = renderNavbar;
    window.showContentLoader = showContentLoader;
    window.hideContentLoader = hideContentLoader;
    window.initNavbar = initNavbar;
    window.attachNavbarPreloaderHandlers = attachNavbarPreloaderHandlers;
    window.restorePreloaderIfNeeded = restorePreloaderIfNeeded;
    window.pageContentReady = pageContentReady;
    window.toggleUserDropdown = toggleUserDropdown;
    window.toggleFriendRequestsDropdown = toggleFriendRequestsDropdown;
    window.loadFriendRequests = loadFriendRequests;
    window.renderFriendRequests = renderFriendRequests;
    window.updateFriendRequestsBadge = updateFriendRequestsBadge;
    window.acceptFriendRequest = acceptFriendRequest;
    window.rejectFriendRequest = rejectFriendRequest;
    window.cancelFriendRequest = cancelFriendRequest;
    window.startFriendRequestsPolling = startFriendRequestsPolling;
    window.stopFriendRequestsPolling = stopFriendRequestsPolling;
    window.setUserInitials = setUserInitials;
    console.log('[Navbar] Functions exported to window');
})();