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
        <nav class="glass-effect shadow-lg sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">

                    <!-- Logo -->
                    <div class="flex items-center space-x-3">
                        <a href="/dashboard" class="hover:cursor-pointer"><img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" class="h-10"></a>
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

                    <!-- Mobile menu button -->
                    <div class="md:hidden flex items-center">
                        <button onclick="toggleMobileMenu()" class="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Menu">
                            <svg id="hamburger-icon" class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                            <svg id="close-icon" class="w-6 h-6 text-gray-600 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                </div>
            </div>

            <!-- Mobile menu -->
            <div id="mobile-menu" class="hidden md:hidden border-t border-gray-200">
                <div class="px-2 pt-2 pb-3 space-y-1">
                    <a href="dashboard.html" class="block px-3 py-2 rounded-lg ${activePage === 'dashboard' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'} transition-colors">
                        Dashboard
                    </a>
                    <a href="stundenplan.html" class="block px-3 py-2 rounded-lg ${activePage === 'stundenplan' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'} transition-colors">
                        Stundenplan
                    </a>
                    <a href="raumplan.html" class="block px-3 py-2 rounded-lg ${activePage === 'raumplan' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'} transition-colors">
                        Raumplan
                    </a>
                </div>

                <!-- Mobile User Section -->
                <div class="border-t border-gray-200 px-2 py-3 space-y-2">
                    <button onclick="showGlobalSearch(); toggleMobileMenu();" class="w-full flex items-center px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                        <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        Suche
                    </button>
                    <button onclick="logout()" class="w-full flex items-center px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                        <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        Abmelden
                    </button>
                </div>
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
 * Show content preloader
 */
function showContentLoader() {
    const loaderHTML = `
        <div id="content-loader" class="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-40 flex items-center justify-center">
            <div class="text-center">
                <div class="inline-block">
                    <div class="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
                <p class="mt-4 text-gray-600 font-medium">Lädt...</p>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', loaderHTML);
}

/**
 * Hide content preloader
 */
function hideContentLoader() {
    const loader = document.getElementById('content-loader');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.3s ease';
        setTimeout(() => loader.remove(), 300);
    }
}

/**
 * Initialize navbar on page load
 * Call this at the end of each page's script
 */
function initNavbar(pageName) {
    // Show loader first
    showContentLoader();

    // Render navbar
    renderNavbar(pageName);

    // Hide loader after a short delay or when content is ready
    // This will be called by the page's init function
}

/**
 * Call this when page content is fully loaded
 */
function pageContentReady() {
    hideContentLoader();
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const closeIcon = document.getElementById('close-icon');

    if (mobileMenu && hamburgerIcon && closeIcon) {
        // Toggle menu visibility
        mobileMenu.classList.toggle('hidden');

        // Toggle icons
        hamburgerIcon.classList.toggle('hidden');
        closeIcon.classList.toggle('hidden');

        // Prevent body scroll when menu is open
        if (!mobileMenu.classList.contains('hidden')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }
}

/**
 * Close mobile menu when clicking outside
 */
document.addEventListener('click', function(event) {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuButton = event.target.closest('button[onclick="toggleMobileMenu()"]');

    // If menu is open and click is outside menu and button
    if (mobileMenu && !mobileMenu.classList.contains('hidden') && !mobileMenuButton && !mobileMenu.contains(event.target)) {
        toggleMobileMenu();
    }
});
