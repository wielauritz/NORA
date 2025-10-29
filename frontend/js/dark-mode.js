/**
 * Dark Mode Support
 * Supports user preference from settings (stored in localStorage)
 * Falls back to system preference if no user preference is set
 *
 * Uses both 'dark' and 'light' classes to override system preference
 */

function isDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeOnLoad() {
    const html = document.documentElement;

    // Check for user preference in localStorage (set from settings)
    const userTheme = localStorage.getItem('theme');

    if (userTheme === 'dark') {
        // User explicitly chose dark mode
        html.classList.add('dark');
        html.classList.remove('light');
    } else if (userTheme === 'light') {
        // User explicitly chose light mode - add 'light' class to override system preference
        html.classList.remove('dark');
        html.classList.add('light');
    } else {
        // No user preference or "auto" - use system preference
        html.classList.remove('light'); // Remove explicit light class
        if (isDarkMode()) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }

        // Listen for system preference changes (only if user hasn't set a preference)
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                // Only apply system preference if user hasn't set a theme
                const currentUserTheme = localStorage.getItem('theme');
                if (!currentUserTheme || currentUserTheme === 'auto') {
                    if (e.matches) {
                        html.classList.add('dark');
                    } else {
                        html.classList.remove('dark');
                    }
                }
            });
        }
    }
}

// Apply theme on page load
applyThemeOnLoad();
