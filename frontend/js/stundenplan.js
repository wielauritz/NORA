/**
 * Stundenplan JavaScript
 * Zeigt wöchentlichen Stundenplan mit Events vom NORA Backend
 */

// Check authentication (wrapped in async IIFE)
(async () => {
    if (!(await checkAuth())) {
        // Redirects to login
    }
})();

// Global state
let currentDate = new Date();
let currentWeekStart = null;
let currentMonth = new Date();
let currentYear = new Date();
let weekEvents = {}; // Events organized by date
let viewingFriend = null; // If viewing a friend's schedule
let showWeekends = false; // Show weekends toggle
let viewMode = 'week'; // 'week', 'month', or 'year'
let currentDayOffset = 0; // For mobile single-day view navigation (offset from week start)

// Initialization guards to prevent double initialization
let isInitializing = false;
let isInitialized = false;

/**
 * Get number of days to show based on screen size
 */
function getDaysToShow() {
    if (window.innerWidth <= 480) {
        return 1; // Mobile: Single day view
    } else if (window.innerWidth <= 640) {
        return 2; // Small mobile: 2 days
    } else if (window.innerWidth <= 768) {
        return 3; // Tablet: 3 days
    } else if (window.innerWidth <= 1024) {
        return 4; // Small desktop: 4 days
    } else {
        return showWeekends ? 7 : 5; // Desktop: 5 or 7 days
    }
}

/**
 * Initialize stundenplan page
 */
async function initStundenplan() {
    // Prevent double initialization
    if (isInitializing) {
        console.log('⏭️ [Stundenplan] Already initializing, skipping...');
        return;
    }

    if (isInitialized) {
        console.log('🔄 [Stundenplan] Already initialized, re-loading view only...');
        await loadCurrentView();
        return;
    }

    isInitializing = true;
    console.log('🚀 [Stundenplan] Starting initialization...');

    try {
        // Always show preloader on stundenplan load
        if (typeof showContentLoader === 'function') {
            showContentLoader();
        }

    // Load user profile data
    await loadUserProfile();

    // Check if viewing friend's schedule
    const urlParams = new URLSearchParams(window.location.search);
    const zenturie = urlParams.get('zenturie');

    if (zenturie) {
        viewingFriend = zenturie;
        updatePageTitle(`Stundenplan - ${zenturie}`);
    }

    // Setup navigation and controls
    setupNavigation();

    // Setup view mode switcher
    setupViewModeSwitcher();

    // Setup weekend toggle
    setupWeekendToggle();

    // Calculate current week start (Monday)
    currentWeekStart = getWeekStart(currentDate);

    // Initialize day offset for mobile view (start at today)
    const today = new Date();
    const dayOfWeek = today.getDay();
    currentDayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0, Sunday = 6

        // Load initial view
        await loadCurrentView();

        // Setup add event buttons (only if not viewing friend)
        if (!viewingFriend) {
            setupAddEventButtons();
        }

        isInitialized = true;
        console.log('✅ [Stundenplan] Initialization complete');
    } finally {
        isInitializing = false;
    }
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
 * Setup weekend toggle
 */
function setupWeekendToggle() {
    const toggle = document.getElementById('showWeekends');
    if (toggle) {
        // Load saved preference
        const savedPreference = localStorage.getItem('showWeekends');
        if (savedPreference === 'true') {
            showWeekends = true;
            toggle.checked = true;
        }

        toggle.addEventListener('change', (e) => {
            showWeekends = e.target.checked;
            localStorage.setItem('showWeekends', showWeekends.toString());
            if (viewMode === 'week') {
                loadWeekSchedule(); // Reload to update grid
            } else if (viewMode === 'month') {
                loadMonthView(); // Reload month view
            }
        });
    }
}

/**
 * Get Monday of the week for a given date
 */
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

/**
 * Setup navigation buttons
 */
function setupNavigation() {
    const prevBtn = document.getElementById('prevPeriod');
    const nextBtn = document.getElementById('nextPeriod');
    const todayBtn = document.getElementById('todayBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', navigatePrevious);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', navigateNext);
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', goToToday);
    }
}

/**
 * Navigate to previous period (week/month/year or day on mobile)
 */
function navigatePrevious() {
    if (viewMode === 'week') {
        const daysToShow = getDaysToShow();

        if (daysToShow === 1) {
            // Mobile: Navigate one day back
            currentDayOffset--;

            // If we go before the week start, move to previous week
            if (currentDayOffset < 0) {
                currentDate.setDate(currentDate.getDate() - 7);
                currentWeekStart = getWeekStart(currentDate);
                currentDayOffset = 6; // Last day of previous week
            }
        } else {
            // Desktop/Tablet: Navigate one week back
            currentDate.setDate(currentDate.getDate() - 7);
            currentWeekStart = getWeekStart(currentDate);
            currentDayOffset = 0;
        }
    } else if (viewMode === 'month') {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        currentDate = new Date(currentMonth);
    } else if (viewMode === 'year') {
        currentYear.setFullYear(currentYear.getFullYear() - 1);
        currentDate = new Date(currentYear);
    }
    loadCurrentView();
}

/**
 * Navigate to next period (week/month/year or day on mobile)
 */
function navigateNext() {
    if (viewMode === 'week') {
        const daysToShow = getDaysToShow();

        if (daysToShow === 1) {
            // Mobile: Navigate one day forward
            currentDayOffset++;

            // If we go beyond the week end, move to next week
            if (currentDayOffset > 6) {
                currentDate.setDate(currentDate.getDate() + 7);
                currentWeekStart = getWeekStart(currentDate);
                currentDayOffset = 0; // First day of next week
            }
        } else {
            // Desktop/Tablet: Navigate one week forward
            currentDate.setDate(currentDate.getDate() + 7);
            currentWeekStart = getWeekStart(currentDate);
            currentDayOffset = 0;
        }
    } else if (viewMode === 'month') {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        currentDate = new Date(currentMonth);
    } else if (viewMode === 'year') {
        currentYear.setFullYear(currentYear.getFullYear() + 1);
        currentDate = new Date(currentYear);
    }
    loadCurrentView();
}

/**
 * Go to today
 */
function goToToday() {
    currentDate = new Date();
    currentWeekStart = getWeekStart(currentDate);
    currentMonth = new Date();
    currentYear = new Date();

    // Set currentDayOffset to today within the current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    currentDayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0, Sunday = 6

    loadCurrentView();
}

