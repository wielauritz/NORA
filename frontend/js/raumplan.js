/**
 * Raumplan JavaScript
 * Zeigt alle Räume mit deren Belegung
 */

// Check authentication (wrapped in async IIFE)
(async () => {
    if (!(await checkAuth())) {
        // Redirects to login
    }
})();

/**
 * Helper: Format time
 */
function formatTime(timeString) {
    const parts = timeString.split(':');
    return `${parts[0]}:${parts[1]}`;
}

// Global state
let allRooms = [];
let selectedBuilding = 'all';
let todayEvents = [];
let roomOccupancyData = new Map(); // Map<room_number, occupancy_events[]>

/**
 * Initialize raumplan page
 */
async function initRaumplan() {
    // Always show preloader on raumplan load
    if (typeof showContentLoader === 'function') {
        showContentLoader();
    }

    // Load user profile
    await loadUserProfile();

    // Load today's events for room display
    await loadTodayEvents();

    // Update current time info
    updateCurrentTimeInfo();

    // Load all rooms
    await loadAllRooms();

    // Setup building filter
    setupBuildingFilter();

    // Setup map view
    setupMapView();

    // Load room occupancies for today (in background)
    loadRoomOccupanciesForToday().then(() => {
        // Re-render rooms with updated status after occupancies are loaded
        renderRooms();
    }).catch(error => {
        console.error('Error loading room occupancies:', error);
    });
}

/**
 * Setup map view with building/floor selectors
 */
function setupMapView() {
    const buildingSelect = document.getElementById('mapBuildingSelect');
    const floorSelect = document.getElementById('mapFloorSelect');

    if (buildingSelect && floorSelect) {
        buildingSelect.addEventListener('change', () => {
            updateFloorOptions(buildingSelect.value);
            loadFloorPlan(buildingSelect.value, floorSelect.value);
        });

        floorSelect.addEventListener('change', () => {
            loadFloorPlan(buildingSelect.value, floorSelect.value);
        });

        // Initialize floor options and load initial floor plan (Campus overview)
        updateFloorOptions('XX');
        loadFloorPlan('XX', 'X');
    }
}

/**
 * Update floor options based on selected building
 */
function updateFloorOptions(building) {
    const floorSelect = document.getElementById('mapFloorSelect');
    const floorContainer = document.getElementById('floorSelectContainer');

    if (!floorSelect) return;

    if (building === 'XX') {
        // Campus overview: only "Alle"
        floorSelect.innerHTML = '<option value="X">Alle</option>';
        floorContainer.style.display = 'none'; // Hide floor selector for campus view
    } else {
        // Regular buildings: Erdgeschoss and 1. Stock
        floorContainer.style.display = 'block';
        floorSelect.innerHTML = `
            <option value="0">Erdgeschoss</option>
            <option value="1">1. Stock</option>
        `;
    }
}

/**
 * Load floor plan for specific building and floor
 */
