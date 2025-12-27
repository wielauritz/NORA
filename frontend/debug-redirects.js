/**
 * DEBUG SCRIPT - Fängt alle Redirects ab und loggt sie
 * Temporär zum Debugging des login.html Problems
 */

(function() {
    // Intercept window.location assignments
    let originalLocation = window.location;

    Object.defineProperty(window, 'location', {
        get: function() {
            return originalLocation;
        },
        set: function(value) {
            console.error('🔴 REDIRECT DETECTED via window.location =', value);
            console.trace('Stack trace:');
            originalLocation = value;
        }
    });

    // Intercept location.href
    const originalHrefDescriptor = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    Object.defineProperty(Location.prototype, 'href', {
        get: originalHrefDescriptor.get,
        set: function(value) {
            console.error('🔴 REDIRECT DETECTED via location.href =', value);
            console.trace('Stack trace:');
            originalHrefDescriptor.set.call(this, value);
        }
    });

    // Intercept location.replace
    const originalReplace = Location.prototype.replace;
    Location.prototype.replace = function(url) {
        console.error('🔴 REDIRECT DETECTED via location.replace =', url);
        console.trace('Stack trace:');
        return originalReplace.call(this, url);
    };

    // Intercept location.assign
    const originalAssign = Location.prototype.assign;
    Location.prototype.assign = function(url) {
        console.error('🔴 REDIRECT DETECTED via location.assign =', url);
        console.trace('Stack trace:');
        return originalAssign.call(this, url);
    };

    console.log('🔍 Debug-Redirects Script geladen - Alle Redirects werden geloggt');
})();
