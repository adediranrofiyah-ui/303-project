let allEvents = []; // Event List and Calendar Module - Browse events with interactive calendar, search, categories - Features: Calendar for date-based filtering, search, category filtering, real-time event display
let selectedDate = new Date();
let db = null;

// Convert any date format (string, timestamp, Date) to Date object for consistent comparisons
function toDateObject(dateValue) {
    if (!dateValue) return new Date();
    
    // If it's already a Date object, return it
    if (dateValue instanceof Date) {
        return dateValue;
    }
    
    // If it's a Firestore Timestamp object with toDate() method
    if (dateValue && typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
    }
    
    // Try to parse as string or number
    try {
        return new Date(dateValue);
    } catch (e) {
        console.error('Invalid date format:', dateValue);
        return new Date();
    }
}

// Debug logging function - logs to console and displays yellow debug box on page
function debugLog(message) {
    console.log(message);
    
    // Find or create debug output element
    let debugOutput = document.getElementById('debugOutput');
    let debugInfo = document.getElementById('debugInfo');
    
    // Create debug box if it doesn't exist
    if (!debugInfo) {
        debugInfo = document.createElement('div');
        debugInfo.id = 'debugInfo';
        debugInfo.style.cssText = 'background: #ffeb3b; padding: 15px; margin: 10px; border: 2px solid #ff9800; border-radius: 5px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; z-index: 9999; position: relative;';
        document.body.insertBefore(debugInfo, document.body.firstChild);
        
        debugOutput = document.createElement('div');
        debugOutput.id = 'debugOutput';
        debugInfo.appendChild(debugOutput);
    }
    
    // Append message to debug box
    if (debugOutput) {
        const line = document.createElement('div');
        line.textContent = message;
        debugOutput.appendChild(line);
        debugOutput.parentElement.style.display = 'block';
    }
}

// Initialize event list page with calendar and event data from Firebase
async function initEventListPage() {
    debugLog('✓ Event list page initializing...');
    
    try {
        // Setup mobile menu toggle for hamburger button
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mainNav = document.querySelector('.main-nav');

        if (mobileMenuBtn && mainNav) {
            // Toggle mobile menu visibility
            mobileMenuBtn.addEventListener('click', function() {
                mainNav.classList.toggle('mobile-active');
                debugLog('✓ Mobile menu toggled');
            });

            // Close menu when a nav link is clicked
            const navLinks = mainNav.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    mainNav.classList.remove('mobile-active');
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', function(e) {
                if (!mobileMenuBtn.contains(e.target) && !mainNav.contains(e.target)) {
                    mainNav.classList.remove('mobile-active');
                }
            });
        }

        // Verify required DOM elements exist
        debugLog('📋 Checking for required DOM elements...');
        const calendar = document.getElementById('calendar');
        const eventsList = document.getElementById('eventsList');
        const monthYear = document.getElementById('monthYear');
        
        debugLog(`  - Calendar element: ${calendar ? '✓ Found' : '✗ NOT FOUND'}`);
        debugLog(`  - EventsList element: ${eventsList ? '✓ Found' : '✗ NOT FOUND'}`);
        debugLog(`  - MonthYear element: ${monthYear ? '✓ Found' : '✗ NOT FOUND'}`);
        
        if (!calendar || !eventsList || !monthYear) {
            throw new Error('Required DOM elements not found');
        }
        
        // Wait for Firebase to initialize
        let attempts = 0;
        while (!window.firebaseDb && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        // Set database reference or use null for demo fallback
        if (!window.firebaseDb) {
            debugLog('⚠️ Firebase not available after polling, using demo data');
            db = null;
        } else {
            db = window.firebaseDb;
            debugLog('✓ Firebase ready');
        }
        
        // Build the calendar interface
        debugLog('📅 Rendering calendar...');
        renderCalendar();
        debugLog('✓ Calendar rendered');
        
        // Setup all filter event listeners
        debugLog('📌 Setting up event listeners...');
        setupEventListeners();
        debugLog('✓ Event listeners setup');
        
        // Load events from Firebase or demo
        debugLog('📂 Loading events...');
        await loadAllEvents();
        
        debugLog('✓ Event list page initialized successfully');
    } catch (error) {
        debugLog(`✗ Error initializing event list page: ${error.message}`);
        const container = document.getElementById('eventsList');
        if (container) {
            container.innerHTML = `<p>⚠️ Error: ${error.message}</p>`;
        }
    }
}

