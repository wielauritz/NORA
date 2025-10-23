/**
 * Modals JavaScript
 * Wiederverwendbare Modal-Funktionen für Custom Hours und Klausuren
 */

/**
 * Validate date and time inputs
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} startTime - Time in HH:MM format (optional for exams)
 * @param {string} endTime - Time in HH:MM format (optional)
 * @returns {object} - { valid: boolean, error: string, correctedDate: string }
 */
function validateDateTime(date, startTime = null, endTime = null) {
    // Check if date is provided
    if (!date) {
        return { valid: false, error: 'Datum ist erforderlich' };
    }

    // Parse date
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = date.match(datePattern);

    if (!match) {
        return { valid: false, error: 'Ungültiges Datumsformat. Bitte verwende das Format TT.MM.JJJJ' };
    }

    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);

    // Validate year range (2020-2100)
    if (year < 2020 || year > 2100) {
        return { valid: false, error: `Ungültiges Jahr: ${year}. Bitte gib ein Jahr zwischen 2020 und 2100 ein.` };
    }

    // Validate month (1-12)
    if (month < 1 || month > 12) {
        return { valid: false, error: `Ungültiger Monat: ${month}. Bitte gib einen Monat zwischen 01 und 12 ein.` };
    }

    // Validate day based on month and year
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
        return { valid: false, error: `Ungültiger Tag: ${day}. Der ${month}. Monat ${year} hat nur ${daysInMonth} Tage.` };
    }

    // Create date object to verify it's a valid date
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
        return { valid: false, error: 'Das eingegebene Datum ist ungültig' };
    }

    // Validate times if provided
    if (startTime) {
        const timePattern = /^(\d{2}):(\d{2})$/;
        const startMatch = startTime.match(timePattern);

        if (!startMatch) {
            return { valid: false, error: 'Ungültiges Zeitformat für Startzeit' };
        }

        const startHour = parseInt(startMatch[1]);
        const startMinute = parseInt(startMatch[2]);

        if (startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59) {
            return { valid: false, error: 'Ungültige Startzeit. Stunden: 00-23, Minuten: 00-59' };
        }

        if (endTime) {
            const endMatch = endTime.match(timePattern);

            if (!endMatch) {
                return { valid: false, error: 'Ungültiges Zeitformat für Endzeit' };
            }

            const endHour = parseInt(endMatch[1]);
            const endMinute = parseInt(endMatch[2]);

            if (endHour < 0 || endHour > 23 || endMinute < 0 || endMinute > 59) {
                return { valid: false, error: 'Ungültige Endzeit. Stunden: 00-23, Minuten: 00-59' };
            }

            // Check that end time is after start time
            const startDateTime = new Date(year, month - 1, day, startHour, startMinute);
            const endDateTime = new Date(year, month - 1, day, endHour, endMinute);

            if (endDateTime <= startDateTime) {
                return { valid: false, error: 'Die Endzeit muss nach der Startzeit liegen' };
            }
        }
    }

    return { valid: true, correctedDate: date };
}

/**
 * Show Add Custom Hour Modal
 */
