/**
 * Events Page Logic - Direct Firebase (No DataManager)
 * Handles calendar, search, filtering, and event display
 */

let allEvents = [];
let selectedDate = new Date();
let selectedEvent = null;
let db = null;

/**
 * Initialize the events page
 */
async function initEventsPage() {
    console.log('✓ Events page initializing...');
    
    try {
        // Wait for Firebase
        let attempts = 0;
        while (!window.firebaseDb && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.firebaseDb) {
            console.error('✗ Firebase not available');
            document.getElementById('eventsContent').innerHTML = '<p>Failed to load database. Please refresh the page.</p>';
            return;
        }

        db = window.firebaseDb;
        console.log('✓ Firebase ready');
        
        // Render calendar
        renderCalendar();
        
        // Add event listeners
        setupEventListeners();
        
        // Load all events
        await loadAllEvents();
        
        console.log('✓ Events page initialized successfully');
    } catch (error) {
        console.error('✗ Error initializing events page:', error);
    }
}

/**
 * Render the calendar
 */
function renderCalendar() {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    // Update month/year display
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    document.getElementById('monthYear').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    
    // Previous month's days
    for (let i = firstDay - 1; i >= 0; i--) {
        const date = document.createElement('div');
        date.className = 'calendar-date other-month';
        date.textContent = daysInPrevMonth - i;
        calendar.appendChild(date);
    }
    
    // Current month's days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const date = document.createElement('div');
        date.className = 'calendar-date';
        date.textContent = i;
        
        const currentDate = new Date(year, month, i);
        
        // Check if today
        if (currentDate.toDateString() === today.toDateString()) {
            date.classList.add('today');
        }
        
        // Check if event exists on this date
        const hasEvent = allEvents.some(event => {
            const eventDate = new Date(event.date);
            return eventDate.toDateString() === currentDate.toDateString();
        });
        
        if (hasEvent) {
            date.classList.add('has-event');
        }
        
        // Add click handler
        date.addEventListener('click', () => {
            selectedDate = currentDate;
            filterEvents();
        });
        
        calendar.appendChild(date);
    }
    
    // Next month's days
    const totalCells = calendar.children.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let i = 1; i <= remainingCells; i++) {
        const date = document.createElement('div');
        date.className = 'calendar-date other-month';
        date.textContent = i;
        calendar.appendChild(date);
    }
}

/**
 * Load all events from Firestore
 */
async function loadAllEvents() {
    console.log('✓ Loading all events from Firebase...');
    
    try {
        if (!db) {
            console.error('✗ Database not ready');
            return;
        }

        // Get only approved events
        const snapshot = await db.collection('events')
            .where('status', '==', 'approved')
            .get();

        allEvents = [];
        snapshot.forEach(doc => {
            allEvents.push({ id: doc.id, ...doc.data() });
        });

        console.log(`✓ Loaded ${allEvents.length} events`);
        
        // Filter and display
        filterEvents();
        
        // Update calendar with event dates
        renderCalendar();
    } catch (error) {
        console.error('✗ Error loading events:', error);
    }
}

/**
 * Filter events based on current criteria
 */
async function filterEvents() {
    console.log('✓ Filtering events...');
    
    let filtered = [...allEvents];
    
    // Filter by search term
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(event =>
            (event.name && event.name.toLowerCase().includes(searchTerm)) ||
            (event.location && event.location.toLowerCase().includes(searchTerm)) ||
            (event.description && event.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filter by event type
    const selectedTypes = Array.from(document.querySelectorAll('input[name="eventType"]:checked'))
        .map(checkbox => checkbox.value);
    if (selectedTypes.length > 0) {
        filtered = filtered.filter(event => selectedTypes.includes(event.type));
    }
    
    // Filter by date range
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filtered = filtered.filter(event => new Date(event.date) >= fromDate);
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        filtered = filtered.filter(event => new Date(event.date) <= toDate);
    }
    
    // Filter by selected date if a specific date is selected
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() !== now.getTime()) {
        filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate.getTime() === selectedDate.getTime();
        });
    }
    
    // Display filtered events
    displayEvents(filtered);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search input
    document.getElementById('searchInput').addEventListener('input', filterEvents);
    
    // Event type checkboxes
    document.querySelectorAll('input[name="eventType"]').forEach(checkbox => {
        checkbox.addEventListener('change', filterEvents);
    });
    
    // Date range inputs
    document.getElementById('dateFrom').addEventListener('change', filterEvents);
    document.getElementById('dateTo').addEventListener('change', filterEvents);
    
    // Reset button
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        selectedDate.setMonth(selectedDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        selectedDate.setMonth(selectedDate.getMonth() + 1);
        renderCalendar();
    });
}