/**
 * Setup view mode switcher
 */
function setupViewModeSwitcher() {
    const weekBtn = document.getElementById('viewWeek');
    const monthBtn = document.getElementById('viewMonth');
    const yearBtn = document.getElementById('viewYear');

    const buttons = [weekBtn, monthBtn, yearBtn];

    if (weekBtn) {
        weekBtn.addEventListener('click', () => {
            viewMode = 'week';
            updateViewButtons(buttons, weekBtn);
            loadCurrentView();
        });
    }

    if (monthBtn) {
        monthBtn.addEventListener('click', () => {
            viewMode = 'month';
            updateViewButtons(buttons, monthBtn);
            loadCurrentView();
        });
    }

    if (yearBtn) {
        yearBtn.addEventListener('click', () => {
            viewMode = 'year';
            updateViewButtons(buttons, yearBtn);
            loadCurrentView();
        });
    }
}

/**
 * Update view button styles
 */
function updateViewButtons(buttons, activeBtn) {
    buttons.forEach(btn => {
        if (btn) {
            btn.classList.remove('bg-gradient-to-r', 'from-primary', 'to-secondary', 'text-white');
            btn.classList.add('text-gray-600', 'hover:bg-gray-100');
        }
    });

    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        activeBtn.classList.add('bg-gradient-to-r', 'from-primary', 'to-secondary', 'text-white');
    }
}

/**
 * Load current view based on view mode
 */
async function loadCurrentView() {
    // Toggle weekend toggle visibility (show in week and month view)
    const weekendToggle = document.getElementById('weekendToggle');
    if (weekendToggle) {
        weekendToggle.style.display = (viewMode === 'week' || viewMode === 'month') ? 'flex' : 'none';
    }

    if (viewMode === 'week') {
        await loadWeekSchedule();
    } else if (viewMode === 'month') {
        await loadMonthView();
    } else if (viewMode === 'year') {
        await loadYearView();
    }
}

/**
 * Load week schedule from API
 * Optimized: Uses single date-range request instead of multiple single-day requests
 */
async function loadWeekSchedule() {
    try {
        showLoadingState();

        // Remove month/year view classes from calendar container
        const calendarContainer = document.getElementById('calendarContainer');
        if (calendarContainer) {
            calendarContainer.classList.remove('month-view', 'year-view');
        }

        // Reset events
        weekEvents = {};

        // Determine number of days to load (5 or 7)
        const daysToLoad = showWeekends ? 7 : 5;

        // Calculate start and end dates for the week
        const startDate = new Date(currentWeekStart);
        const endDate = new Date(currentWeekStart);
        endDate.setDate(endDate.getDate() + daysToLoad - 1);

        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);

        console.log(`📅 Loading week events: ${startDateStr} to ${endDateStr}`);

        // Single API request for the entire week
        let allEvents = [];
        try {
            if (viewingFriend) {
                // Load friend's timetable for date range
                allEvents = await ScheduleAPI.getFriendSchedule(viewingFriend, startDateStr, endDateStr);
            } else {
                // Load own events for date range (timetables + custom hours)
                allEvents = await ScheduleAPI.getEvents(startDateStr, endDateStr);

                // Also load exams and filter for current week
                try {
                    const exams = await ExamsAPI.getUpcomingExams();
                    const weekExams = exams.filter(exam => {
                        const examDate = exam.start_time.split('T')[0];
                        return examDate >= startDateStr && examDate <= endDateStr;
                    });

                    // Convert exams to event format and add to allEvents
                    const examEvents = weekExams.map(exam => ({
                        ...exam,
                        title: exam.course_name,
                        location: exam.room,
                        event_type: 'exam',
                        end_time: new Date(new Date(exam.start_time).getTime() + exam.duration * 60000).toISOString()
                    }));

                    allEvents = [...allEvents, ...examEvents];
                    console.log(`📝 Added ${examEvents.length} exams to week view`);
                } catch (examError) {
                    console.warn('Could not load exams:', examError);
                }
            }
        } catch (error) {
            console.error('Error loading week events:', error);
            allEvents = [];
        }

        // Organize events by date (extract date from start_time)
        allEvents.forEach(event => {
            // Extract date from ISO timestamp: "2025-10-13T07:15:00Z" -> "2025-10-13"
            const eventDate = event.start_time.split('T')[0];
            if (!weekEvents[eventDate]) {
                weekEvents[eventDate] = [];
            }
            weekEvents[eventDate].push(event);
        });

        console.log('✅ Week events loaded (optimized):', Object.keys(weekEvents).length, 'days');

        // Update UI
        updatePeriodDisplay();
        renderWeekSchedule();

    } catch (error) {
        console.error('Error loading week schedule:', error);
        handleAPIError(error, 'Fehler beim Laden des Stundenplans');
        hideLoadingState();
    }
}

/**
 * Update period display (header) based on view mode
 */
function updatePeriodDisplay() {
    const titleEl = document.getElementById('periodTitle');
    const subtitleEl = document.getElementById('periodSubtitle');

    if (!titleEl || !subtitleEl) return;

    if (viewMode === 'week') {
        const daysToShow = getDaysToShow();

        if (daysToShow === 1) {
            // Mobile: Single day view
            const currentDay = new Date(currentWeekStart);
            currentDay.setDate(currentDay.getDate() + currentDayOffset);

            const dayName = getDayName(currentDay.getDay());
            const dateStr = currentDay.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

            titleEl.textContent = dayName;
            subtitleEl.textContent = dateStr;
        } else {
            // Desktop/Tablet: Week view
            const weekNumber = getWeekNumber(currentWeekStart);
            const monthName = currentWeekStart.toLocaleDateString('de-DE', { month: 'long' });
            const year = currentWeekStart.getFullYear();
            titleEl.textContent = `KW ${weekNumber} - ${monthName} ${year}`;

            const daysToShowEnd = showWeekends ? 6 : 4;
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + daysToShowEnd);

            const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const startStr = currentWeekStart.toLocaleDateString('de-DE', options);
            const endStr = weekEnd.toLocaleDateString('de-DE', options);
            subtitleEl.textContent = `${startStr} - ${endStr}`;
        }

    } else if (viewMode === 'month') {
        // Month view
        const monthName = currentMonth.toLocaleDateString('de-DE', { month: 'long' });
        const year = currentMonth.getFullYear();
        titleEl.textContent = `${monthName} ${year}`;

        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        subtitleEl.textContent = `${daysInMonth} Tage`;

    } else if (viewMode === 'year') {
        // Year view
        const year = currentYear.getFullYear();
        titleEl.textContent = `${year}`;
        subtitleEl.textContent = `12 Monate`;
    }
}