// Render interactive monthly calendar with date selection and event highlighting
function renderCalendar() {
    debugLog('📅 renderCalendar() called');
    
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    // Display month and year
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthYearText = `${monthNames[month]} ${year}`;
    const monthYearEl = document.getElementById('monthYear') || document.getElementById('month-year-display');
    if (monthYearEl) monthYearEl.textContent = monthYearText;
    debugLog(`  ✓ Month/year updated: ${monthYearText}`);
    
    // Calculate calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    
    debugLog(`  📊 Calendar grid: ${daysInMonth} days, starts on day ${firstDay}`);
    
    // Add previous month's trailing dates
    for (let i = firstDay - 1; i >= 0; i--) {
        const date = document.createElement('div');
        date.className = 'calendar-date other-month';
        date.textContent = daysInPrevMonth - i;
        calendar.appendChild(date);
    }
    
    // Add current month's dates
    const today = new Date();
    let daysWithEvents = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
        const date = document.createElement('div');
        date.className = 'calendar-date';
        date.textContent = i;
        
        const currentDate = new Date(year, month, i);
        
        // Highlight today's date
        if (currentDate.toDateString() === today.toDateString()) {
            date.classList.add('today');
        }
        
        // Check if any events on this date
        const hasEvent = allEvents.some(event => {
            const eventDate = toDateObject(event.date);
            return eventDate.toDateString() === currentDate.toDateString();
        });
        
        if (hasEvent) {
            date.classList.add('has-event');
            daysWithEvents++;
        }
        
        // Add click handler to filter by date
        date.addEventListener('click', () => {
            document.querySelectorAll('.calendar-date').forEach(d => d.classList.remove('selected'));
            date.classList.add('selected');
            selectedDate = currentDate;
            filterEvents();
        });
        
        calendar.appendChild(date);
    }
    
    // Add next month's leading dates
    const totalCells = calendar.children.length;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        const date = document.createElement('div');
        date.className = 'calendar-date other-month';
        date.textContent = i;
        calendar.appendChild(date);
    }
    
    debugLog(`  ✓ Calendar rendered with ${daysWithEvents} days having events`);
}

// Load all approved events from Firebase or demo
async function loadAllEvents() {
    try {
        debugLog('✓ Loading events from Firebase...');
        debugLog('📊 Firestore instance: ' + (db ? 'Available' : 'NOT available'));
        
        // Use demo fallback if database unavailable
        if (!db) {
            debugLog('⚠️ Database not available, loading demo events...');
            loadDemoEvents();
            return;
        }
        
        // Query for approved events only
        debugLog('  Querying APPROVED events from database...');
        let snapshot = await db.collection('events')
            .where('status', 'in', ['approved', 'Published'])
            .get();
        
        debugLog(`📊 Approved events found: ${snapshot.docs.length}`);
        
        if (snapshot.docs.length === 0) {
            debugLog('⚠️ No events found in database');
        }
        
        // Map Firestore documents to event array
        allEvents = snapshot.docs.map(doc => {
            const data = doc.data();
            const eventName = data.name || 'Unknown';
            const eventCategory = data.category || data.type || 'No category';
            debugLog(`  ✓ "${eventName}" - ${eventCategory}`);
            return {
                id: doc.id,
                ...data
            };
        });

        debugLog(`✓ Loaded ${allEvents.length} events total`);
        
        // Fallback to demo if no events
        if (allEvents.length === 0) {
            debugLog('⚠️ No events loaded, using demo events...');
            loadDemoEvents();
            return;
        }
        
        filterEvents();
        
    } catch (error) {
        debugLog('✗ Error: ' + error.message);
        console.error('Full error:', error);
        const container = document.getElementById('eventsList');
        if (container) {
            container.innerHTML = `<p>⚠️ Error: ${error.message}</p>`;
        }
    }
}

// Load demo events when Firebase is unavailable
function loadDemoEvents() {
    debugLog('📚 Loading demo events...');
    // Demo events for testing
    allEvents = [
        {
            id: 'demo-1',
            name: 'Grand Wedding Celebration',
            date: '2026-02-14',
            location: 'Lagos, Nigeria',
            category: 'Wedding',
            description: 'A grand wedding celebration with music, dancing, and traditional ceremonies.',
            image: 'https://picsum.photos/300/200?random=1',
            status: 'approved',
            rsvpCount: 150
        },
        {
            id: 'demo-2',
            name: 'Naija Cultural Festival',
            date: '2026-03-01',
            location: 'Abuja, Nigeria',
            category: 'Festival',
            description: 'Celebrate Nigerian culture with music, food, art, and entertainment.',
            image: 'https://picsum.photos/300/200?random=2',
            status: 'approved',
            rsvpCount: 500
        },
        {
            id: 'demo-3',
            name: 'Baby Naming Ceremony',
            date: '2026-02-28',
            location: 'Port Harcourt, Nigeria',
            category: 'Naming',
            description: 'Traditional baby naming ceremony with family and friends.',
            image: 'https://picsum.photos/300/200?random=3',
            status: 'approved',
            rsvpCount: 75
        }
    ];
    debugLog('✓ Demo events loaded successfully');
    filterEvents();
}