async function loadFloorPlan(building, floor) {
    const container = document.getElementById('floorPlanContainer');
    if (!container) return;

    // Show loading state
    const loadingText = building === 'XX' ? 'Campusplan' : `Gebäude ${building}, ${floor === 'X' ? 'Alle Stockwerke' : floor + '. Stock'}`;
    container.innerHTML = `
        <div class="text-center py-12">
            <div class="inline-block p-4 bg-white rounded-lg shadow">
                <div class="spinner mx-auto mb-3"></div>
                <p class="text-gray-600">Lade ${loadingText}...</p>
            </div>
        </div>
    `;

    try {
        // Handle Campus overview (XX)
        if (building === 'XX') {
            const campusUrl = `https://cdn.nora-nak.de/floorplans/XX.png`;
            const imageExists = await checkImageExists(campusUrl);

            if (imageExists) {
                renderFloorPlanWithImage(container, 'Campus', 'Übersicht', [], campusUrl);
            } else {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <div class="inline-block p-4 bg-white rounded-lg shadow">
                            <p class="text-gray-600">Campusplan nicht verfügbar</p>
                        </div>
                    </div>
                `;
            }
            return;
        }

        // Get rooms for this building and floor
        const buildingRooms = allRooms.filter(room => {
            const roomNumber = room.room_number || room.id;
            if (floor === 'X') {
                // All floors: only check building
                return roomNumber.charAt(0) === building;
            } else {
                // Specific floor
                return roomNumber.charAt(0) === building && roomNumber.charAt(1) === floor;
            }
        });

        // Try to load floor plan image
        const floorPlanUrl = `https://cdn.nora-nak.de/floorplans/${building}${floor}.png`;

        // Check if image exists
        const imageExists = await checkImageExists(floorPlanUrl);

        if (imageExists) {
            // Render with image background
            renderFloorPlanWithImage(container, building, floor, buildingRooms, floorPlanUrl);
        } else {
            // Render with generated layout
            renderGeneratedFloorPlan(container, building, floor, buildingRooms);
        }

    } catch (error) {
        console.error('Error loading floor plan:', error);
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="inline-block p-4 bg-white rounded-lg shadow">
                    <p class="text-red-600">Fehler beim Laden des Raumplans</p>
                </div>
            </div>
        `;
    }
}

/**
 * Check if image exists
 */
async function checkImageExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Render floor plan with image background
 */
function renderFloorPlanWithImage(container, building, floor, rooms, imageUrl) {
    // Clear any existing room list first
    const wrapper = document.getElementById('floorPlanWrapper');
    const existingRoomList = wrapper?.querySelector('.room-list-section');
    if (existingRoomList) {
        existingRoomList.remove();
    }

    // Render the floor plan image in desktop container
    container.innerHTML = `
        <div class="relative">
            <img src="${imageUrl}" alt="Raumplan Gebäude ${building}, ${floor}. Stock" class="w-full rounded-lg shadow-lg" id="floorPlanImage">
            <button onclick="window.open('${imageUrl}', '_blank')"
                    class="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-primary">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                <span class="hidden sm:inline">Vollbild</span>
            </button>
        </div>
    `;

    // Render in mobile container
    const mobileContainer = document.querySelector('#floorPlanMobileContainer .floor-plan-mobile-inner');
    if (mobileContainer) {
        mobileContainer.innerHTML = `
            <img src="${imageUrl}" alt="Raumplan Gebäude ${building}, ${floor}. Stock">
            <button onclick="window.open('${imageUrl}', '_blank')"
                    class="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all">
                <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
            </button>
        `;
    }

    // Render room list outside the rotated floor plan container
    if (rooms.length > 0 && wrapper) {
        const roomListHTML = `
            <div class="room-list-section bg-white rounded-lg p-4 shadow-lg">
                <h3 class="font-bold text-gray-900 mb-3">Räume auf diesem Stockwerk</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    ${rooms.map(room => {
                        const roomNumber = room.room_number || room.id;
                        const roomStatus = getRoomStatus(roomNumber);
                        return `
                            <button onclick="showRoomDetails('${roomNumber}')"
                                    class="px-3 py-2 rounded-lg text-sm font-medium transition-colors ${roomStatus.status === 'mine' ? 'bg-gradient-to-r from-primary to-secondary text-white' : roomStatus.status === 'occupied' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}">
                                ${roomNumber}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        // Insert room list at the end of the wrapper (outside the rotated container)
        wrapper.insertAdjacentHTML('beforeend', roomListHTML);
    }
}

/**
 * Render generated floor plan (fallback)
 */
function renderGeneratedFloorPlan(container, building, floor, rooms) {
    container.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-8">
            <div class="text-center mb-6">
                <h3 class="text-2xl font-bold text-gray-900">Gebäude ${building} - ${floor}. Stock</h3>
                <p class="text-gray-600 mt-2">Kein Grundriss verfügbar - Raumliste</p>
            </div>

            ${rooms.length === 0 ? `
                <div class="text-center py-8 text-gray-500">
                    <p>Keine Räume in diesem Stockwerk gefunden</p>
                </div>
            ` : `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${rooms.map(room => {
                        const roomNumber = room.room_number || room.id;
                        const roomStatus = getRoomStatus(roomNumber);
                        const statusClass = `room-${roomStatus.status}`;

                        return `
                            <div class="room-card ${statusClass} rounded-xl p-4 text-white cursor-pointer" onclick="showRoomDetails('${roomNumber}')">
                                <div class="text-xl font-bold mb-2">${roomNumber}</div>
                                <div class="text-xs opacity-90">${roomStatus.status === 'mine' ? 'Dein Kurs' : roomStatus.status === 'occupied' ? 'Belegt' : 'Verfügbar'}</div>
                                ${room.capacity ? `<div class="text-xs opacity-75 mt-2">${room.capacity} Plätze</div>` : ''}
                                <div class="text-xs opacity-75 mt-1">${roomStatus.timeInfo}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
}

/**
 * Get room status (mine, occupied, available) with time info
 */
function getRoomStatus(roomNumber) {
    const now = new Date();

    // Check if this room is in today's events
    const myRoom = todayEvents.find(event =>
        event.location === roomNumber && event.event_type === 'timetable'
    );

    if (myRoom) {
        const startTime = new Date(myRoom.start_time);
        const endTime = new Date(myRoom.end_time);

        // Check if currently in this room
        if (now >= startTime && now <= endTime) {
            return {
                status: 'mine',
                timeInfo: `bis ${formatTime(endTime.toTimeString())}`
            };
        }
    }

    // Check against all room occupancies
    const occupancy = roomOccupancyData.get(roomNumber);
    if (occupancy) {
        for (const event of occupancy) {
            const startTime = new Date(event.start_time);
            const endTime = new Date(event.end_time);

            // Check if room is currently occupied
            if (now >= startTime && now <= endTime) {
                return {
                    status: 'occupied',
                    timeInfo: `bis ${formatTime(endTime.toTimeString())}`
                };
            }
        }

        // Check for next occupancy
        const futureOccupancies = occupancy
            .filter(event => new Date(event.start_time) > now)
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

        if (futureOccupancies.length > 0) {
            const nextEvent = futureOccupancies[0];
            const startTime = new Date(nextEvent.start_time);
            return {
                status: 'available',
                timeInfo: `frei bis ${formatTime(startTime.toTimeString())}`
            };
        }
    }

    return {
        status: 'available',
        timeInfo: 'den ganzen Tag frei'
    };
}

/**
 * Load user profile
 */
async function loadUserProfile() {
    try {
        const userData = await UserAPI.getProfile();

        // Update user initials in avatar
        const avatarEl = document.getElementById('userInitials');
        if (avatarEl && userData.initials) {
            avatarEl.textContent = userData.initials;
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

/**
 * Load today's events
 */
async function loadTodayEvents() {
    try {
        const today = new Date();
        const dateStr = formatDateForAPI(today);

        todayEvents = await ScheduleAPI.getEvents(dateStr);
        console.log('✅ Today events loaded:', todayEvents.length);

        renderMyRoomsToday();
    } catch (error) {
        console.error('Error loading today events:', error);
        todayEvents = [];
        renderMyRoomsToday();
    }
}

/**
 * Load room occupancies for today
 */
async function loadRoomOccupanciesForToday() {
    if (allRooms.length === 0) return;

    console.log('📅 Loading room occupancies for today...');
    const today = new Date();
    const todayStr = formatDateForAPI(today);

    // Load occupancies for all rooms in parallel
    const results = await Promise.allSettled(
        allRooms.map(room => RoomAPI.getRoomDetails(room.room_number || room.id))
    );

    // Process results
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            const roomNumber = allRooms[index].room_number || allRooms[index].id;
            const { occupancy } = result.value;

            // Filter only today's occupancy
            const todayOccupancy = occupancy.filter(event => {
                const eventDate = new Date(event.start_time).toISOString().split('T')[0];
                return eventDate === todayStr;
            });

            roomOccupancyData.set(roomNumber, todayOccupancy);
        }
    });

    console.log('✅ Room occupancies loaded:', roomOccupancyData.size);
}

/**
 * Render my rooms today
 */
function renderMyRoomsToday() {
    const container = document.getElementById('myRoomsTodayContainer');
    if (!container) return;

    // Filter only timetable events with location
    const roomEvents = todayEvents.filter(event =>
        event.event_type === 'timetable' && event.location
    );

    if (roomEvents.length === 0) {
        container.innerHTML = `
            <div class="col-span-3 text-center py-8 text-gray-500">
                <p>Keine Räume für heute gefunden</p>
            </div>
        `;
        return;
    }

    container.innerHTML = roomEvents.map(event => {
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        const timeStr = `${formatTime(startTime.toTimeString())} - ${formatTime(endTime.toTimeString())}`;

        // Extract building and floor from room number
        const roomNumber = event.location;
        const building = roomNumber.charAt(0);
        const floor = roomNumber.charAt(1);

        return `
            <div class="room-card room-mine rounded-xl p-4 text-white" onclick="showRoomDetails('${roomNumber}')">
                <div class="flex items-center justify-between mb-3">
                    <div class="text-2xl font-bold">${roomNumber}</div>
                    <div class="p-2 bg-white/20 rounded-lg">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                    </div>
                </div>
                <div class="space-y-2 text-sm">
                    <div class="flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        ${timeStr}
                    </div>
                    <div class="font-semibold">${event.title}</div>
                    <div class="opacity-90">Gebäude ${building}, ${floor}. Stock</div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Update current time info
 */
function updateCurrentTimeInfo() {
    const container = document.getElementById('currentTimeInfo');
    if (!container) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    // Find next event
    const upcomingEvents = todayEvents
        .filter(event => new Date(event.start_time) > now)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    const nextEvent = upcomingEvents[0];

    if (nextEvent && nextEvent.location) {
        const startTime = new Date(nextEvent.start_time);
        const minutesUntil = Math.round((startTime - now) / 60000);

        container.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="p-3 bg-primary/10 rounded-xl">
                        <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">Aktuell: ${timeStr} Uhr</h3>
                        <p class="text-sm text-gray-600">Dein nächster Kurs beginnt in ${minutesUntil} Minuten</p>
                    </div>
                </div>
                <div class="hidden md:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl cursor-pointer" onclick="showRoomDetails('${nextEvent.location}')">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span class="font-semibold">Nächster Raum: ${nextEvent.location}</span>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="p-3 bg-primary/10 rounded-xl">
                        <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">Aktuell: ${timeStr} Uhr</h3>
                        <p class="text-sm text-gray-600">Keine weiteren Kurse heute</p>
                    </div>
                </div>
            </div>
        `;
    }
}

/**
 * Load all rooms from API
 */
async function loadAllRooms() {
    try {
        showLoadingState();

        allRooms = await RoomAPI.getAllRooms();
        console.log('✅ Rooms loaded:', allRooms.length);

        renderRooms();

    } catch (error) {
        console.error('Error loading rooms:', error);
        handleAPIError(error, 'Fehler beim Laden der Räume');
        hideLoadingState();
    }
}

/**
 * Setup building filter
 */
function setupBuildingFilter() {
    const filterButtons = document.querySelectorAll('[data-building]');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update selected building
            selectedBuilding = button.dataset.building;

            // Re-render rooms
            renderRooms();
        });
    });
}

/**
 * Render rooms
 */
function renderRooms() {
    const container = document.getElementById('roomsGrid');
    if (!container) return;

    // Filter rooms
    let filteredRooms = allRooms;

    // Filter by building
    if (selectedBuilding !== 'all') {
        filteredRooms = filteredRooms.filter(room =>
            room.building === selectedBuilding
        );
    }

    // Sort by room number
    filteredRooms.sort((a, b) => a.room_number.localeCompare(b.room_number));

    // Group by building or floor
    const groupedRooms = {};

    if (selectedBuilding === 'all') {
        // Group by building when "Alle Gebäude" is selected
        filteredRooms.forEach(room => {
            const building = room.building || 'X';
            if (!groupedRooms[building]) {
                groupedRooms[building] = [];
            }
            groupedRooms[building].push(room);
        });
    } else {
        // Group by floor when a specific building is selected
        filteredRooms.forEach(room => {
            const floor = room.floor || '0';
            if (!groupedRooms[floor]) {
                groupedRooms[floor] = [];
            }
            groupedRooms[floor].push(room);
        });
    }

    // Render
    if (filteredRooms.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                <p class="text-gray-600">Keine Räume gefunden</p>
            </div>
        `;
        hideLoadingState();
        return;
    }

    // Render by building or floor
    container.innerHTML = Object.keys(groupedRooms)
        .sort()
        .reverse() // Show higher floors first (or alphabetically for buildings)
        .map(key => {
            const rooms = groupedRooms[key];
            const groupName = selectedBuilding === 'all' ? `Gebäude ${key}` : getFloorName(key);

            return `
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        ${groupName}
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        ${rooms.map(room => renderRoomCard(room)).join('')}
                    </div>
                </div>
            `;
        }).join('');

    hideLoadingState();
}

/**
 * Get floor name
 */
function getFloorName(floor) {
    const floorNum = parseInt(floor);
    if (floorNum === 0) return 'Erdgeschoss';
    if (floorNum === 1) return '1. Etage';
    if (floorNum === 2) return '2. Etage';
    if (floorNum === 3) return '3. Etage';
    if (floorNum === 4) return '4. Etage';
    return `${floorNum}. Etage`;
}

/**
 * Render single room card
 */
function renderRoomCard(room) {
    const roomStatus = getRoomStatus(room.room_number);
    const statusClass = `room-${roomStatus.status}`;
    const statusText = roomStatus.status === 'mine' ? 'Dein Raum' :
                       roomStatus.status === 'occupied' ? 'Belegt' : 'Verfügbar';

    return `
        <div class="room-card ${statusClass} rounded-2xl p-6 text-white shadow-lg" onclick="showRoomDetails('${room.room_number}')">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h4 class="text-2xl font-bold">${room.room_number}</h4>
                    ${room.room_name ? `<p class="text-sm opacity-90 mt-1">${room.room_name}</p>` : ''}
                </div>
                <div class="p-2 bg-white/20 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex items-center text-sm opacity-90">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                    Gebäude ${room.building} • ${getFloorName(room.floor)}
                </div>

                <div class="pt-2 border-t border-white/20">
                    <div class="text-xs font-semibold uppercase opacity-75">${statusText}</div>
                    <div class="flex items-center mt-1">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-sm font-medium">${roomStatus.timeInfo}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show room details with occupancy
 */
async function showRoomDetails(roomNumber) {
    const modal = document.getElementById('roomModal');
    if (!modal) {
        createRoomModal();
        return showRoomDetails(roomNumber);
    }

    const modalContent = document.getElementById('roomModalContent');
    modalContent.innerHTML = `
        <div class="text-center py-8">
            <div class="spinner mx-auto mb-4"></div>
            <p class="text-gray-600">Lade Raum-Details...</p>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
        const roomData = await RoomAPI.getRoomDetails(roomNumber);
        renderRoomModal(roomData);
    } catch (error) {
        console.error('Error loading room details:', error);
        modalContent.innerHTML = `
            <div class="text-center py-8">
                <svg class="w-16 h-16 mx-auto text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-red-600 mb-4">${error.message}</p>
                <button onclick="closeRoomModal()" class="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg">
                    Schließen
                </button>
            </div>
        `;
    }
}

/**
 * Create room modal
 */
function createRoomModal() {
    const modalHTML = `
        <div id="roomModal" class="modal-overlay">
            <div class="modal-content bg-white rounded-3xl w-full max-w-3xl p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl" onclick="event.stopPropagation()">
                <div id="roomModalContent">
                    <!-- Content will be populated -->
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Render room modal content
 */
function renderRoomModal(roomData) {
    const { room, occupancy } = roomData;
    const modalContent = document.getElementById('roomModalContent');

    // Group occupancy by date
    const occupancyByDate = {};
    occupancy.forEach(event => {
        const date = new Date(event.start_time).toISOString().split('T')[0];
        if (!occupancyByDate[date]) {
            occupancyByDate[date] = [];
        }
        occupancyByDate[date].push(event);
    });

    modalContent.innerHTML = `
        <!-- Close Button -->
        <button onclick="closeRoomModal()" class="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>

        <!-- Room Info -->
        <div class="mb-6">
            <h2 class="text-3xl font-bold text-gray-900 mb-2">${room.room_number}</h2>
            ${room.room_name ? `<p class="text-gray-600 text-lg">${room.room_name}</p>` : ''}
            <div class="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                <span class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                    Gebäude ${room.building}
                </span>
                <span class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    ${getFloorName(room.floor)}
                </span>
            </div>
        </div>

        <!-- Occupancy -->
        <div>
            <h3 class="text-xl font-semibold text-gray-900 mb-4">Belegung (nächste 7 Tage)</h3>

            ${occupancy.length === 0 ? `
                <div class="text-center py-8 bg-gray-50 rounded-xl">
                    <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-gray-600">Keine Belegungen in den nächsten 7 Tagen</p>
                </div>
            ` : `
                <div class="space-y-4">
                    ${Object.keys(occupancyByDate).sort().map(date => {
                        const events = occupancyByDate[date];
                        const dateObj = new Date(date);
                        const dateStr = dateObj.toLocaleDateString('de-DE', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });

                        return `
                            <div class="bg-gray-50 rounded-xl p-4">
                                <h4 class="font-semibold text-gray-900 mb-3">${dateStr}</h4>
                                <div class="space-y-2">
                                    ${events.map(event => {
                                        const startTime = new Date(event.start_time);
                                        const endTime = new Date(event.end_time);
                                        const startStr = formatTime(startTime.toTimeString());
                                        const endStr = formatTime(endTime.toTimeString());

                                        const isBlocked = event.event_type === 'custom_hour_blocked';
                                        const bgColor = isBlocked ? 'bg-red-100 border-red-300' : 'bg-blue-100 border-blue-300';
                                        const textColor = isBlocked ? 'text-red-800' : 'text-blue-800';

                                        return `
                                            <div class="flex items-center justify-between p-3 ${bgColor} border rounded-lg">
                                                <div class="flex items-center space-x-3">
                                                    <svg class="w-5 h-5 ${textColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                    </svg>
                                                    <div>
                                                        <p class="font-medium ${textColor}">${startStr} - ${endStr}</p>
                                                        ${event.details ? `
                                                            <p class="text-sm ${textColor} opacity-80">${event.details}</p>
                                                        ` : `
                                                            <p class="text-sm ${textColor} opacity-80">Belegt (privater Termin)</p>
                                                        `}
                                                    </div>
                                                </div>
                                                ${isBlocked ? `
                                                    <span class="text-xs px-2 py-1 bg-red-200 text-red-800 rounded-full">Belegt</span>
                                                ` : `
                                                    <span class="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded-full">Vorlesung</span>
                                                `}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>

        <!-- Actions -->
        <div class="mt-6 flex justify-end">
            <button onclick="closeRoomModal()" class="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors">
                Schließen
            </button>
        </div>
    `;
}

/**
 * Close room modal
 */
function closeRoomModal() {
    const modal = document.getElementById('roomModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Show loading state
 */
function showLoadingState() {
    const container = document.getElementById('roomsGrid');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full flex items-center justify-center py-12">
                <div class="text-center">
                    <div class="spinner mx-auto mb-4"></div>
                    <p class="text-gray-600">Lade Räume...</p>
                </div>
            </div>
        `;
    }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    // Loading is hidden when rooms are rendered
    // Notify navbar that content is ready
    if (typeof pageContentReady === 'function') {
        pageContentReady();
    }
}

/**
 * Helper: Format time
 */
function formatTime(timeString) {
    const parts = timeString.split(':');
    return `${parts[0]}:${parts[1]}`;
}

/**
 * Logout function
 */
function logout() {
    showConfirmDialog('Möchtest du dich wirklich abmelden?', async () => {
        await AuthAPI.logout();
    });
}

// Add spinner CSS if not exists
if (!document.getElementById('spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.textContent = `
        .spinner {
            border: 3px solid rgba(60, 210, 255, 0.1);
            border-radius: 50%;
            border-top: 3px solid #3cd2ff;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Raumplan...');
    initRaumplan();
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('roomModal');
    if (modal && e.target === modal) {
        closeRoomModal();
    }
});