/**
 * Get ISO week number
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Render calendar headers (day names and dates)
 */
function renderCalendarHeaders() {
    const headerContainer = document.getElementById('calendarHeader');
    if (!headerContainer) return;

    headerContainer.innerHTML = '';

    // Determine number of days to show based on screen size and settings
    const daysToShow = getDaysToShow();

    // Set CSS variable for grid columns
    const calendarContainer = document.getElementById('calendarContainer');
    if (calendarContainer) {
        calendarContainer.style.setProperty('--days-visible', daysToShow);
    }

    // Time label cell
    const timeLabel = document.createElement('div');
    timeLabel.className = 'calendar-time-label';
    timeLabel.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    headerContainer.appendChild(timeLabel);

    // Day headers
    const today = new Date();

    // For mobile (single day), use currentDayOffset to show the selected day
    const startDayOffset = (daysToShow === 1) ? currentDayOffset : 0;

    for (let i = 0; i < daysToShow; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + startDayOffset + i);

        const dayHeader = document.createElement('div');
        const isToday = date.toDateString() === today.toDateString();
        dayHeader.className = `calendar-day-header ${isToday ? 'today' : ''}`;

        const dayName = getDayName(date.getDay());
        const dayDate = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

        dayHeader.innerHTML = `
            <div class="calendar-day-name">${dayName}</div>
            <div class="calendar-day-date">${dayDate}</div>
        `;

        headerContainer.appendChild(dayHeader);
    }
}

/**
 * Check if two events overlap
 */
function eventsOverlap(event1, event2) {
    const start1 = new Date(event1.start_time);
    const end1 = new Date(event1.end_time);
    const start2 = new Date(event2.start_time);
    const end2 = new Date(event2.end_time);

    return start1 < end2 && start2 < end1;
}

/**
 * Calculate layout columns for overlapping events
 */
function calculateEventLayout(events) {
    if (events.length === 0) return [];

    // Sort events by start time, then by duration (longer first)
    const sortedEvents = events.map((event, index) => ({
        event,
        originalIndex: index,
        start: new Date(event.start_time),
        end: new Date(event.end_time)
    })).sort((a, b) => {
        if (a.start.getTime() !== b.start.getTime()) {
            return a.start - b.start;
        }
        return (b.end - b.start) - (a.end - a.start); // Longer events first
    });

    // Initialize layout info
    const layout = events.map(() => ({ column: 0, totalColumns: 1 }));

    // Group overlapping events
    const groups = [];
    let currentGroup = [sortedEvents[0]];

    for (let i = 1; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        const groupEnd = Math.max(...currentGroup.map(e => e.end));

        if (event.start < groupEnd) {
            // Event overlaps with current group
            currentGroup.push(event);
        } else {
            // Process current group and start new one
            processEventGroup(currentGroup, layout);
            currentGroup = [event];
        }
    }

    // Process last group
    processEventGroup(currentGroup, layout);

    return layout;
}

/**
 * Process a group of overlapping events and assign columns
 */
function processEventGroup(group, layout) {
    if (group.length === 0) return;

    const columns = [];

    // Assign each event to a column
    group.forEach(eventInfo => {
        // Find first available column
        let column = 0;
        while (true) {
            if (!columns[column]) {
                columns[column] = [];
            }

            // Check if this column has space for this event
            const hasConflict = columns[column].some(existingEvent =>
                eventsOverlap(eventInfo.event, existingEvent.event)
            );

            if (!hasConflict) {
                columns[column].push(eventInfo);
                layout[eventInfo.originalIndex].column = column;
                break;
            }

            column++;
        }
    });

    // Set total columns for all events in this group
    const totalColumns = columns.length;
    group.forEach(eventInfo => {
        layout[eventInfo.originalIndex].totalColumns = totalColumns;
    });
}

/**
 * Render week schedule in calendar grid view
 */
function renderWeekSchedule() {
    renderCalendarHeaders();

    const gridContainer = document.getElementById('calendarGrid');
    if (!gridContainer) return;

    // Force clear with explicit removal of all children
    // This is more reliable than innerHTML = '' for preventing duplicates
    while (gridContainer.firstChild) {
        gridContainer.removeChild(gridContainer.firstChild);
    }
    gridContainer.className = 'calendar-grid';
    console.log('📅 [Stundenplan] Rendering week schedule (grid cleared)...');

    // Time range: 0:00 - 24:00 (full day)
    const startHour = 0;
    const endHour = 23;

    // Responsive hour height based on screen width
    let hourHeight = 60; // pixels per hour (desktop)
    if (window.innerWidth <= 768) {
        hourHeight = 45; // smaller for tablets/mobile
    }
    if (window.innerWidth <= 640) {
        hourHeight = 40; // smaller for small mobile
    }
    if (window.innerWidth <= 480) {
        hourHeight = 50; // optimized for single day view
    }

    // Determine number of days to show based on screen size
    const daysToShow = getDaysToShow();

    // For mobile (single day), use currentDayOffset to show the selected day
    const startDayOffset = (daysToShow === 1) ? currentDayOffset : 0;

    // Create time column
    const timeColumn = document.createElement('div');
    timeColumn.className = 'calendar-time-column';

    for (let hour = startHour; hour <= endHour; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'calendar-time-slot';
        timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
        timeColumn.appendChild(timeSlot);
    }

    gridContainer.appendChild(timeColumn);

    // Create day columns
    const totalHeight = (endHour - startHour + 1) * hourHeight;
    const now = new Date();
    const today = new Date();
    let isTodayInWeek = false;

    for (let day = 0; day < daysToShow; day++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + startDayOffset + day);
        const dateStr = formatDateForAPI(date);
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) {
            isTodayInWeek = true;
        }

        const dayColumn = document.createElement('div');
        dayColumn.className = 'calendar-day-column';
        dayColumn.style.height = `${totalHeight}px`;

        // Render hour lines
        for (let hour = startHour; hour <= endHour; hour++) {
            const hourLine = document.createElement('div');
            hourLine.className = 'calendar-hour-line';
            hourLine.style.top = `${(hour - startHour) * hourHeight}px`;
            dayColumn.appendChild(hourLine);

            // Half-hour line
            const halfHourLine = document.createElement('div');
            halfHourLine.className = 'calendar-half-hour-line';
            halfHourLine.style.top = `${(hour - startHour) * hourHeight + 30}px`;
            dayColumn.appendChild(halfHourLine);
        }

        // Get and render events for this day
        const dayEvents = (weekEvents[dateStr] || []).sort((a, b) => {
            return new Date(a.start_time) - new Date(b.start_time);
        });

        // Calculate layout for overlapping events
        const eventLayout = calculateEventLayout(dayEvents);

        dayEvents.forEach((event, index) => {
            const layoutInfo = eventLayout[index];
            const eventEl = renderCalendarEvent(event, startHour, endHour, hourHeight, layoutInfo);
            if (eventEl) {
                dayColumn.appendChild(eventEl);
            }
        });

        gridContainer.appendChild(dayColumn);
    }

    // Add current time indicator spanning entire grid width (only if today is in current week)
    if (isTodayInWeek) {
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentPosition = ((currentHour - startHour) * 60 + currentMinutes) * (hourHeight / 60);
        const indicator = document.createElement('div');
        indicator.className = 'current-time-indicator';
        indicator.style.top = `${currentPosition}px`;
        indicator.style.gridColumn = '1 / -1'; // Span all columns
        gridContainer.appendChild(indicator);
    }

    hideLoadingState();
}