/**
 * Display events
 */
function displayEvents(events) {
    console.log('✓ Displaying', events.length, 'events');
    
    const container = document.getElementById('eventsList');
    if (!container) {
        console.error('✗ eventsList container not found');
        return;
    }
    
    // Update event count
    const eventCount = document.getElementById('eventCount');
    if (eventCount) {
        eventCount.textContent = events.length;
    }
    
    if (!events || events.length === 0) {
        container.innerHTML = '<p class="no-events">📭 No events found matching your criteria.</p>';
        console.log('✓ No events to display');
        return;
    }
    
    let html = '';
    
    events.forEach(event => {
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString();
        const formattedTime = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="event-card" onclick="selectEvent('${event.id}')">
                <div class="event-card-image">
                    <img src="${event.image || 'https://picsum.photos/200/150?random=' + Math.random()}" alt="${event.name}" onerror="this.src='https://picsum.photos/200/150?random=default'">
                </div>
                <div class="event-card-content">
                    <h4>${event.name || 'Untitled Event'}</h4>
                    <p class="event-type"><span class="badge badge-${event.type.toLowerCase()}">${event.type || 'Event'}</span></p>
                    <p class="event-meta">📅 ${formattedDate} at ${formattedTime}</p>
                    <p class="event-meta">📍 ${event.location || 'Location TBA'}</p>
                    <p class="event-desc">${event.description ? event.description.substring(0, 80) + '...' : 'No description'}</p>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    console.log('✓ Events displayed successfully');
}

/**
 * Select and display event details
 */
function selectEvent(eventId) {
    console.log('✓ Selecting event:', eventId);
    
    const event = allEvents.find(ev => ev.id === eventId);
    if (!event) {
        console.error('✗ Event not found:', eventId);
        return;
    }
    
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString();
    const formattedTime = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const detailPanel = document.getElementById('selectedEventDetail');
    if (!detailPanel) {
        console.error('✗ selectedEventDetail container not found');
        return;
    }
    
    let html = `
        <div class="event-detail-card">
            <img src="${event.image || 'https://picsum.photos/400/300?random=' + Math.random()}" alt="${event.name}" class="detail-image" onerror="this.src='https://picsum.photos/400/300?random=default'">
            <div class="detail-content">
                <h2>${event.name || 'Untitled Event'}</h2>
                <div class="detail-badge">
                    <span class="badge badge-${event.type.toLowerCase()}">${event.type || 'Event'}</span>
                </div>
                <div class="detail-info">
                    <p><strong>📅 Date:</strong> ${formattedDate}</p>
                    <p><strong>🕐 Time:</strong> ${formattedTime}</p>
                    <p><strong>📍 Location:</strong> ${event.location || 'Location TBA'}</p>
                    <p><strong>👤 Organizer:</strong> ${event.organizer || 'Not specified'}</p>
                    <p><strong>📧 Email:</strong> ${event.organizerEmail || 'Not specified'}</p>
                    ${event.organizerPhone ? `<p><strong>📱 Phone:</strong> ${event.organizerPhone}</p>` : ''}
                </div>
                <div class="detail-description">
                    <h3>About This Event</h3>
                    <p>${event.description || 'No description available'}</p>
                </div>
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="rsvpEvent('${event.id}')">✅ RSVP for this Event</button>
                    <button class="btn btn-secondary" onclick="shareEvent('${event.id}')">📤 Share</button>
                </div>
            </div>
        </div>
    `;
    
    detailPanel.innerHTML = html;
    console.log('✓ Event details displayed');
}

/**
 * RSVP for event
 */
function rsvpEvent(eventId) {
    alert('✅ Thank you for your interest! RSVP feature coming soon.');
}

/**
 * Share event
 */
function shareEvent(eventId) {
    const event = allEvents.find(ev => ev.id === eventId);
    if (event) {
        const text = `Check out this event: ${event.name} - ${event.location}`;
        if (navigator.share) {
            navigator.share({
                title: event.name,
                text: text,
                url: window.location.href
            });
        } else {
            alert('📤 ' + text);
        }
    }
}

/**
 * Reset filters
 */
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('input[name="eventType"]').forEach(checkbox => checkbox.checked = false);
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    
    selectedDate = new Date();
    renderCalendar();
    filterEvents();
}

/**
 * Initialize on DOM load
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('✓ DOM loaded, initializing events page');
    initEventsPage();
});
