setTimeout(() => { // Main app file - handles navigation, events, and UI stuff - Check if menu elements exist
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.querySelector('.main-nav');
}, 0);

document.addEventListener('DOMContentLoaded', function() { // Setup mobile menu
    
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.querySelector('.main-nav');

    if (mobileMenuBtn && mainNav) {
        
        mobileMenuBtn.addEventListener('click', function() {
            mainNav.classList.toggle('mobile-active');
        });

        const navLinks = mainNav.querySelectorAll('.nav-link'); // Close menu when nav link clicked
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mainNav.classList.remove('mobile-active');
            });
        });

        document.addEventListener('click', function(e) { // Close menu when clicking outside
            if (!mobileMenuBtn.contains(e.target) && !mainNav.contains(e.target)) {
                if (mainNav.classList.contains('mobile-active')) {
                    mainNav.classList.remove('mobile-active');
                }
            }
        });
    }
    
    if (window.dataManager) { // Wait for dataManager to be ready
        initializeApp();
    } else {
        const checkInterval = setInterval(() => {
            if (window.dataManager) {
                clearInterval(checkInterval);
                initializeApp();
            }
        }, 100);
    }
});

async function loadFeaturedEvents() { // Load featured events for homepage
    if (!window.dataManager) return;
    
    const events = await dataManager.getAllEvents();
    const approvedEvents = events
        .filter(e => e.status === 'approved')
        .slice(0, 6);

    const container = document.getElementById('featuredEvents');
    if (!container) return;

    container.innerHTML = approvedEvents.map(event => `
        <div class="event-card" onclick="viewEventDetails('${event.id}')">
            <img src="${event.image}" alt="${event.title}" class="event-card-image" onerror="this.src='https://via.placeholder.com/400x300?text=${encodeURIComponent(event.title)}'">
            <div class="event-card-body">
                <h3 class="event-card-title">${event.title}</h3>
                <div class="event-card-meta">
                    <span><span class="icon">📅</span> ${formatDate(event.date)}</span>
                    <span><span class="icon">⏰</span> ${event.time}</span>
                    <span><span class="icon">📍</span> ${event.location}</span>
                </div>
                <span class="category-badge">${event.category}</span>
            </div>
        </div>
    `).join('');
}

function filterByCategory(category) {
    sessionStorage.setItem('selectedCategory', category); // Store the category and redirect to events page
    window.location.href = 'pages/events.html';
}

function searchFromHome() {
    const query = document.getElementById('heroSearch').value.trim();
    if (query) {
        sessionStorage.setItem('searchQuery', query);
        window.location.href = 'pages/events.html';
    }
}

function renderEventCard(event) { // EVENT LISTING & FILTERING
    return `
        <div class="event-card" onclick="viewEventDetails(${event.id})">
            <img src="${event.image}" alt="${event.title}" class="event-card-image" onerror="this.src='https://via.placeholder.com/400x300?text=${encodeURIComponent(event.title)}'">
            <div class="event-card-body">
                <h3 class="event-card-title">${event.title}</h3>
                <div class="event-card-meta">
                    <span><span class="icon">📅</span> ${formatDate(event.date)}</span>
                    <span><span class="icon">⏰</span> ${event.time}</span>
                    <span><span class="icon">📍</span> ${event.location}</span>
                </div>
                <span class="category-badge">${event.category}</span>
            </div>
        </div>
    `;
}

function applyFilters() {
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
        .map(cb => cb.value);
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';

    (async () => { // Make applyFilters async to handle async getAllEvents()
        try {
            let events = await dataManager.getAllEvents();
            events = events.filter(e => e.status === 'approved');

            if (searchQuery) { // Filter by search
                events = events.filter(e =>
                    e.title.toLowerCase().includes(searchQuery) ||
                    e.location.toLowerCase().includes(searchQuery) ||
                    e.description.toLowerCase().includes(searchQuery)
                );
            }

            if (selectedCategories.length > 0 && !selectedCategories.includes('all')) { // Filter by category
                events = events.filter(e => selectedCategories.includes(e.category));
            }

            if (dateFrom) { // Filter by date range
                events = events.filter(e => e.date >= dateFrom);
            }
            if (dateTo) {
                events = events.filter(e => e.date <= dateTo);
            }

            events.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date

            const countElement = document.getElementById('eventCount'); // Update event count
            if (countElement) {
                countElement.textContent = events.length;
            }

            const eventsList = document.getElementById('eventsList'); // Render events
            if (eventsList) {
                if (events.length > 0) {
                    eventsList.innerHTML = events.map(renderEventCard).join('');
                } else {
                    eventsList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #666; font-size: 1.1rem;">No events found. Try adjusting your filters.</p>';
                }
            }
        } catch (error) {
        }
    })();
}