// Setup event listeners for search, filters, sorting, and calendar navigation
function setupEventListeners() {
    // Search input listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterEvents);
    }
    
    // Category checkboxes listeners
    const checkboxes = document.querySelectorAll('input[name="eventType"]');
    console.log(`Found ${checkboxes.length} category checkboxes`);
    checkboxes.forEach((checkbox, index) => {
        console.log(`Adding listener to checkbox ${index}: ${checkbox.value}`);
        checkbox.addEventListener('change', function(e) {
            console.log(`Checkbox changed: ${this.value}, checked: ${this.checked}`);
            filterEvents();
        });
    });
    
    // Date range inputs listeners
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    if (dateFrom) dateFrom.addEventListener('change', filterEvents);
    if (dateTo) dateTo.addEventListener('change', filterEvents);
    
    // Sort dropdown listener
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', filterEvents);
    }
    
    // Calendar navigation buttons
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    if (prevMonth) {
        prevMonth.addEventListener('click', () => {
            selectedDate.setMonth(selectedDate.getMonth() - 1);
            renderCalendar();
        });
    }
    
    if (nextMonth) {
        nextMonth.addEventListener('click', () => {
            selectedDate.setMonth(selectedDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    // Reset filters button
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
}

// Filter events based on search term, categories, date range, and calendar selection
function filterEvents() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedTypes = Array.from(document.querySelectorAll('input[name="eventType"]:checked'))
        .map(cb => cb.value);
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const sortBy = document.getElementById('sortBy')?.value || 'date-asc';
    
    console.log('Filter called:', { searchTerm, selectedTypes, dateFrom, dateTo, totalEvents: allEvents.length });
    
    // Apply all filters to events
    let filtered = allEvents.filter(event => {
        // Search filter across name, location, description
        if (searchTerm) {
            const matchesSearch = 
                (event.name && event.name.toLowerCase().includes(searchTerm)) ||
                (event.location && event.location.toLowerCase().includes(searchTerm)) ||
                (event.description && event.description.toLowerCase().includes(searchTerm));
            if (!matchesSearch) return false;
        }
        
        // Category filter (supports 'category' and 'type' fields)
        if (selectedTypes.length > 0) {
            const eventCategory = event.category || event.type;
            console.log(`Checking event "${event.name}" - category: ${eventCategory}, selected: ${selectedTypes}`);
            if (!selectedTypes.includes(eventCategory)) {
                return false;
            }
        }
        
        // Date range filter
        if (dateFrom || dateTo) {
            const eventDate = toDateObject(event.date);
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                if (eventDate < fromDate) return false;
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                // Set to end of day for proper comparison
                toDate.setHours(23, 59, 59, 999);
                if (eventDate > toDate) return false;
            }
        }
        
        // Calendar date selection filter
        const calendarDates = document.querySelectorAll('.calendar-date.selected');
        if (calendarDates.length > 0) {
            const selectedDateObj = selectedDate;
            const eventDate = toDateObject(event.date);
            
            // Compare dates at midnight to match by day only
            const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
            const selectedDateOnly = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
            
            if (eventDateOnly.getTime() !== selectedDateOnly.getTime()) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort filtered events
    filtered = sortEvents(filtered, sortBy);
    
    // Display results
    displayEvents(filtered);
}

// Sort events by selected criteria
function sortEvents(events, sortBy) {
    const eventsCopy = [...events];
    
    switch (sortBy) {
        case 'date-asc':
            eventsCopy.sort((a, b) => toDateObject(a.date) - toDateObject(b.date));
            break;
        case 'date-desc':
            eventsCopy.sort((a, b) => toDateObject(b.date) - toDateObject(a.date));
            break;
        case 'name-asc':
            eventsCopy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'name-desc':
            eventsCopy.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            break;
        case 'rsvp-desc':
            eventsCopy.sort((a, b) => (b.rsvpCount || 0) - (a.rsvpCount || 0));
            break;
        default:
            eventsCopy.sort((a, b) => toDateObject(a.date) - toDateObject(b.date));
    }
    
    return eventsCopy;
}

// Update category statistics in sidebar or stats section
function updateCategoryStats(events) {
    const weddingCount = events.filter(e => (e.category || e.type) === 'Wedding').length;
    const festivalCount = events.filter(e => (e.category || e.type) === 'Festival').length;
    const namingCount = events.filter(e => (e.category || e.type) === 'Naming').length;
    const totalCount = events.length;
    
    // Update stat display elements
    const weddingEl = document.getElementById('weddingCount');
    const festivalEl = document.getElementById('festivalCount');
    const namingEl = document.getElementById('namingCount');
    const totalEl = document.getElementById('totalEventCount');
    
    if (weddingEl) weddingEl.textContent = weddingCount;
    if (festivalEl) festivalEl.textContent = festivalCount;
    if (namingEl) namingEl.textContent = namingCount;
    if (totalEl) totalEl.textContent = totalCount;
    
    console.log(`✓ Category stats updated - Weddings: ${weddingCount}, Festivals: ${festivalCount}, Naming: ${namingCount}`);
}

// Display filtered events in the results list with cards
function displayEvents(events) {
    debugLog(`🎨 displayEvents called with ${events.length} events`);
    
    const container = document.getElementById('eventsList');
    const eventCountSpan = document.querySelector('.results-count span');
    const eventCountEl = eventCountSpan || document.getElementById('eventCount');
    
    if (!container) {
        debugLog('✗ eventsList container not found');
        return;
    }
    
    debugLog('✓ eventsList container found');
    
    // Update event count display
    if (eventCountEl) {
        eventCountEl.textContent = events.length;
        debugLog(`✓ Event count updated to ${events.length}`);
    }
    
    // Update category statistics
    updateCategoryStats(events);
    
    // Show empty state if no events
    if (events.length === 0) {
        debugLog('⚠️ No events to display');
        container.innerHTML = '';
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'flex';
        }
        return;
    } else {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }
    
    // Build event cards HTML
    let html = '';
    events.forEach((event, index) => {
        try {
            const eventDate = toDateObject(event.date);
            const formattedDate = eventDate.toLocaleDateString();
            const eventType = event.category || event.type || 'Event';
            
            debugLog(`  ${index + 1}. "${event.name}" - ${eventType} on ${formattedDate}`);
            
            // Create event card HTML
            html += `
                <div class="event-card" onclick="viewEventDetails('${event.id}')">
                    <img src="${event.image || 'https://picsum.photos/300/200?random=' + Math.random()}" 
                         alt="${event.name}" 
                         class="event-card-image"
                         onerror="this.src='https://picsum.photos/300/200?random=default'">
                    <div class="event-card-body">
                        <h3 class="event-card-title">${event.name || 'Untitled Event'}</h3>
                        <span class="category-badge">${eventType}</span>
                        <div class="event-card-meta">
                            <span>📅 ${formattedDate}</span>
                            <span>📍 ${event.location || 'Location TBA'}</span>
                        </div>
                        <p class="event-description" style="margin: 0.8rem 0; flex-grow: 1;">${(event.description || 'No description').substring(0, 100)}...</p>
                        <button class="btn btn-primary btn-sm" onclick="viewEventDetails('${event.id}', event)" style="align-self: flex-start;">View Details</button>
                    </div>
                </div>
            `;
        } catch (error) {
            debugLog(`  ✗ Error rendering event ${index}: ${error.message}`);
        }
    });
    
    container.innerHTML = html;
    debugLog(`✓ ${events.length} events rendered to page`);
}

// Navigate to event details page with selected event
function viewEventDetails(eventId, e) {
    if (e) {
        e.stopPropagation();
    }
    
    console.log('🔍 viewEventDetails called with eventId:', eventId);
    console.log('📋 allEvents available:', allEvents.length);
    
    // Find event in array
    const event = allEvents.find(ev => ev.id === eventId);
    
    if (event) {
        console.log('✓ Event found:', event);
        // Store event in session storage for event-details page to access
        sessionStorage.setItem('selectedEvent', JSON.stringify(event));
        sessionStorage.setItem('selectedEventId', eventId);
        
        console.log('✓ Event stored in sessionStorage');
        
        // Navigate to event details page
        console.log('→ Navigating to event-details.html?id=' + eventId);
        window.location.href = `event-details.html?id=${eventId}`;
    } else {
        console.error('✗ Event not found:', eventId);
    }
}

// Reset all filters to show all events
function resetFilters() {
    // Clear search input
    document.getElementById('searchInput').value = '';
    
    // Clear date range inputs
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    
    // Uncheck all category checkboxes
    document.querySelectorAll('input[name="eventType"]').forEach(cb => cb.checked = false);
    
    // Reset sort dropdown to default
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.value = 'date-asc';
    }
    
    // Clear calendar selection
    selectedDate = new Date();
    document.querySelectorAll('.calendar-date').forEach(d => d.classList.remove('selected'));
    
    // Re-render calendar to current month
    renderCalendar();
    
    // Reapply filters to show all events
    filterEvents();
    
    console.log('✓ All filters reset');
}

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initEventListPage();
});