/**
 * Load month view
 */
async function loadMonthView() {
    try {
        showLoadingState();
        updatePeriodDisplay();

        const gridContainer = document.getElementById('calendarGrid');
        const headerContainer = document.getElementById('calendarHeader');
        const calendarContainer = document.getElementById('calendarContainer');

        if (!gridContainer) return;

        // Add month-view class to calendar container
        if (calendarContainer) {
            calendarContainer.classList.add('month-view');
            calendarContainer.classList.remove('year-view');
        }

        // Clear existing content
        if (headerContainer) headerContainer.innerHTML = '';
        gridContainer.innerHTML = '';

        // Load events for entire month
        const monthEvents = await loadMonthEvents();

        // Render month calendar
        renderMonthCalendar(monthEvents);

        hideLoadingState();

    } catch (error) {
        console.error('Error loading month view:', error);
        handleAPIError(error, 'Fehler beim Laden der Monatsansicht');
        hideLoadingState();
    }
}

/**
 * Load all events for the current month
 * Optimized: Uses single date-range request instead of ~30 single-day requests
 */
async function loadMonthEvents() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDateStr = formatDateForAPI(firstDay);
    const endDateStr = formatDateForAPI(lastDay);

    console.log(`📅 Loading month events: ${startDateStr} to ${endDateStr}`);

    const events = {};

    try {
        // Single API request for the entire month
        let allEvents = [];
        if (viewingFriend) {
            allEvents = await ScheduleAPI.getFriendSchedule(viewingFriend, startDateStr, endDateStr);
        } else {
            allEvents = await ScheduleAPI.getEvents(startDateStr, endDateStr);

            // Also load exams and filter for current month
            try {
                const exams = await ExamsAPI.getUpcomingExams();
                const monthExams = exams.filter(exam => {
                    const examDate = exam.start_time.split('T')[0];
                    return examDate >= startDateStr && examDate <= endDateStr;
                });

                // Convert exams to event format and add to allEvents
                const examEvents = monthExams.map(exam => ({
                    ...exam,
                    title: exam.course_name,
                    location: exam.room,
                    event_type: 'exam',
                    end_time: new Date(new Date(exam.start_time).getTime() + exam.duration * 60000).toISOString()
                }));

                allEvents = [...allEvents, ...examEvents];
                console.log(`📝 Added ${examEvents.length} exams to month view`);
            } catch (examError) {
                console.warn('Could not load exams:', examError);
            }
        }

        // Organize events by date (extract date from start_time)
        allEvents.forEach(event => {
            // Extract date from ISO timestamp: "2025-10-13T07:15:00Z" -> "2025-10-13"
            const eventDate = event.start_time.split('T')[0];
            if (!events[eventDate]) {
                events[eventDate] = [];
            }
            events[eventDate].push(event);
        });

        console.log('✅ Month events loaded (optimized):', Object.keys(events).length, 'days with events');
    } catch (error) {
        console.error('Error loading month events:', error);
    }

    return events;
}

/**
 * Render month calendar grid
 */
function renderMonthCalendar(monthEvents) {
    const gridContainer = document.getElementById('calendarGrid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';
    gridContainer.className = 'calendar-grid month-mode';

    // Create month view container
    const monthContainer = document.createElement('div');
    monthContainer.className = 'month-view-container';

    // Weekday headers (adjust based on showWeekends)
    const allWeekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const weekdays = showWeekends ? allWeekdays : allWeekdays.slice(0, 5);
    const numColumns = weekdays.length;

    // Update grid columns
    monthContainer.style.gridTemplateColumns = `repeat(${numColumns}, 1fr)`;

    weekdays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'month-weekday-header';
        header.textContent = day;
        monthContainer.appendChild(header);
    });

    // Get calendar data
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();

    // Calculate starting offset (Monday = 0, Sunday = 6)
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6; // Sunday adjustment

    // If not showing weekends, adjust the offset to skip weekend days
    if (!showWeekends && startOffset >= 5) {
        startOffset = 0; // If month starts on weekend, start from Monday
    }

    // Add empty cells for days before month starts
    const prevMonthLastDay = new Date(year, month, 0);
    if (showWeekends) {
        // Full week view - fill all offset days
        for (let i = startOffset - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay.getDate() - i;
            const cell = createMonthDayCell(dayNum, null, false, today);
            monthContainer.appendChild(cell);
        }
    } else {
        // Weekday only view - fill only weekday offset
        if (startOffset > 0 && startOffset < 5) {
            for (let i = 0; i < startOffset; i++) {
                const cell = createMonthDayCell('', null, false, today);
                monthContainer.appendChild(cell);
            }
        }
    }

    // Add cells for each day in the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Skip weekends if toggle is off
        if (!showWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
            continue;
        }

        const dateStr = formatDateForAPI(date);
        const dayEvents = monthEvents[dateStr] || [];
        const cell = createMonthDayCell(day, dayEvents, true, today, date);
        monthContainer.appendChild(cell);
    }

    // Fill remaining cells to complete the grid
    const totalCells = monthContainer.children.length - numColumns; // Subtract headers
    const remainingCells = (numColumns - (totalCells % numColumns)) % numColumns;
    if (remainingCells > 0 && remainingCells < numColumns) {
        for (let i = 1; i <= remainingCells; i++) {
            const cell = createMonthDayCell(i, null, false, today);
            monthContainer.appendChild(cell);
        }
    }

    gridContainer.appendChild(monthContainer);
}