function resetFilters() {
    const searchInput = document.getElementById('searchInput'); // Clear search
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('input[name="category"]').forEach(cb => { // Clear categories
        cb.checked = cb.value === 'all';
    });

    document.getElementById('dateFrom').value = ''; // Clear dates
    document.getElementById('dateTo').value = '';

    applyFilters();
}

function viewEventDetails(eventId) {
    window.location.href = `event-details.html?id=${eventId}`;
}

function loadEventDetails() { // EVENT DETAILS
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    if (!eventId) {
        window.location.href = 'events.html';
        return;
    }

    (async () => { // Load event details asynchronously
        const event = await dataManager.getEventById(parseInt(eventId));
        if (!event) {
            document.body.innerHTML = '<p>Event not found</p>';
            return;
        }

        document.getElementById('eventImage').src = event.image; // Populate event details
        document.getElementById('eventImage').onerror = function() {
            this.src = `https://via.placeholder.com/800x400?text=${encodeURIComponent(event.title)}`;
        };
        document.getElementById('eventTitle').textContent = event.title;
        document.getElementById('eventDate').textContent = formatDate(event.date);
        document.getElementById('eventTime').textContent = event.time;
        document.getElementById('eventLocation').textContent = event.location;
        document.getElementById('eventCategory').textContent = event.category;
        document.getElementById('eventCategory').className = `category-badge ${event.category.toLowerCase()}`;
        document.getElementById('eventDescription').textContent = event.description;
        document.getElementById('eventOrganizer').textContent = event.organizer;
        document.getElementById('eventOrgEmail').textContent = event.organizerEmail;
        document.getElementById('eventOrgPhone').textContent = event.organizerPhone;

        const attendeeCount = event.attendees ? event.attendees.length : 0; // Attendee count
        document.getElementById('attendeeCount').textContent = attendeeCount;

        const statusBadge = document.getElementById('statusBadge'); // Status badge
        statusBadge.textContent = event.status;
        statusBadge.className = `status-badge ${event.status}`;

        const rsvpForm = document.getElementById('rsvpForm'); // RSVP Form
        if (rsvpForm) {
            rsvpForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handleRsvp(event.id);
            });
        }

        loadSimilarEvents(event); // Load similar events
    })();
}

function handleRsvp(eventId) {
    const name = document.getElementById('rsvpName').value.trim();
    const email = document.getElementById('rsvpEmail').value.trim();
    const phone = document.getElementById('rsvpPhone').value.trim();

    if (!name || !email) {
        alert('Please fill in required fields');
        return;
    }

    (async () => { // Handle RSVP asynchronously
        const result = await dataManager.addRsvp({
            eventId: eventId,
            name: name,
            email: email,
            phone: phone
        });

        const rsvpStatus = document.getElementById('rsvpStatus');
        if (result.error) {
            rsvpStatus.textContent = result.error;
            rsvpStatus.className = 'rsvp-status error-message';
        } else {
            document.getElementById('rsvpForm').reset();
            rsvpStatus.textContent = '✓ You have successfully RSVP\'d to this event!';
            rsvpStatus.className = 'rsvp-status success';

            const event = await dataManager.getEventById(eventId); // Update attendee count
            document.getElementById('attendeeCount').textContent = event.attendees.length;
        }
    })();
}

function loadSimilarEvents(currentEvent) {
    (async () => { // Make async to handle async getAllEvents()
        const allEvents = await dataManager.getAllEvents();
        const similarEvents = allEvents
            .filter(e => e.id !== currentEvent.id && 
                         e.category === currentEvent.category &&
                         e.status === 'approved')
            .slice(0, 3);

        const container = document.getElementById('similarEvents');
        if (container) {
            container.innerHTML = similarEvents.length > 0
                ? similarEvents.map(renderEventCard).join('')
                : '<p style="grid-column: 1/-1; text-align: center;">No similar events available</p>';
        }
    })();
}

function shareEvent(platform) {
    const url = window.location.href;
    const title = document.getElementById('eventTitle').textContent;
    const text = `Check out this event: ${title}`;

    const shareUrls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    };

    if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank');
    }
}