function showAddCustomHourModal() {
    const modal = document.getElementById('addCustomHourModal');
    if (!modal) {
        createAddCustomHourModal();
        return showAddCustomHourModal();
    }

    // Reset form
    document.getElementById('customHourForm').reset();
    document.getElementById('customHourError').classList.add('hidden');

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('customHourDate').value = today;

    // Set default start time to current time rounded to nearest 15 minutes
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    const timeStr = now.toTimeString().slice(0, 5);
    document.getElementById('customHourStartTime').value = timeStr;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Create Add Custom Hour Modal
 */
function createAddCustomHourModal() {
    const modalHTML = `
        <div id="addCustomHourModal" class="modal-overlay">
            <div class="modal-content glass-effect rounded-3xl w-full max-w-2xl p-8 relative" onclick="event.stopPropagation()">

                <!-- Close Button -->
                <button onclick="closeAddCustomHourModal()" class="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <!-- Modal Header -->
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">Eigene Stunde hinzufügen</h2>
                    <p class="text-gray-600">Erstelle einen benutzerdefinierten Termin</p>
                </div>

                <!-- Error Message -->
                <div id="customHourError" class="hidden mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                    <div class="flex items-start space-x-3">
                        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div id="customHourErrorText" class="flex-1"></div>
                    </div>
                </div>

                <!-- Form -->
                <form id="customHourForm" onsubmit="submitCustomHour(event)" class="space-y-4">

                    <!-- Title -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Titel *
                        </label>
                        <input type="text" id="customHourTitle" required
                               class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                               placeholder="z.B. Lernen, Meeting, Projektarbeit">
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Beschreibung
                        </label>
                        <textarea id="customHourDescription" rows="3"
                                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                                  placeholder="Zusätzliche Informationen..."></textarea>
                    </div>

                    <!-- Date and Time -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Datum *
                            </label>
                            <input type="date" id="customHourDate" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Startzeit *
                            </label>
                            <input type="time" id="customHourStartTime" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Endzeit *
                        </label>
                        <input type="time" id="customHourEndTime" required
                               class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                    </div>

                    <!-- Location Type -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Ort-Typ *
                        </label>
                        <div class="flex space-x-4">
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="locationType" value="room" checked
                                       onchange="toggleLocationType('room')"
                                       class="w-4 h-4 text-primary focus:ring-primary">
                                <span class="ml-2 text-sm text-gray-700">Raum auswählen</span>
                            </label>
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="locationType" value="custom"
                                       onchange="toggleLocationType('custom')"
                                       class="w-4 h-4 text-primary focus:ring-primary">
                                <span class="ml-2 text-sm text-gray-700">Eigener Ort</span>
                            </label>
                        </div>
                    </div>

                    <!-- Room Selection -->
                    <div id="roomSelection">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Raum
                        </label>
                        <select id="customHourRoom" disabled
                                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed">
                            <option value="">Bitte zuerst Datum und Zeiten auswählen...</option>
                        </select>
                        <p class="text-xs text-gray-500 mt-1">💡 Wähle zuerst Datum, Start- und Endzeit aus</p>
                    </div>

                    <!-- Custom Location -->
                    <div id="customLocationInput" class="hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Eigener Ort
                        </label>
                        <input type="text" id="customHourCustomLocation"
                               class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                               placeholder="z.B. Stadtbibliothek, Zuhause, Café">
                    </div>

                    <!-- Actions -->
                    <div class="flex space-x-3 pt-4">
                        <button type="submit" id="submitCustomHourBtn"
                                class="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-shadow">
                            Erstellen
                        </button>
                        <button type="button" onclick="closeAddCustomHourModal()"
                                class="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors">
                            Abbrechen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Load rooms for selection
    loadRoomsForCustomHour();

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('customHourDate').value = today;

    // Set default start time to current time rounded to nearest 15 minutes
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    const timeStr = now.toTimeString().slice(0, 5);
    document.getElementById('customHourStartTime').value = timeStr;

    // Add event listeners to update room list when date/time changes
    const dateInput = document.getElementById('customHourDate');
    const startTimeInput = document.getElementById('customHourStartTime');
    const endTimeInput = document.getElementById('customHourEndTime');

    if (dateInput) {
        dateInput.addEventListener('change', loadRoomsForCustomHour);
    }
    if (startTimeInput) {
        startTimeInput.addEventListener('change', loadRoomsForCustomHour);
    }
    if (endTimeInput) {
        endTimeInput.addEventListener('change', loadRoomsForCustomHour);
    }
}

/**
 * Toggle between room and custom location
 */
function toggleLocationType(type) {
    const roomSelection = document.getElementById('roomSelection');
    const customLocationInput = document.getElementById('customLocationInput');

    if (type === 'room') {
        roomSelection.classList.remove('hidden');
        customLocationInput.classList.add('hidden');
        document.getElementById('customHourCustomLocation').value = '';
    } else {
        roomSelection.classList.add('hidden');
        customLocationInput.classList.remove('hidden');
        document.getElementById('customHourRoom').value = '';
    }
}

/**
 * Load rooms for custom hour dropdown
 * Loads only available rooms based on selected date and time
 */
async function loadRoomsForCustomHour() {
    const select = document.getElementById('customHourRoom');
    if (!select) return;

    const dateInput = document.getElementById('customHourDate');
    const startTimeInput = document.getElementById('customHourStartTime');
    const endTimeInput = document.getElementById('customHourEndTime');

    // Check if date and times are filled
    if (!dateInput?.value || !startTimeInput?.value || !endTimeInput?.value) {
        // Disable selector and show hint
        select.disabled = true;
        select.innerHTML = '<option value="">Bitte zuerst Datum und Zeiten auswählen...</option>';
        return;
    }

    // Enable selector and clear options
    select.disabled = false;
    select.innerHTML = '<option value="">Raum auswählen...</option>';

    // Combine date and time for API call
    const startTime = `${dateInput.value}T${startTimeInput.value}:00`;
    const endTime = `${dateInput.value}T${endTimeInput.value}:00`;

    try {
        // Load only free rooms for the selected time period
        const response = await RoomAPI.getFreeRooms(startTime, endTime);
        const rooms = response.free_rooms || [];

        if (rooms.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Keine freien Räume verfügbar';
            option.disabled = true;
            select.appendChild(option);
        } else {
            rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.room_number;
                option.textContent = `${room.room_number}${room.room_name ? ' - ' + room.room_name : ''}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading free rooms:', error);
        // Fallback to all rooms on error
        try {
            const rooms = await RoomAPI.getAllRooms();
            rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.room_number;
                option.textContent = `${room.room_number}${room.room_name ? ' - ' + room.room_name : ''}`;
                select.appendChild(option);
            });
        } catch (fallbackError) {
            console.error('Error loading fallback rooms:', fallbackError);
        }
    }
}