/**
 * Create a single month day cell
 */
function createMonthDayCell(dayNum, events, isCurrentMonth, today, date = null) {
    const cell = document.createElement('div');
    cell.className = 'month-day-cell';

    if (!isCurrentMonth || dayNum === '') {
        cell.classList.add('other-month');
    }

    if (date && date.toDateString() === today.toDateString()) {
        cell.classList.add('today');
    }

    // Day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'month-day-number';
    dayNumber.textContent = dayNum;
    cell.appendChild(dayNumber);

    // Events container
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'month-events-container';

    if (events && events.length > 0) {
        // Show first 3 events as items
        const eventsToShow = events.slice(0, 3);
        eventsToShow.forEach(event => {
            const eventItem = document.createElement('div');
            const eventType = event.event_type === 'exam' ? 'exam' : (event.event_type === 'timetable' ? 'timetable' : 'custom');
            eventItem.className = `month-event-item ${eventType}`;

            const startTime = new Date(event.start_time);
            const timeStr = formatTime(startTime.toTimeString());
            const cleanTitle = cleanEventTitle(event.title);

            eventItem.textContent = `${timeStr} ${cleanTitle}`;
            eventItem.onclick = (e) => {
                e.stopPropagation();
                showEventDetails(event);
            };
            eventsContainer.appendChild(eventItem);
        });

        // Show count if more events
        if (events.length > 3) {
            const moreCount = document.createElement('div');
            moreCount.className = 'month-events-count';
            moreCount.textContent = `+${events.length - 3} weitere`;
            eventsContainer.appendChild(moreCount);
        }

        // Also show dots for mobile view
        const dotsContainer = document.createElement('div');
        dotsContainer.style.display = 'none'; // Hidden by default, shown on mobile via CSS
        events.slice(0, 5).forEach(event => {
            const dot = document.createElement('span');
            const eventType = event.event_type === 'exam' ? 'exam' : (event.event_type === 'timetable' ? 'timetable' : 'custom');
            dot.className = `month-event-dot ${eventType}`;
            dotsContainer.appendChild(dot);
        });
        eventsContainer.appendChild(dotsContainer);
    }

    cell.appendChild(eventsContainer);

    return cell;
}

/**
 * Load year view
 */
async function loadYearView() {
    try {
        showLoadingState();
        updatePeriodDisplay();

        const gridContainer = document.getElementById('calendarGrid');
        const headerContainer = document.getElementById('calendarHeader');
        const calendarContainer = document.getElementById('calendarContainer');

        if (!gridContainer) return;

        // Add year-view class to calendar container
        if (calendarContainer) {
            calendarContainer.classList.add('year-view');
            calendarContainer.classList.remove('month-view');
        }

        // Clear existing content
        if (headerContainer) headerContainer.innerHTML = '';
        gridContainer.innerHTML = '';

        // Render year calendar immediately without events
        renderYearCalendar({});

        hideLoadingState();

        // Load events in the background and update the calendar
        loadYearEventsAsync();

    } catch (error) {
        console.error('Error loading year view:', error);
        handleAPIError(error, 'Fehler beim Laden der Jahresansicht');
        hideLoadingState();
    }
}

/**
 * Load year events asynchronously and update the calendar incrementally
 */
async function loadYearEventsAsync() {
    try {
        // Load events with incremental updates
        await loadYearEvents();
    } catch (error) {
        console.error('Error loading year events:', error);
    }
}

/**
 * Load events for entire year
 * MASSIVELY OPTIMIZED: Uses 12 date-range requests (one per month) instead of 365+ single-day requests!
 */