function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert('Event link copied to clipboard!');
    });
}

function initPostEventForm() { // POST EVENT FORM
    console.log('═══ INITIALIZING POST EVENT FORM ═══');
    console.log('✓ Looking for eventForm element...');
    
    const eventForm = document.getElementById('eventForm');
    console.log('✓ eventForm found:', !!eventForm);
    if (eventForm) {
        console.log('  - eventForm ID:', eventForm.id);
        console.log('  - eventForm class:', eventForm.className);
    }
    
    const imageInput = document.getElementById('eventImage');
    const imagePreview = document.getElementById('imagePreview');

    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    imagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (eventForm) {
        console.log('✓✓✓ Event form FOUND, attaching submit listeners...');
        
        eventForm.addEventListener('submit', function(e) { // Primary listener
            console.log('');
            console.log('╔════════════════════════════════════════════════════════════╗');
            console.log('║ SUBMIT BUTTON CLICKED - addEventListener handler triggered');
            console.log('║ Preventing default form submission behavior...');
            console.log('╚════════════════════════════════════════════════════════════╝');
            e.preventDefault();
            console.log('✓ preventDefault() called successfully');
            console.log('✓ Calling submitEventForm()...');
            submitEventForm();
        });
        
        eventForm.onsubmit = function(e) { // Backup listener
            console.log('✗✗✗ BACKUP HANDLER: Form somehow triggered onsubmit (should not happen)');
            e.preventDefault();
            return false;
        };
        
        console.log('✓✓✓ Submit listeners attached successfully');
        console.log('═══ POST EVENT FORM INITIALIZATION COMPLETE ═══');
    } else {
        console.error('✗✗✗ CRITICAL ERROR: Event form NOT found');
        const allForms = document.querySelectorAll('form');
        console.log('✗ Found ' + allForms.length + ' form(s) on page');
        allForms.forEach((form, idx) => {
            console.log('  Form ' + idx + ': ID="' + form.id + '", class="' + form.className + '"');
        });
    }
}

