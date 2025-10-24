/**
 * NORA - Global Search Functionality
 * Implements universal search across events, exams, rooms, and friends
 */

let searchModal = null;
let searchResults = [];
let searchDebounceTimer = null;

/**
 * Show the global search - navigate to search page on mobile
 */
function showGlobalSearch() {
    // On mobile, navigate to search page
    if (window.innerWidth < 768) {
        window.location.href = 'search.html';
        return;
    }

    // On desktop, show modal
    const modal = `
        <div id="searchModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick="closeSearchModal(event)">
            <div class="glass-effect rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onclick="event.stopPropagation()">

                <!-- Search Header -->
                <div class="p-6 border-b border-gray-200">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-gray-900">Suche</h2>
                        <button onclick="closeSearchModal()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Search Input -->
                    <div class="relative">
                        <svg class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input
                            type="text"
                            id="globalSearchInput"
                            placeholder="Suche nach Events, Klausuren, Räumen oder Freunden..."
                            class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-lg"
                            autocomplete="off"
                            oninput="handleSearchInput(event)"
                        >
                    </div>
                </div>

                <!-- Search Results -->
                <div id="searchResultsContainer" class="p-6 overflow-y-auto" style="max-height: 60vh;">
                    <div class="text-center text-gray-500 py-12">
                        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <p class="text-lg font-medium">Gib einen Suchbegriff ein</p>
                        <p class="text-sm mt-2">Suche nach Veranstaltungen, Klausuren, Räumen oder Freunden</p>
                    </div>
                </div>

                <!-- Loading Indicator -->
                <div id="searchLoadingIndicator" class="hidden p-6 text-center">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p class="mt-2 text-gray-600">Suche läuft...</p>
                </div>

            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('searchModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modal);
    document.body.style.overflow = 'hidden';

    // Focus search input
    setTimeout(() => {
        const input = document.getElementById('globalSearchInput');
        if (input) input.focus();
    }, 100);
}

/**
 * Close the search modal
 */
function closeSearchModal(event) {
    const modal = document.getElementById('searchModal');
    if (!event || event.target === modal || !event.target.closest('.glass-effect')) {
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
            searchResults = [];
        }
    }
}

/**
 * Handle search input with debouncing
 */
function handleSearchInput(event) {
    const query = event.target.value.trim();

    // Clear previous timer
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }

    // Show empty state if query is too short
    if (query.length < 2) {
        showEmptyState();
        return;
    }

    // Show loading
    showSearchLoading();

    // Debounce search (300ms)
    searchDebounceTimer = setTimeout(async () => {
        await performSearch(query);
    }, 300);
}

/**
 * Perform the actual search
 */
async function performSearch(query) {
    try {
        console.log('🔍 Performing search for:', query);

        if (!SearchAPI || typeof SearchAPI.search !== 'function') {
            throw new Error('SearchAPI ist nicht verfügbar. Bitte stelle sicher, dass api-helper.js geladen ist.');
        }

        const response = await SearchAPI.search(query);
        console.log('✅ Search results:', response);

        // Extract results from API response structure
        // API now returns: { timetables: [...], custom_hours: [...], exams: [...], rooms: [...], friends: [...] }
        let results = [];
        if (response && typeof response === 'object') {
            // Flatten all results from all categories into a single array
            if (Array.isArray(response.timetables)) {
                console.log('📋 Timetables found:', response.timetables.length);
                results = results.concat(response.timetables);
            }
            if (Array.isArray(response.custom_hours)) {
                console.log('📋 Custom hours found:', response.custom_hours.length);
                results = results.concat(response.custom_hours);
            }
            if (Array.isArray(response.exams)) {
                console.log('📋 Exams found:', response.exams.length);
                results = results.concat(response.exams);
            }
            if (Array.isArray(response.rooms)) {
                console.log('📋 Rooms found:', response.rooms.length);
                results = results.concat(response.rooms);
            }
            if (Array.isArray(response.friends)) {
                console.log('📋 Friends found:', response.friends.length);
                results = results.concat(response.friends);
            }
        } else if (Array.isArray(response)) {
            // Fallback: if response is already an array
            console.log('📋 Response is array:', response.length);
            results = response;
        }

        console.log('📊 Total results:', results.length, results);
        searchResults = results;
        renderSearchResults(results, query);
    } catch (error) {
        console.error('❌ Search error:', error);
        showSearchError(error.message || 'Fehler bei der Suche. Bitte versuche es erneut.');
    }
}

/**
 * Render search results
 */
function renderSearchResults(results, query) {
    console.log('🎨 Rendering search results:', results);
    const container = document.getElementById('searchResultsContainer');
    const loading = document.getElementById('searchLoadingIndicator');

    console.log('📦 Container:', container, 'Loading:', loading);

    // Hide loading and show container
    loading?.classList.add('hidden');
    container?.classList.remove('hidden');

    if (!results || results.length === 0) {
        console.log('⚠️ No results found');
        container.innerHTML = `
            <div class="text-center text-gray-500 py-12">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-lg font-medium">Keine Ergebnisse gefunden</p>
                <p class="text-sm mt-2">Versuche es mit einem anderen Suchbegriff</p>
            </div>
        `;
        return;
    }

    // Group results by type
    // Note: Backend returns 'event' for timetables and 'custom_hour' for custom hours
    const groupedResults = {
        event: results.filter(r => r.result_type === 'event' || r.result_type === 'custom_hour'),
        exam: results.filter(r => r.result_type === 'exam'),
        room: results.filter(r => r.result_type === 'room'),
        friend: results.filter(r => r.result_type === 'friend')
    };

    console.log('📊 Grouped results:', groupedResults);

    let html = `
        <div class="mb-4">
            <p class="text-sm text-gray-600">
                ${results.length} ${results.length === 1 ? 'Ergebnis' : 'Ergebnisse'} für "<span class="font-semibold">${escapeHtml(query)}</span>"
            </p>
        </div>
    `;

    // Render Events
    if (groupedResults.event.length > 0) {
        html += renderResultSection('Veranstaltungen', groupedResults.event, 'event');
    }

    // Render Exams
    if (groupedResults.exam.length > 0) {
        html += renderResultSection('Klausuren', groupedResults.exam, 'exam');
    }

    // Render Rooms
    if (groupedResults.room.length > 0) {
        html += renderResultSection('Räume', groupedResults.room, 'room');
    }

    // Render Friends
    if (groupedResults.friend.length > 0) {
        html += renderResultSection('Freunde', groupedResults.friend, 'friend');
    }

    container.innerHTML = html;
}

/**
 * Render a section of results
 */
function renderResultSection(title, results, type) {
    const iconMap = {
        event: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>`,
        exam: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`,
        room: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>`,
        friend: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>`
    };

    let html = `
        <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg class="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${iconMap[type]}
                </svg>
                ${title} (${results.length})
            </h3>
            <div class="space-y-2">
    `;

    results.forEach(result => {
        html += renderResultItem(result, type);
    });

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Render a single result item
 */
function renderResultItem(result, type) {
    const timeStr = result.start_time ? formatDateTime(result.start_time) : '';
    const detailsStr = result.details || '';
    const locationStr = result.location || '';

    return `
        <div class="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onclick="handleResultClick('${type}', ${result.id})">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-900 mb-1">${escapeHtml(result.name || '')}</h4>
                    ${detailsStr ? `<p class="text-sm text-gray-600 mb-2">${escapeHtml(detailsStr)}</p>` : ''}
                    <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        ${timeStr ? `
                            <span class="flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                ${timeStr}
                            </span>
                        ` : ''}
                        ${locationStr ? `
                            <span class="flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                </svg>
                                ${escapeHtml(locationStr)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <svg class="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
            </div>
        </div>
    `;
}

/**
 * Handle click on a search result
 */
function handleResultClick(type, id) {
    closeSearchModal();

    switch (type) {
        case 'event':
            // Navigate to schedule page
            window.location.href = 'stundenplan.html';
            break;
        case 'exam':
            // Stay on current page or navigate to dashboard
            window.location.href = 'dashboard.html';
            break;
        case 'room':
            // Navigate to room plan
            window.location.href = 'raumplan.html';
            break;
        case 'friend':
            // Get the friend's zenturie from the result
            const friendResult = searchResults.find(r => r.id === id && r.result_type === 'friend');
            if (friendResult && friendResult.details) {
                // Extract zenturie from details string "Zenturie: I24c"
                const zenturies = friendResult.details.match(/Zenturie: (\w+)/);
                if (zenturies && zenturies[1]) {
                    window.location.href = `stundenplan.html?zenturie=${zenturies[1]}`;
                }
            }
            break;
    }
}

/**
 * Show loading state
 */
function showSearchLoading() {
    const container = document.getElementById('searchResultsContainer');
    const loading = document.getElementById('searchLoadingIndicator');

    if (container) container.classList.add('hidden');
    if (loading) loading.classList.remove('hidden');
}

/**
 * Show empty state
 */
function showEmptyState() {
    const container = document.getElementById('searchResultsContainer');
    const loading = document.getElementById('searchLoadingIndicator');

    if (loading) loading.classList.add('hidden');
    if (container) {
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="text-center text-gray-500 py-12">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <p class="text-lg font-medium">Gib einen Suchbegriff ein</p>
                <p class="text-sm mt-2">Suche nach Veranstaltungen, Klausuren, Räumen oder Freunden</p>
            </div>
        `;
    }
}

/**
 * Show error state
 */
function showSearchError(message) {
    const container = document.getElementById('searchResultsContainer');
    const loading = document.getElementById('searchLoadingIndicator');

    if (loading) loading.classList.add('hidden');
    if (container) {
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="text-center text-red-500 py-12">
                <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-lg font-medium">Fehler bei der Suche</p>
                <p class="text-sm mt-2">${escapeHtml(message)}</p>
            </div>
        `;
    }
}

/**
 * Format date and time
 */
function formatDateTime(isoString) {
    if (!isoString) return '';

    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
        return `Heute, ${timeStr}`;
    } else if (isTomorrow) {
        return `Morgen, ${timeStr}`;
    } else {
        const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${dateStr}, ${timeStr}`;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', function(event) {
    // Close modal with ESC
    if (event.key === 'Escape') {
        closeSearchModal();
    }

    // Open search with Ctrl+K or Cmd+K
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        showGlobalSearch();
    }
});