async function loadYearEvents() {
    const year = currentYear.getFullYear();

    // Get current month to prioritize loading
    const today = new Date();
    const currentMonthIndex = today.getFullYear() === year ? today.getMonth() : 0;

    // Smart loading order:
    // 1. Current month first
    // 2. Then remaining months until year end (forward)
    // 3. Then months from year start to current month (backward)

    const monthsToLoad = [];

    // Add current month first
    monthsToLoad.push(currentMonthIndex);

    // Add remaining months until end of year (forward)
    for (let monthIndex = currentMonthIndex + 1; monthIndex < 12; monthIndex++) {
        monthsToLoad.push(monthIndex);
    }

    // Add previous months from current back to start (backward)
    for (let monthIndex = currentMonthIndex - 1; monthIndex >= 0; monthIndex--) {
        monthsToLoad.push(monthIndex);
    }

    // Load each month with a single API request
    for (const monthIndex of monthsToLoad) {
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);

        const startDateStr = formatDateForAPI(firstDay);
        const endDateStr = formatDateForAPI(lastDay);

        console.log(`📅 Loading month ${monthIndex + 1}/12: ${startDateStr} to ${endDateStr}`);

        try {
            // Single API request for the entire month
            let allEvents = [];
            if (viewingFriend) {
                allEvents = await ScheduleAPI.getFriendSchedule(viewingFriend, startDateStr, endDateStr);
            } else {
                allEvents = await ScheduleAPI.getEvents(startDateStr, endDateStr);

                // Also load exams and filter for current month
                try {
                    const exams = await ExamsAPI.getUpcomingExams();
                    const monthExams = exams.filter(exam => {
                        const examDate = exam.start_time.split('T')[0];
                        return examDate >= startDateStr && examDate <= endDateStr;
                    });

                    // Convert exams to event format and add to allEvents
                    const examEvents = monthExams.map(exam => ({
                        ...exam,
                        title: exam.course_name,
                        location: exam.room,
                        event_type: 'exam',
                        end_time: new Date(new Date(exam.start_time).getTime() + exam.duration * 60000).toISOString()
                    }));

                    allEvents = [...allEvents, ...examEvents];
                    console.log(`📝 Added ${examEvents.length} exams to year view month ${monthIndex + 1}`);
                } catch (examError) {
                    console.warn('Could not load exams:', examError);
                }
            }

            // Organize events by day for this month
            const monthEvents = {};
            allEvents.forEach(event => {
                // Extract date from ISO timestamp: "2025-10-13T07:15:00Z" -> "2025-10-13"
                const eventDateStr = event.start_time.split('T')[0];
                const eventDate = new Date(eventDateStr);
                const day = eventDate.getDate();

                // Store event types for each day (prioritize exam > custom > timetable for display)
                if (!monthEvents[day]) {
                    monthEvents[day] = event.event_type || 'timetable';
                } else {
                    // Prioritize: exam > custom > timetable
                    const currentType = monthEvents[day];
                    const newType = event.event_type || 'timetable';
                    if (newType === 'exam' || (newType === 'custom' && currentType === 'timetable')) {
                        monthEvents[day] = newType;
                    }
                }
            });

            // Update calendar immediately for this month
            updateMonthWithEvents(monthIndex, monthEvents);

            console.log(`✅ Month ${monthIndex + 1} loaded: ${Object.keys(monthEvents).length} days with events`);
        } catch (error) {
            console.error(`Error loading month ${monthIndex + 1}:`, error);
            // Continue with next month even if this one fails
        }

        // Small delay before processing next month to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

/**
 * Update a single month with event data (for incremental loading)
 */
function updateMonthWithEvents(monthIndex, monthEventDays) {
    const monthCards = document.querySelectorAll('.year-month-card');
    if (monthCards[monthIndex]) {
        // Find all day elements for this month and mark them with events
        Object.keys(monthEventDays).forEach(day => {
            const dayElements = monthCards[monthIndex].querySelectorAll('.year-day');
            const eventType = monthEventDays[day]; // Get the event type for this day
            // Find the day element (accounting for offset)
            dayElements.forEach(dayEl => {
                if (dayEl.textContent == day && !dayEl.classList.contains('other-month')) {
                    dayEl.classList.add('has-events');
                    dayEl.classList.add(`has-events-${eventType}`);
                }
            });
        });

        // Update event count in the month card with subtle animation
        const eventCount = Object.keys(monthEventDays).length;
        const statsEl = monthCards[monthIndex].querySelector('.year-month-stats');
        if (statsEl && eventCount > 0) {
            statsEl.innerHTML = `
                <span class="year-event-count" style="color: #3cd2ff; font-weight: 600;">
                    <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    ${eventCount} ${eventCount === 1 ? 'Termin' : 'Termine'}
                </span>
            `;
            // Add subtle fade-in effect
            statsEl.style.opacity = '0';
            setTimeout(() => {
                statsEl.style.transition = 'opacity 0.3s ease-in';
                statsEl.style.opacity = '1';
            }, 10);
        }
    }
}

/**
 * Update year calendar with event data (for bulk loading)
 */
function updateYearCalendarWithEvents(yearEvents) {
    const year = currentYear.getFullYear();

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const monthEventDays = yearEvents[monthIndex] || {};
        updateMonthWithEvents(monthIndex, monthEventDays);
    }
}

/**
 * Render year calendar with 12 months
 */
function renderYearCalendar(yearEvents = {}) {
    const gridContainer = document.getElementById('calendarGrid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';
    gridContainer.className = 'calendar-grid year-mode';

    // Create year view container
    const yearContainer = document.createElement('div');
    yearContainer.className = 'year-view-container';

    const year = currentYear.getFullYear();
    const today = new Date();

    // Create a card for each month
    const monthNames = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const monthEventDays = yearEvents[monthIndex] || {};
        const monthCard = createYearMonthCard(year, monthIndex, monthNames[monthIndex], today, monthEventDays);
        yearContainer.appendChild(monthCard);
    }

    gridContainer.appendChild(yearContainer);
}

/**
 * Create a single month card for year view
 */
function createYearMonthCard(year, monthIndex, monthName, today, eventDays = {}) {
    const card = document.createElement('div');
    card.className = 'year-month-card';

    // Header
    const header = document.createElement('div');
    header.className = 'year-month-header';
    header.textContent = monthName;
    card.appendChild(header);

    // Mini calendar grid
    const grid = document.createElement('div');
    grid.className = 'year-month-grid';

    // Weekday headers
    const weekdays = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
    weekdays.forEach(day => {
        const weekdayEl = document.createElement('div');
        weekdayEl.className = 'year-weekday';
        weekdayEl.textContent = day;
        grid.appendChild(weekdayEl);
    });

    // Calculate calendar
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);

    // Calculate starting offset (Monday = 0, Sunday = 6)
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6; // Sunday adjustment

    // Add empty cells for previous month
    for (let i = 0; i < startOffset; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'year-day other-month';
        grid.appendChild(emptyDay);
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, monthIndex, day);
        const dayEl = document.createElement('div');
        dayEl.className = 'year-day';
        dayEl.textContent = day;

        // Highlight today
        const isToday = date.toDateString() === today.toDateString();
        if (isToday) {
            dayEl.classList.add('today');
        }

        // Mark days with events
        if (eventDays[day]) {
            dayEl.classList.add('has-events');
            const eventType = eventDays[day]; // Get the event type for this day
            dayEl.classList.add(`has-events-${eventType}`);
        }

        grid.appendChild(dayEl);
    }

    card.appendChild(grid);

    // Stats - with click handler ONLY on this button
    const stats = document.createElement('div');
    stats.className = 'year-month-stats';
    stats.innerHTML = `
        <span class="year-event-count">
            <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Zum Monat
        </span>
    `;

    // Click handler ONLY on the stats/button, not on the whole card
    stats.onclick = (e) => {
        e.stopPropagation(); // Prevent event bubbling
        currentMonth = new Date(year, monthIndex, 1);
        currentDate = new Date(currentMonth);
        viewMode = 'month';

        // Update view buttons
        const weekBtn = document.getElementById('viewWeek');
        const monthBtn = document.getElementById('viewMonth');
        const yearBtn = document.getElementById('viewYear');
        updateViewButtons([weekBtn, monthBtn, yearBtn], monthBtn);

        loadCurrentView();
    };

    card.appendChild(stats);

    return card;
}