function submitEventForm() {
    console.log('═══ SUBMIT EVENT FORM STARTED ═══');
    
    const successMsg = document.getElementById('successMessage'); // Show processing indicator immediately
    successMsg.innerHTML = '⏳ <strong>Processing your event...</strong><br>Please wait while we save your event.';
    successMsg.classList.add('show');
    successMsg.style.display = 'block';
    successMsg.style.color = '#0066cc';
    successMsg.style.padding = '1rem';
    successMsg.style.backgroundColor = '#e0f0ff';
    successMsg.style.border = '2px solid #0066cc';
    
    const title = document.getElementById('eventTitle').value.trim(); // Validate form
    const category = document.getElementById('eventCategory').value;
    const description = document.getElementById('eventDescription').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value.trim();
    const organizer = document.getElementById('organizer').value.trim();
    const organizerEmail = document.getElementById('organizerEmail').value.trim();
    const agreeTerms = document.getElementById('agreeTerms').checked;

    console.log('✓ Form values extracted:', {
        title: title.substring(0, 30),
        category,
        date,
        time,
        location: location.substring(0, 30),
        organizer,
        organizerEmail,
        agreeTerms
    });

    document.querySelectorAll('.error-message').forEach(el => el.textContent = ''); // Clear previous errors

    let isValid = true;

    if (!title) {
        document.getElementById('titleError').textContent = 'Title is required';
        isValid = false;
    }
    if (!category) {
        document.getElementById('categoryError').textContent = 'Category is required';
        isValid = false;
    }
    if (!description || description.length < 10) {
        document.getElementById('descriptionError').textContent = 'Description must be at least 10 characters';
        isValid = false;
    }
    if (!date) {
        document.getElementById('dateError').textContent = 'Date is required';
        isValid = false;
    }
    if (!time) {
        document.getElementById('timeError').textContent = 'Time is required';
        isValid = false;
    }
    if (!location) {
        document.getElementById('locationError').textContent = 'Location is required';
        isValid = false;
    }
    if (!organizer) {
        document.getElementById('organizerError').textContent = 'Name is required';
        isValid = false;
    }
    if (!organizerEmail || !isValidEmail(organizerEmail)) {
        document.getElementById('emailError').textContent = 'Valid email is required';
        isValid = false;
    }
    if (!agreeTerms) {
        document.getElementById('termsError').textContent = 'You must agree to the terms';
        isValid = false;
    }

    if (!isValid) {
        console.error('✗ Form validation FAILED');
        return;
    }

    console.log('✓ Form validation PASSED');
    console.log('✓ Starting async database operation...');

    (async () => { // Use async to handle database operations
        try {
            console.log('✓ Inside async function');
            
            let attempts = 0; // Wait for dataManager to be available
            while (!window.dataManager && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
                if (attempts === 1 || attempts % 10 === 0) {
                    console.log(`⏳ Waiting for dataManager... (attempt ${attempts})`);
                }
            }

            if (!window.dataManager) {
                console.error('✗✗✗ DataManager NOT available after 5 seconds of waiting');
                alert('❌ Database connection not ready. Please refresh the page and try again.');
                return;
            }

            console.log('✓ DataManager is NOW available after', attempts, 'attempts');
            console.log('✓ DataManager object:', {
                hasCreateEvent: !!window.dataManager.createEvent,
                hasDb: !!window.dataManager.db,
                type: typeof window.dataManager
            });

            const eventData = { // Create event data with correct field names
                name: title,
                type: category,
                description,
                date: new Date(date).toISOString(),
                location,
                organizer,
                organizerEmail,
                organizerPhone: document.getElementById('organizerPhone').value.trim() || '',
                image: `https://picsum.photos/400/300?random=${Math.random()}`,
                status: 'pending' // Events from post-event page are pending approval (inline stay)
            };

            console.log('✓ Event data prepared:', eventData);
            console.log('✓ Calling window.dataManager.createEvent()...');

            const result = await window.dataManager.createEvent(eventData); // Create event in database
            
            console.log('✓ Database response received:', result);

            if (result && result.id) {
                console.log('✓✓✓ SUCCESS! Event created with ID:', result.id);

                const successMsg = document.getElementById('successMessage'); // Show success message
                successMsg.innerHTML = '✅ <strong>Event submitted successfully!</strong><br>Admin will review it shortly and it will appear on Browse Events once approved.';
                successMsg.classList.add('show');
                successMsg.style.display = 'block';
                successMsg.style.color = '#065f46';
                successMsg.style.padding = '1rem';

                document.getElementById('eventForm').reset(); // Reset form
                document.getElementById('imagePreview').innerHTML = '<p>No image selected. A placeholder will be used.</p>';

                console.log('✓ Form reset, will redirect in 3 seconds...');

                setTimeout(() => { // Redirect after 3 seconds
                    console.log('✓ Now redirecting to events page...');
                    window.location.href = 'events.html';
                }, 3000);
            } else {
                console.error('✗ Event creation returned no ID:', result);
                const successMsg = document.getElementById('successMessage');
                successMsg.innerHTML = '❌ Failed to create event. Result: ' + JSON.stringify(result);
                successMsg.classList.add('show');
                successMsg.style.display = 'block';
                successMsg.style.color = '#dc2626';
                successMsg.style.padding = '1rem';
            }
        } catch (error) {
            console.error('✗✗✗ ERROR in async function:', error);
            console.error('✗ Error message:', error.message);
            console.error('✗ Error stack:', error.stack);
            const successMsg = document.getElementById('successMessage');
            successMsg.innerHTML = `❌ Error: ${error.message}`;
            successMsg.classList.add('show');
            successMsg.style.display = 'block';
            successMsg.style.color = '#dc2626';
            successMsg.style.padding = '1rem';
        }
    })();
    
    console.log('✓ Async function started, submitEventForm exiting');
}

function initCalendar() { // CALENDAR FUNCTIONS
    const calendar = document.getElementById('calendar');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');

    if (!calendar) return;

    let currentDate = new Date();

    function renderCalendar(date) {
        const year = date.getFullYear();
        const month = date.getMonth();

        const monthYearElement = document.getElementById('monthYear'); // Update month/year display
        if (monthYearElement) {
            monthYearElement.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        calendar.innerHTML = ''; // Clear calendar

        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Add day headers
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header';
            header.textContent = day;
            calendar.appendChild(header);
        });

        const firstDay = new Date(year, month, 1).getDay(); // Get first day of month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        for (let i = firstDay - 1; i >= 0; i--) { // Add previous month's days
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            dayElement.textContent = daysInPrevMonth - i;
            calendar.appendChild(dayElement);
        }

        const today = new Date(); // Add current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            dayElement.setAttribute('data-date', dateStr);

            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) { // Check if today
                dayElement.classList.add('today');
            }

            dayElement.addEventListener('click', () => { // Event click handler
                if (dayElement.classList.contains('has-event')) {
                    filterByDate(dateStr);
                }
            });

            calendar.appendChild(dayElement);
        }

        const totalCells = calendar.children.length - 7; // Add next month's days (Minus day headers)
        const remainingCells = 42 - totalCells; // 6 rows * 7 days
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            dayElement.textContent = day;
            calendar.appendChild(dayElement);
        }
        
        updateCalendarEvents(year, month); // After rendering the calendar structure, highlight event dates
    }

    renderCalendar(currentDate); // Initial calendar render

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(currentDate);
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(currentDate);
        });
    }
}

