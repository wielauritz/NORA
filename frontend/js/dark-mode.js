/**
 * Dark Mode Support
 * Automatically enable dark mode based on system preference
 */

function isDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Add dark class to HTML if dark mode is preferred
if (isDarkMode()) {
    document.documentElement.classList.add('dark');
}

// Listen for system preference changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (e.matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    });
}