/**
 * Render event in calendar grid
 */
function renderCalendarEvent(event, startHour, endHour, hourHeight, layoutInfo = { column: 0, totalColumns: 1 }) {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);

    // Calculate position and height
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const startMinutesFromBase = startMinutes - (startHour * 60);
    const durationMinutes = endMinutes - startMinutes;

    const topPosition = (startMinutesFromBase / 60) * hourHeight;
    const height = Math.max((durationMinutes / 60) * hourHeight, 35); // Minimum height

    // Skip if event is outside visible range
    if (topPosition < -10 || topPosition > (endHour - startHour + 1) * hourHeight) {
        return null;
    }

    // Calculate horizontal position based on layout
    const { column, totalColumns } = layoutInfo;
    const padding = 4; // Base padding in pixels
    const gap = 2; // Gap between overlapping events in pixels

    // Calculate width and left position
    const widthPercent = (100 / totalColumns);
    const leftPercent = (column * widthPercent);

    // Adjust for padding and gaps
    const leftPx = padding + (column * gap);
    const rightPx = padding + ((totalColumns - column - 1) * gap);

    // Create event element
    const eventEl = document.createElement('div');
    const eventType = event.event_type === 'exam' ? 'exam' : (event.event_type === 'timetable' ? 'timetable' : 'custom');
    eventEl.className = `calendar-event ${eventType}`;
    eventEl.style.top = `${topPosition}px`;
    eventEl.style.height = `${height}px`;

    // Set horizontal position
    eventEl.style.left = `calc(${leftPercent}% + ${leftPx}px)`;
    eventEl.style.right = `calc(${100 - leftPercent - widthPercent}% + ${rightPx}px)`;
    eventEl.style.width = 'auto'; // Let left/right determine width

    const startStr = formatTime(startTime.toTimeString());
    const endStr = formatTime(endTime.toTimeString());
    const cleanTitle = cleanEventTitle(event.title);

    eventEl.innerHTML = `
        <div class="calendar-event-title">${cleanTitle}</div>
        <div class="calendar-event-time">${startStr} - ${endStr}</div>
        ${event.location ? `<div class="calendar-event-location">📍 ${event.location}</div>` : ''}
    `;

    eventEl.onclick = () => showEventDetails(event);

    return eventEl;
}

/**
 * Render event block
 */
function renderEventBlock(event) {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);

    const startStr = formatTime(startTime.toTimeString());
    const endStr = formatTime(endTime.toTimeString());

    // Different colors for different event types
    let bgColor, borderColor, textColor;
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (event.event_type === 'timetable') {
        // Use different blue in dark mode (less bright cyan, more of a purple-blue)
        bgColor = isDarkMode ? '#5b9fd9' : (event.color || '#3cd2ff');
        borderColor = isDarkMode ? '#7bb3e8' : (event.border_color || '#003a79');
    } else {
        bgColor = isDarkMode ? '#ff9966' : '#ffa064';
        borderColor = isDarkMode ? '#ffb399' : '#ff8040';
    }

    // Create event block HTML
    return `
        <div class="course-block p-3 rounded-lg mb-2"
             style="background: linear-gradient(135deg, ${bgColor}15 0%, ${bgColor}25 100%); border-left: 3px solid ${borderColor};"
             onclick="showEventDetails(${JSON.stringify(event).replace(/"/g, '&quot;')})">
            <div class="font-semibold text-sm text-gray-900 mb-1">${event.title}</div>
            <div class="text-xs text-gray-600">
                ${startStr} - ${endStr}
            </div>
            ${event.location ? `
                <div class="text-xs text-gray-600 mt-1">
                    <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    ${event.location}
                </div>
            ` : ''}
            ${event.professor ? `
                <div class="text-xs text-gray-600">
                    ${event.professor}
                </div>
            ` : ''}
        </div>
    `;
}

// Store currently viewed event for edit/delete operations
let currentlyViewedEvent = null;

/**
 * Show event details in modal
 */