async function updateCalendarEvents(year, month) { // Update calendar to show which dates have events
    try {
        const allEvents = await dataManager.getAllEvents();
        const approvedEvents = allEvents.filter(e => e.status === 'approved');
        
        const dayElements = document.querySelectorAll('.calendar-day[data-date]'); // Find all calendar day elements for this month
        dayElements.forEach(dayElement => {
            const dateStr = dayElement.getAttribute('data-date');
            const hasEvent = approvedEvents.some(e => e.date === dateStr);
            
            if (hasEvent) {
                dayElement.classList.add('has-event');
                dayElement.style.cursor = 'pointer';
            } else {
                dayElement.classList.remove('has-event');
                dayElement.style.cursor = 'default';
            }
        });
        
        console.log("✓ Calendar events updated");
    } catch (error) {
        console.error("✗ Error updating calendar events:", error);
    }
}

function updateCalendarDates(events) {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    const eventDates = events.map(e => e.date); // Get dates with events

    const calendarDays = document.querySelectorAll('.calendar-day:not(.other-month)'); // Update calendar days
    calendarDays.forEach(dayElement => {
        if (dayElement.classList.contains('calendar-header')) return;

        const monthYear = document.getElementById('monthYear').textContent;
        const month = new Date(monthYear + ' 1').getMonth();
        const year = new Date(monthYear + ' 1').getFullYear();
        const day = parseInt(dayElement.textContent);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (eventDates.includes(dateStr)) {
            dayElement.classList.add('has-event');
        } else {
            dayElement.classList.remove('has-event');
        }
    });
}

function filterByDate(dateStr) {
    document.getElementById('dateFrom').value = dateStr;
    document.getElementById('dateTo').value = dateStr;
    applyFilters();
}

function formatDate(dateStr) { // UTILITY FUNCTIONS
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', options);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function initializePageContent() { // Page content initialization
    console.log("Initializing page content...");
    
    if (document.getElementById('featuredEvents')) { // Load featured events on home page
        loadFeaturedEvents();
    }

    if (document.getElementById('calendar')) { // Initialize calendar and filters on events page
        console.log("Events page detected, initializing filters and calendar...");
        
        document.getElementById('searchInput')?.addEventListener('input', applyFilters); // Set up filter listeners first
        document.querySelectorAll('input[name="category"]').forEach(cb => {
            cb.addEventListener('change', applyFilters);
        });
        document.getElementById('dateFrom')?.addEventListener('change', applyFilters);
        document.getElementById('dateTo')?.addEventListener('change', applyFilters);
        document.getElementById('resetFilters')?.addEventListener('click', resetFilters);

        const selectedCategory = sessionStorage.getItem('selectedCategory'); // Apply initial filters based on session storage
        const searchQuery = sessionStorage.getItem('searchQuery');
        
        if (selectedCategory) {
            const categoryCheckbox = document.querySelector(`input[value="${selectedCategory}"]`);
            if (categoryCheckbox) categoryCheckbox.checked = true;
            sessionStorage.removeItem('selectedCategory');
        }
        
        if (searchQuery) {
            document.getElementById('searchInput').value = searchQuery;
            sessionStorage.removeItem('searchQuery');
        }

        console.log("Initializing calendar..."); // Initialize calendar first
        initCalendar();
        
        setTimeout(() => { // Then load and display events with a small delay
            console.log("Loading events...");
            applyFilters();
        }, 200);
    }

    if (document.getElementById('eventImage')) { // Load event details
        loadEventDetails();
    }

    if (document.getElementById('eventForm')) { // Initialize post event form
        initPostEventForm();
    }
}