/**
 * Submit custom hour form
 */
async function submitCustomHour(event) {
    event.preventDefault();

    const errorDiv = document.getElementById('customHourError');
    const errorText = document.getElementById('customHourErrorText');
    const submitBtn = document.getElementById('submitCustomHourBtn');

    // Hide previous errors
    errorDiv.classList.add('hidden');

    // Get form values
    const title = document.getElementById('customHourTitle').value.trim();
    const description = document.getElementById('customHourDescription').value.trim() || null;
    const date = document.getElementById('customHourDate').value;
    const startTime = document.getElementById('customHourStartTime').value;
    const endTime = document.getElementById('customHourEndTime').value;

    const locationType = document.querySelector('input[name="locationType"]:checked').value;
    const room = locationType === 'room' ? document.getElementById('customHourRoom').value : null;
    const customLocation = locationType === 'custom' ? document.getElementById('customHourCustomLocation').value.trim() : null;

    // Validate
    if (!title || !date || !startTime || !endTime) {
        errorText.textContent = 'Bitte fülle alle Pflichtfelder aus.';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (locationType === 'room' && !room) {
        errorText.textContent = 'Bitte wähle einen Raum aus.';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (locationType === 'custom' && !customLocation) {
        errorText.textContent = 'Bitte gib einen eigenen Ort an.';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Validate date and time
    const validation = validateDateTime(date, startTime, endTime);
    if (!validation.valid) {
        errorText.textContent = validation.error;
        errorDiv.classList.remove('hidden');
        return;
    }

    // Combine date and time to ISO format
    const start_time = `${validation.correctedDate}T${startTime}:00`;
    const end_time = `${validation.correctedDate}T${endTime}:00`;

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird erstellt...';

    try {
        await CustomHoursAPI.createCustomHour(
            title,
            description,
            start_time,
            end_time,
            room,
            customLocation
        );

        // Success!
        closeAddCustomHourModal();
        showToast('Eigene Stunde erfolgreich erstellt!', 'success');

        // Reload schedule if on stundenplan page
        if (typeof loadWeekSchedule === 'function') {
            loadWeekSchedule();
        }

        // Reload dashboard if on dashboard page
        if (typeof loadTodaySchedule === 'function') {
            loadTodaySchedule();
        }

    } catch (error) {
        console.error('Error creating custom hour:', error);
        errorText.textContent = error.message || 'Fehler beim Erstellen der Stunde';
        errorDiv.classList.remove('hidden');

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Erstellen';
    }
}

/**
 * Close Add Custom Hour Modal
 */
function closeAddCustomHourModal() {
    const modal = document.getElementById('addCustomHourModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Show Update Custom Hour Modal
 */
async function showUpdateCustomHourModal(event) {
    const modal = document.getElementById('updateCustomHourModal');
    if (!modal) {
        await createUpdateCustomHourModal(event);
        return showUpdateCustomHourModal(event);
    }

    // Update the modal content with event data
    await populateUpdateCustomHourForm(event);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Create Update Custom Hour Modal
 */
async function createUpdateCustomHourModal(event) {
    const modalHTML = `
        <div id="updateCustomHourModal" class="modal-overlay">
            <div class="modal-content glass-effect rounded-3xl w-full max-w-2xl p-8 relative" onclick="event.stopPropagation()">

                <!-- Close Button -->
                <button onclick="closeUpdateCustomHourModal()" class="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <!-- Modal Header -->
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">Eigene Stunde bearbeiten</h2>
                    <p class="text-gray-600">Aktualisiere deinen benutzerdefinierten Termin</p>
                </div>

                <!-- Error Message -->
                <div id="updateCustomHourError" class="hidden mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                    <div class="flex items-start space-x-3">
                        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div id="updateCustomHourErrorText" class="flex-1"></div>
                    </div>
                </div>

                <!-- Form -->
                <form id="updateCustomHourForm" onsubmit="submitUpdateCustomHour(event)" class="space-y-4">
                    <input type="hidden" id="updateCustomHourId" />

                    <!-- Title -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Titel *
                        </label>
                        <input type="text" id="updateCustomHourTitle" required
                               class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                               placeholder="z.B. Lernen, Meeting, Projektarbeit">
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Beschreibung
                        </label>
                        <textarea id="updateCustomHourDescription" rows="3"
                                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                                  placeholder="Zusätzliche Informationen..."></textarea>
                    </div>

                    <!-- Date and Time -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Datum *
                            </label>
                            <input type="date" id="updateCustomHourDate" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Startzeit *
                            </label>
                            <input type="time" id="updateCustomHourStartTime" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Endzeit *
                        </label>
                        <input type="time" id="updateCustomHourEndTime" required
                               class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                    </div>

                    <!-- Location Type -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Ort-Typ *
                        </label>
                        <div class="flex space-x-4">
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="updateLocationType" value="room" checked
                                       onchange="toggleUpdateLocationType('room')"
                                       class="w-4 h-4 text-primary focus:ring-primary">
                                <span class="ml-2 text-sm text-gray-700">Raum auswählen</span>
                            </label>
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="updateLocationType" value="custom"
                                       onchange="toggleUpdateLocationType('custom')"
                                       class="w-4 h-4 text-primary focus:ring-primary">
                                <span class="ml-2 text-sm text-gray-700">Eigener Ort</span>
                            </label>
                        </div>
                    </div>

                    <!-- Room Selection -->
                    <div id="updateRoomSelection">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Raum
                        </label>
                        <select id="updateCustomHourRoom"
                                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed">
                            <option value="">Raum auswählen...</option>
                        </select>
                    </div>

                    <!-- Custom Location -->
                    <div id="updateCustomLocationInput" class="hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Eigener Ort
                        </label>
                        <input type="text" id="updateCustomHourCustomLocation"
                               class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                               placeholder="z.B. Stadtbibliothek, Zuhause, Café">
                    </div>

                    <!-- Actions -->
                    <div class="flex space-x-3 pt-4">
                        <button type="submit" id="submitUpdateCustomHourBtn"
                                class="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-shadow">
                            Aktualisieren
                        </button>
                        <button type="button" onclick="closeUpdateCustomHourModal()"
                                class="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors">
                            Abbrechen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Store the current room for use in event listeners
    const currentRoom = event.room || null;

    // Add event listeners to update room list when date/time changes
    const dateInput = document.getElementById('updateCustomHourDate');
    const startTimeInput = document.getElementById('updateCustomHourStartTime');
    const endTimeInput = document.getElementById('updateCustomHourEndTime');

    if (dateInput) {
        dateInput.addEventListener('change', () => loadRoomsForUpdateCustomHour(currentRoom));
    }
    if (startTimeInput) {
        startTimeInput.addEventListener('change', () => loadRoomsForUpdateCustomHour(currentRoom));
    }
    if (endTimeInput) {
        endTimeInput.addEventListener('change', () => loadRoomsForUpdateCustomHour(currentRoom));
    }

    // Populate with event data
    await populateUpdateCustomHourForm(event);
}

/**
 * Populate update form with event data
 */
async function populateUpdateCustomHourForm(event) {
    // Set ID
    document.getElementById('updateCustomHourId').value = event.id;

    // Set title and description
    document.getElementById('updateCustomHourTitle').value = event.title;
    document.getElementById('updateCustomHourDescription').value = event.description || '';

    // Parse date and time from ISO strings
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);

    const date = startTime.toISOString().split('T')[0];
    const startTimeStr = startTime.toTimeString().slice(0, 5);
    const endTimeStr = endTime.toTimeString().slice(0, 5);

    document.getElementById('updateCustomHourDate').value = date;
    document.getElementById('updateCustomHourStartTime').value = startTimeStr;
    document.getElementById('updateCustomHourEndTime').value = endTimeStr;

    // Set location type and value
    if (event.room) {
        document.querySelector('input[name="updateLocationType"][value="room"]').checked = true;
        toggleUpdateLocationType('room');

        // Load available rooms first, passing the current room so it's always included
        await loadRoomsForUpdateCustomHour(event.room);

        // Then set the selected room
        document.getElementById('updateCustomHourRoom').value = event.room;
    } else if (event.custom_location) {
        document.querySelector('input[name="updateLocationType"][value="custom"]').checked = true;
        toggleUpdateLocationType('custom');
        document.getElementById('updateCustomHourCustomLocation').value = event.custom_location;
    }

    // Hide error
    document.getElementById('updateCustomHourError').classList.add('hidden');
}

/**
 * Toggle between room and custom location for update form
 */
function toggleUpdateLocationType(type) {
    const roomSelection = document.getElementById('updateRoomSelection');
    const customLocationInput = document.getElementById('updateCustomLocationInput');

    if (type === 'room') {
        roomSelection.classList.remove('hidden');
        customLocationInput.classList.add('hidden');
        document.getElementById('updateCustomHourCustomLocation').value = '';
    } else {
        roomSelection.classList.add('hidden');
        customLocationInput.classList.remove('hidden');
        document.getElementById('updateCustomHourRoom').value = '';
    }
}

/**
 * Load rooms for update custom hour dropdown
 * @param {string} currentRoom - The room currently assigned to this custom hour (to ensure it's always in the list)
 */
async function loadRoomsForUpdateCustomHour(currentRoom = null) {
    const select = document.getElementById('updateCustomHourRoom');
    if (!select) return;

    const dateInput = document.getElementById('updateCustomHourDate');
    const startTimeInput = document.getElementById('updateCustomHourStartTime');
    const endTimeInput = document.getElementById('updateCustomHourEndTime');

    if (!dateInput?.value || !startTimeInput?.value || !endTimeInput?.value) {
        select.disabled = true;
        select.innerHTML = '<option value="">Bitte zuerst Datum und Zeiten auswählen...</option>';
        return;
    }

    select.disabled = false;
    const currentValue = select.value || currentRoom; // Remember current selection
    select.innerHTML = '<option value="">Raum auswählen...</option>';

    const startTime = `${dateInput.value}T${startTimeInput.value}:00`;
    const endTime = `${dateInput.value}T${endTimeInput.value}:00`;

    try {
        const response = await RoomAPI.getFreeRooms(startTime, endTime);
        let rooms = response.free_rooms || [];

        // If we have a current room and it's not in the free rooms list, add it
        // This ensures the currently booked room is always available in the dropdown
        if (currentRoom && !rooms.some(r => r.room_number === currentRoom)) {
            try {
                const allRooms = await RoomAPI.getAllRooms();
                const currentRoomData = allRooms.find(r => r.room_number === currentRoom);
                if (currentRoomData) {
                    // Add current room at the beginning with a note
                    rooms = [currentRoomData, ...rooms];
                }
            } catch (error) {
                console.error('Error loading current room data:', error);
            }
        }

        if (rooms.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Keine freien Räume verfügbar';
            option.disabled = true;
            select.appendChild(option);
        } else {
            rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.room_number;
                // Mark the current room if it's not in the free rooms list
                const isCurrent = room.room_number === currentRoom;
                const isInFreeRooms = response.free_rooms?.some(r => r.room_number === room.room_number);
                const label = isCurrent && !isInFreeRooms
                    ? `${room.room_number}${room.room_name ? ' - ' + room.room_name : ''} (aktuell gebucht)`
                    : `${room.room_number}${room.room_name ? ' - ' + room.room_name : ''}`;
                option.textContent = label;
                select.appendChild(option);
            });

            // Restore previous selection if still available
            if (currentValue && rooms.some(r => r.room_number === currentValue)) {
                select.value = currentValue;
            }
        }
    } catch (error) {
        console.error('Error loading free rooms:', error);
        try {
            const rooms = await RoomAPI.getAllRooms();
            rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.room_number;
                option.textContent = `${room.room_number}${room.room_name ? ' - ' + room.room_name : ''}`;
                select.appendChild(option);
            });

            if (currentValue) {
                select.value = currentValue;
            }
        } catch (error2) {
            console.error('Error loading all rooms:', error2);
            select.innerHTML = '<option value="">Fehler beim Laden der Räume</option>';
        }
    }
}

/**
 * Submit update custom hour form
 */
async function submitUpdateCustomHour(event) {
    event.preventDefault();

    const errorDiv = document.getElementById('updateCustomHourError');
    const errorText = document.getElementById('updateCustomHourErrorText');
    const submitBtn = document.getElementById('submitUpdateCustomHourBtn');

    errorDiv.classList.add('hidden');

    const customHourId = parseInt(document.getElementById('updateCustomHourId').value);
    const title = document.getElementById('updateCustomHourTitle').value.trim();
    const description = document.getElementById('updateCustomHourDescription').value.trim() || null;
    const date = document.getElementById('updateCustomHourDate').value;
    const startTime = document.getElementById('updateCustomHourStartTime').value;
    const endTime = document.getElementById('updateCustomHourEndTime').value;

    const locationType = document.querySelector('input[name="updateLocationType"]:checked').value;
    const room = locationType === 'room' ? document.getElementById('updateCustomHourRoom').value : null;
    const customLocation = locationType === 'custom' ? document.getElementById('updateCustomHourCustomLocation').value.trim() : null;

    if (!title || !date || !startTime || !endTime) {
        errorText.textContent = 'Bitte fülle alle Pflichtfelder aus.';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (locationType === 'room' && !room) {
        errorText.textContent = 'Bitte wähle einen Raum aus.';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (locationType === 'custom' && !customLocation) {
        errorText.textContent = 'Bitte gib einen eigenen Ort an.';
        errorDiv.classList.remove('hidden');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Aktualisiere...';

    try {
        const startTimeISO = `${date}T${startTime}:00`;
        const endTimeISO = `${date}T${endTime}:00`;

        const updates = {
            title,
            description,
            start_time: startTimeISO,
            end_time: endTimeISO,
            room: room || null,
            custom_location: customLocation || null
        };

        const result = await CustomHoursAPI.updateCustomHour(customHourId, updates);

        showToast(result.message || 'Termin erfolgreich aktualisiert!', 'success');

        closeUpdateCustomHourModal();

        // Reload the week schedule
        if (typeof loadWeekSchedule === 'function') {
            await loadWeekSchedule();
        }
    } catch (error) {
        console.error('Error updating custom hour:', error);
        errorText.textContent = error.message || 'Fehler beim Aktualisieren des Termins';
        errorDiv.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Aktualisieren';
    }
}

/**
 * Close Update Custom Hour Modal
 */
function closeUpdateCustomHourModal() {
    const modal = document.getElementById('updateCustomHourModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Show Add Exam Modal
 */
function showAddExamModal() {
    const modal = document.getElementById('addExamModal');
    if (!modal) {
        createAddExamModal();
        return showAddExamModal();
    }

    // Reset form
    document.getElementById('examForm').reset();
    document.getElementById('examError').classList.add('hidden');

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Create Add Exam Modal
 */
function createAddExamModal() {
    const modalHTML = `
        <div id="addExamModal" class="modal-overlay">
            <div class="modal-content glass-effect rounded-3xl w-full max-w-2xl p-8 relative" onclick="event.stopPropagation()">

                <!-- Close Button -->
                <button onclick="closeAddExamModal()" class="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <!-- Modal Header -->
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">Klausur hinzufügen</h2>
                    <p class="text-gray-600">Trage eine anstehende Klausur ein</p>
                </div>

                <!-- Error Message -->
                <div id="examError" class="hidden mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                    <div class="flex items-start space-x-3">
                        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div id="examErrorText" class="flex-1"></div>
                    </div>
                </div>

                <!-- Form -->
                <form id="examForm" onsubmit="submitExam(event)" class="space-y-4">

                    <!-- Course Selection with Searchable Dropdowns -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Module Number Dropdown -->
                        <div class="relative">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Modulnummer *
                            </label>
                            <div class="relative">
                                <input type="text" id="examModuleNumber" required
                                       autocomplete="off"
                                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                                       placeholder="z.B. I231, A205"
                                       oninput="filterCourses('module')"
                                       onfocus="showCourseDropdown('module')">
                                <div id="moduleDropdown" class="hidden absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    <!-- Dropdown items will be populated dynamically -->
                                </div>
                            </div>
                        </div>

                        <!-- Course Name Dropdown -->
                        <div class="relative">
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Kursname *
                            </label>
                            <div class="relative">
                                <input type="text" id="examCourseName" required
                                       autocomplete="off"
                                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                                       placeholder="z.B. Algorithmen"
                                       oninput="filterCourses('name')"
                                       onfocus="showCourseDropdown('name')">
                                <div id="nameDropdown" class="hidden absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    <!-- Dropdown items will be populated dynamically -->
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="selectedCourseId" value="">

                    <!-- Date and Time -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Datum *
                            </label>
                            <input type="date" id="examDate" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Uhrzeit *
                            </label>
                            <input type="time" id="examTime" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                        </div>
                    </div>

                    <!-- Duration -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Dauer *
                        </label>
                        <select id="examDuration" required
                                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                            <option value="">Dauer auswählen...</option>
                            <option value="30">30 Minuten</option>
                            <option value="45">45 Minuten</option>
                            <option value="60">60 Minuten</option>
                            <option value="90">90 Minuten</option>
                            <option value="120">120 Minuten</option>
                        </select>
                    </div>

                    <!-- Room (optional) -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Raum (optional)
                        </label>
                        <select id="examRoom"
                                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                            <option value="">Raum auswählen...</option>
                        </select>
                    </div>

                    <!-- Actions -->
                    <div class="flex space-x-3 pt-4">
                        <button type="submit" id="submitExamBtn"
                                class="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-shadow">
                            Klausur hinzufügen
                        </button>
                        <button type="button" onclick="closeAddExamModal()"
                                class="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors">
                            Abbrechen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Load rooms and courses for selection
    loadRoomsForExam();
    loadCoursesForExam();
}

/**
 * Load rooms for exam dropdown
 */
async function loadRoomsForExam() {
    try {
        const rooms = await RoomAPI.getAllRooms();
        const select = document.getElementById('examRoom');

        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.room_number;
            option.textContent = `${room.room_number}${room.room_name ? ' - ' + room.room_name : ''}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

// Global courses list for exam modal
let allCourses = [];

/**
 * Load courses for exam dropdown
 */
async function loadCoursesForExam() {
    try {
        allCourses = await CoursesAPI.getAllCourses();
        console.log('✅ Courses loaded:', allCourses.length);
    } catch (error) {
        console.error('Error loading courses:', error);
        allCourses = [];
    }
}

/**
 * Show course dropdown
 */
function showCourseDropdown(type) {
    const dropdownId = type === 'module' ? 'moduleDropdown' : 'nameDropdown';
    const dropdown = document.getElementById(dropdownId);

    if (dropdown) {
        // Populate with all courses initially
        filterCourses(type);
        dropdown.classList.remove('hidden');
    }
}

/**
 * Filter courses based on input
 */
function filterCourses(type) {
    const inputId = type === 'module' ? 'examModuleNumber' : 'examCourseName';
    const dropdownId = type === 'module' ? 'moduleDropdown' : 'nameDropdown';

    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown) return;

    const searchTerm = input.value.toLowerCase();

    // Filter courses
    const filtered = allCourses.filter(course => {
        if (type === 'module') {
            return course.module_number.toLowerCase().includes(searchTerm);
        } else {
            return course.name.toLowerCase().includes(searchTerm);
        }
    });

    // Populate dropdown
    dropdown.innerHTML = '';

    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="px-4 py-3 text-sm text-gray-500">Keine Kurse gefunden</div>';
    } else {
        filtered.forEach(course => {
            const item = document.createElement('div');
            item.className = 'px-4 py-3 hover:bg-primary/10 cursor-pointer transition-colors text-sm';

            if (type === 'module') {
                item.innerHTML = `
                    <div class="font-medium text-gray-900">${course.module_number}</div>
                    <div class="text-xs text-gray-600">${course.name}</div>
                `;
            } else {
                item.innerHTML = `
                    <div class="font-medium text-gray-900">${course.name}</div>
                    <div class="text-xs text-gray-600">${course.module_number}</div>
                `;
            }

            item.onclick = () => selectCourse(course);
            dropdown.appendChild(item);
        });
    }

    dropdown.classList.remove('hidden');
}

/**
 * Select a course and auto-fill both fields
 */
function selectCourse(course) {
    const moduleInput = document.getElementById('examModuleNumber');
    const nameInput = document.getElementById('examCourseName');
    const courseIdInput = document.getElementById('selectedCourseId');
    const moduleDropdown = document.getElementById('moduleDropdown');
    const nameDropdown = document.getElementById('nameDropdown');

    if (moduleInput && nameInput && courseIdInput) {
        moduleInput.value = course.module_number;
        nameInput.value = course.name;
        courseIdInput.value = course.module_number; // We'll use module_number as the course identifier for the API

        // Hide both dropdowns
        if (moduleDropdown) moduleDropdown.classList.add('hidden');
        if (nameDropdown) nameDropdown.classList.add('hidden');
    }
}

/**
 * Hide course dropdowns when clicking outside
 */
document.addEventListener('click', (e) => {
    const moduleDropdown = document.getElementById('moduleDropdown');
    const nameDropdown = document.getElementById('nameDropdown');
    const moduleInput = document.getElementById('examModuleNumber');
    const nameInput = document.getElementById('examCourseName');

    if (moduleDropdown && !moduleInput?.contains(e.target) && !moduleDropdown.contains(e.target)) {
        moduleDropdown.classList.add('hidden');
    }

    if (nameDropdown && !nameInput?.contains(e.target) && !nameDropdown.contains(e.target)) {
        nameDropdown.classList.add('hidden');
    }
});

/**
 * Submit exam form
 */
async function submitExam(event) {
    event.preventDefault();

    const errorDiv = document.getElementById('examError');
    const errorText = document.getElementById('examErrorText');
    const submitBtn = document.getElementById('submitExamBtn');

    // Hide previous errors
    errorDiv.classList.add('hidden');

    // Get form values
    const moduleNumber = document.getElementById('examModuleNumber').value.trim();
    const courseName = document.getElementById('examCourseName').value.trim();
    const selectedCourseId = document.getElementById('selectedCourseId').value;
    const date = document.getElementById('examDate').value;
    const time = document.getElementById('examTime').value;
    const duration = parseInt(document.getElementById('examDuration').value);
    const room = document.getElementById('examRoom').value || null;

    // Validate
    if (!moduleNumber || !courseName || !date || !time || !duration) {
        errorText.textContent = 'Bitte fülle alle Pflichtfelder aus.';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Check if a valid course was selected
    const selectedCourse = allCourses.find(c => c.module_number === moduleNumber && c.name === courseName);
    if (!selectedCourse) {
        errorText.textContent = 'Bitte wähle einen gültigen Kurs aus der Liste aus.';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Validate date and time
    const validation = validateDateTime(date, time);
    if (!validation.valid) {
        errorText.textContent = validation.error;
        errorDiv.classList.remove('hidden');
        return;
    }

    // Combine date and time to ISO format
    const start_time = `${validation.correctedDate}T${time}:00`;

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird hinzugefügt...';

    try {
        // Use module_number as the course identifier for the API
        const result = await ExamsAPI.addExam(selectedCourse.module_number, start_time, duration, room);

        // Success!
        closeAddExamModal();

        const isVerified = result.message && result.message.includes('verifiziert');
        const message = isVerified
            ? '✓ Klausur hinzugefügt und verifiziert!'
            : 'Klausur erfolgreich hinzugefügt!';

        showToast(message, 'success');

        // Reload exams if on dashboard page
        if (typeof loadUpcomingExams === 'function') {
            loadUpcomingExams();
        }

    } catch (error) {
        console.error('Error adding exam:', error);
        errorText.textContent = error.message || 'Fehler beim Hinzufügen der Klausur';
        errorDiv.classList.remove('hidden');

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Klausur hinzufügen';
    }
}

/**
 * Close Add Exam Modal
 */
function closeAddExamModal() {
    const modal = document.getElementById('addExamModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.getElementById('toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Color based on type
    let bgColor = 'bg-gray-800';
    let icon = '';

    if (type === 'success') {
        bgColor = 'bg-green-600';
        icon = `<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>`;
    } else if (type === 'error') {
        bgColor = 'bg-red-600';
        icon = `<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>`;
    } else {
        icon = `<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>`;
    }

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed bottom-8 right-8 ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 z-[9999] animate-slide-up`;
    toast.innerHTML = `
        ${icon}
        <span class="font-medium">${message}</span>
    `;

    document.body.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Add CSS for animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-up {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .animate-slide-up {
        animation: slide-up 0.3s ease-out;
    }
`;
document.head.appendChild(style);

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.id === 'addCustomHourModal') {
        closeAddCustomHourModal();
    }
    if (e.target.id === 'addExamModal') {
        closeAddExamModal();
    }
    if (e.target.id === 'addFriendModal') {
        closeAddFriendModal();
    }
});

// Close modals with ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAddCustomHourModal();
        closeAddExamModal();
        closeAddFriendModal();
        // Don't close Zenturie modal with ESC - it's required
    }
});

/**
 * Show Zenturie Selection Modal
 */
async function showZenturieSelectionModal() {
    const modal = document.getElementById('zenturieSelectionModal');
    if (!modal) {
        await createZenturieSelectionModal();
        return showZenturieSelectionModal();
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Create Zenturie Selection Modal
 */
async function createZenturieSelectionModal() {
    const modalHTML = `
        <div id="zenturieSelectionModal" class="modal-overlay">
            <div class="modal-content glass-effect rounded-3xl w-full max-w-md p-8 relative" onclick="event.stopPropagation()">

                <!-- Modal Header -->
                <div class="mb-6 text-center">
                    <div class="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">Willkommen bei NORA!</h2>
                    <p class="text-gray-600">Bitte wähle deine Zenturie aus, um deinen Stundenplan zu sehen.</p>
                </div>

                <!-- Error Message -->
                <div id="zenturieError" class="hidden mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                    <div class="flex items-start space-x-3">
                        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div id="zenturieErrorText" class="flex-1"></div>
                    </div>
                </div>

                <!-- Form -->
                <form id="zenturieForm" onsubmit="submitZenturieSelection(event)" class="space-y-4">

                    <!-- Zenturie Selection -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Zenturie *
                        </label>
                        <select id="zenturieSelect" required
                                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary">
                            <option value="">Zenturie auswählen...</option>
                        </select>
                    </div>

                    <!-- Info Box -->
                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div class="flex items-start space-x-3">
                            <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div class="text-sm text-blue-800">
                                <p>Deine Zenturie bestimmt, welche Kurse und Termine du in deinem Stundenplan siehst.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <button type="submit" id="submitZenturieBtn"
                            class="w-full px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-shadow">
                        Speichern
                    </button>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Load available Zenturien
    await loadZenturienForSelection();
}

/**
 * Load Zenturien for selection dropdown
 */
async function loadZenturienForSelection() {
    try {
        const zenturien = await UserAPI.getAllZenturien();
        const select = document.getElementById('zenturieSelect');

        if (!select) return;

        zenturien.forEach(z => {
            const option = document.createElement('option');
            option.value = z.zenturie;
            option.textContent = `${z.zenturie}${z.year ? ' (Jahrgang ' + z.year + ')' : ''}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading Zenturien:', error);
        const errorDiv = document.getElementById('zenturieError');
        const errorText = document.getElementById('zenturieErrorText');
        if (errorDiv && errorText) {
            errorText.textContent = 'Fehler beim Laden der Zenturien';
            errorDiv.classList.remove('hidden');
        }
    }
}

/**
 * Submit Zenturie selection form
 */
async function submitZenturieSelection(event) {
    event.preventDefault();

    const errorDiv = document.getElementById('zenturieError');
    const errorText = document.getElementById('zenturieErrorText');
    const submitBtn = document.getElementById('submitZenturieBtn');
    const select = document.getElementById('zenturieSelect');

    // Hide previous errors
    if (errorDiv) errorDiv.classList.add('hidden');

    const zenturie = select.value;

    if (!zenturie) {
        if (errorText && errorDiv) {
            errorText.textContent = 'Bitte wähle eine Zenturie aus.';
            errorDiv.classList.remove('hidden');
        }
        return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gespeichert...';

    try {
        await UserAPI.setZenturie(zenturie);

        // Success!
        closeZenturieSelectionModal();
        showToast('Zenturie erfolgreich gespeichert!', 'success');

        // Reload page to update everything
        setTimeout(() => {
            window.location.reload();
        }, 500);

    } catch (error) {
        console.error('Error setting Zenturie:', error);
        if (errorText && errorDiv) {
            errorText.textContent = error.message || 'Fehler beim Speichern der Zenturie';
            errorDiv.classList.remove('hidden');
        }

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Speichern';
    }
}

/**
 * Close Zenturie Selection Modal
 */
function closeZenturieSelectionModal() {
    const modal = document.getElementById('zenturieSelectionModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}