function showEventDetails(event) {
    const modal = document.getElementById('eventModal');
    if (!modal) return;

    // Store event for later use
    currentlyViewedEvent = event;

    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    const duration = Math.round((endTime - startTime) / 60000);

    const cleanTitle = cleanEventTitle(event.title);

    const modalContent = document.getElementById('eventModalContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <h3 class="text-xl font-bold text-gray-900 mb-4 modal-event-title">${cleanTitle}</h3>

            <div class="space-y-3">
                <div class="flex items-center text-gray-700">
                    <svg class="w-5 h-5 mr-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>${formatTime(startTime.toTimeString())} - ${formatTime(endTime.toTimeString())} (${duration} Min)</span>
                </div>

                ${event.location ? `
                    <div class="flex items-center text-gray-700">
                        <svg class="w-5 h-5 mr-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span>${event.location}</span>
                    </div>
                ` : ''}

                ${event.professor ? `
                    <div class="flex items-center text-gray-700">
                        <svg class="w-5 h-5 mr-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        <span>${event.professor}</span>
                    </div>
                ` : ''}

                ${event.description ? (() => {
                    const filteredDesc = filterDescription(event.description);
                    return filteredDesc ? `
                        <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p class="text-sm text-gray-700">${nl2br(filteredDesc)}</p>
                        </div>
                    ` : '';
                })() : ''}

                ${event.event_type === 'custom_hour' ? `
                    <div class="mt-4 pt-4 border-t">
                        <span class="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
                            Eigener Termin
                        </span>
                    </div>
                ` : ''}
            </div>

            <div class="mt-6 flex ${event.event_type === 'custom_hour' ? 'justify-between' : 'justify-end'}">
                ${event.event_type === 'custom_hour' ? `
                    <div class="flex gap-2">
                        <button onclick="editCustomHour()" class="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            Bearbeiten
                        </button>
                        <button onclick="deleteCustomHour()" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                            Löschen
                        </button>
                    </div>
                ` : ''}
                <button onclick="closeEventModal()" class="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors">
                    Schließen
                </button>
            </div>
        `;
    }

    modal.classList.add('active');
}

/**
 * Close event modal
 */
function closeEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Delete custom hour
 */
async function deleteCustomHour() {
    if (!currentlyViewedEvent) {
        showToast('Fehler: Kein Termin ausgewählt', 'error');
        return;
    }

    showConfirmDialog('Möchtest du diesen Termin wirklich löschen?', async () => {
        try {
            const result = await CustomHoursAPI.deleteCustomHour(currentlyViewedEvent.id);
            showToast(result.message || 'Termin erfolgreich gelöscht!', 'success');

            // Close the event modal
            closeEventModal();

            // Reload the current week schedule
            await loadWeekSchedule();
        } catch (error) {
            console.error('Error deleting custom hour:', error);
            showToast(error.message || 'Fehler beim Löschen des Termins', 'error');
        }
    });
}

/**
 * Edit custom hour
 */
async function editCustomHour() {
    if (!currentlyViewedEvent) {
        showToast('Fehler: Kein Termin ausgewählt', 'error');
        return;
    }

    // Close event modal first
    closeEventModal();

    // Show update modal with pre-filled data
    await showUpdateCustomHourModal(currentlyViewedEvent);
}

/**
 * Setup add event buttons
 */
function setupAddEventButtons() {
    // Add buttons are already set up in the HTML with onclick handlers
    // The modals.js file handles the modal display
}

/**
 * Show loading state
 */
function showLoadingState() {
    const container = document.getElementById('scheduleGrid');
    if (container) {
        container.innerHTML = `
            <div class="col-span-6 flex items-center justify-center py-12">
                <div class="text-center">
                    <div class="spinner mx-auto mb-4"></div>
                    <p class="text-gray-600">Lade Stundenplan...</p>
                </div>
            </div>
        `;
    }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    // Loading is hidden when schedule is rendered
    // Notify navbar that content is ready
    if (typeof pageContentReady === 'function') {
        pageContentReady();
    }
}

/**
 * Update page title
 */
function updatePageTitle(title) {
    document.title = title;
    const pageTitle = document.querySelector('h1 .gradient-text');
    if (pageTitle) {
        pageTitle.textContent = title.split(' - ')[1] || title;
    }
}

/**
 * Logout function
 */
function logout() {
    showConfirmDialog('Möchtest du dich wirklich abmelden?', async () => {
        await AuthAPI.logout();
    });
}

/**
 * Helper: Format time
 */
function formatTime(timeString) {
    const parts = timeString.split(':');
    return `${parts[0]}:${parts[1]}`;
}

/**
 * Helper: Get day name
 */
function getDayName(dayIndex) {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return days[dayIndex];
}

/**
 * Helper: Clean event title (remove everything after first comma)
 */
function cleanEventTitle(title) {
    if (!title) return '';
    const commaIndex = title.indexOf(',');
    return commaIndex !== -1 ? title.substring(0, commaIndex).trim() : title;
}

/**
 * Helper: Convert newlines to <br> tags
 */
function nl2br(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
}

/**
 * Helper: Filter description to remove redundant information already shown above
 * Removes lines that start with: Veranstaltung, Dozent, Raum, Zeit
 */
function filterDescription(description) {
    if (!description) return '';

    console.log('Original description:', description);

    // Split by actual newline characters (both \n and \\n)
    // First replace literal \n strings with actual newlines
    let normalizedDesc = description.replace(/\\n/g, '\n');
    const lines = normalizedDesc.split('\n');

    console.log('Split into lines:', lines);

    // Filter out lines that start with redundant prefixes
    const redundantPrefixes = [
        'Veranstaltung:',
        'Dozent:',
        'Raum:',
        'Zeit:',
        'Dauer:'
    ];

    const filteredLines = lines.filter(line => {
        const trimmedLine = line.trim();
        // Remove empty lines
        if (!trimmedLine) return false;
        // Check if line starts with any redundant prefix
        const isRedundant = redundantPrefixes.some(prefix => trimmedLine.startsWith(prefix));
        if (isRedundant) {
            console.log('Filtering out redundant line:', trimmedLine);
        }
        return !isRedundant;
    });

    console.log('Filtered lines:', filteredLines);

    // Only return if there are meaningful lines left
    const result = filteredLines.length > 0 ? filteredLines.join('\n') : '';
    console.log('Final filtered description:', result);
    return result;
}

function initStundenplanPage() {
    console.log('🚀 Initializing Stundenplan...');
    initStundenplan();
}

// Initialize on DOMContentLoaded for BROWSER compatibility
// In the app, Shell.triggerPageInit() will call initStundenplan() directly
// The isInitialized guard in initStundenplan() prevents double initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStundenplanPage);
} else {
    // DOM already loaded (script loaded dynamically)
    initStundenplanPage();
}

// Listen for page reload events (for app navigation)
// This ensures re-initialization even when script is already loaded
window.addEventListener('nora:pageLoaded', (event) => {
    if (event.detail.page === 'stundenplan') {
        console.log('🔄 [Stundenplan] Page reload detected - re-initializing');
        initStundenplan();
    }
});

// Handle window resize for responsive calendar
let resizeTimeout;
window.addEventListener('resize', () => {
    // Debounce resize events to avoid excessive re-renders
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log('📱 Window resized, re-rendering calendar...');

        // Reset currentDayOffset to today when switching from mobile to desktop
        const daysToShow = getDaysToShow();
        if (daysToShow > 1 && currentDayOffset !== 0) {
            // Switched from mobile to desktop - reset offset
            const today = new Date();
            const dayOfWeek = today.getDay();
            currentDayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        }

        // Re-render calendar
        if (viewMode === 'week') {
            renderWeekSchedule();
            updatePeriodDisplay();
        }
    }, 250);
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('eventModal');
    if (modal && e.target === modal) {
        closeEventModal();
    }
});

/**
 * Swipe gesture handling for mobile day navigation
 */
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

function handleSwipeGesture() {
    const daysToShow = getDaysToShow();

    // Only enable swipe on mobile single-day view
    if (daysToShow !== 1 || viewMode !== 'week') {
        return;
    }

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Minimum swipe distance (in pixels)
    const minSwipeDistance = 50;

    // Only process horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
            // Swipe right = previous day
            navigatePrevious();
        } else {
            // Swipe left = next day
            navigateNext();
        }
    }
}

// Add touch event listeners to calendar container
document.addEventListener('DOMContentLoaded', () => {
    const calendarContainer = document.getElementById('calendarContainer');

    if (calendarContainer) {
        calendarContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        calendarContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipeGesture();
        }, { passive: true });
    }
});
