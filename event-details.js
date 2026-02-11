/**
 * Event Details Page Module
 * 
 * Manages the display and interaction of individual event details including:
 * - Retrieving event information from Firestore or session storage
 * - Formatting and rendering event information to the DOM
 * - Managing RSVP functionality and user interactions
 * - Handling event-related actions (share, RSVP, navigation)
 */

let currentEvent = null;
let db = null;

/**
 * Initializes the event details page on document load
 * 
 * Waits for Firebase initialization, then attempts to load event data from either
 * URL parameters (direct link) or session storage (navigation from event list).
 * Displays error state if event cannot be loaded.
 */
async function initEventDetailsPage() {
    console.log('✓ Event details page initializing...');
    
    try {
        // Polling mechanism to ensure Firebase is fully initialized before proceeding
        let attempts = 0;
        while (!window.firebaseDb && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.firebaseDb) {
            console.error('✗ Firebase not available');
            showLoadingError();
            return;
        }

        db = window.firebaseDb;
        console.log('✓ Firebase ready');
        
        // Attempt to retrieve event from session storage or URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('id');
        const sessionEvent = sessionStorage.getItem('selectedEvent');
        
        if (sessionEvent) {
            // Event was passed via session storage from event list page navigation
            currentEvent = JSON.parse(sessionEvent);
            displayEventDetails();
        } else if (eventId) {
            // Event is being accessed directly via URL parameter; retrieve from database
            await loadEventFromFirestore(eventId);
        } else {
            // Event identifier not found in either storage method
            showLoadingError();
        }
        
        // Setup mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mainNav = document.querySelector('.main-nav');

        if (mobileMenuBtn && mainNav) {
            mobileMenuBtn.addEventListener('click', function() {
                mainNav.classList.toggle('mobile-active');
                console.log('✓ Mobile menu toggled');
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
        
        // Initialize menu functionality
        const menuEllipsisBtn = document.getElementById('menuEllipsisBtn');
        const menuDropdown = document.getElementById('menuDropdown');
        
        if (menuEllipsisBtn && menuDropdown) {
            console.log('✓ Menu elements found, initializing...');
            
            // Toggle menu on button click
            menuEllipsisBtn.addEventListener('click', (e) => {
                console.log('✓ Menu button clicked');
                e.stopPropagation();
                menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!menuEllipsisBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
                    menuDropdown.style.display = 'none';
                }
            });
            
            // Close menu when a link is clicked
            menuDropdown.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') {
                    menuDropdown.style.display = 'none';
                }
            });
        } else {
            console.warn('⚠ Menu elements not found on this page');
        }
        
    } catch (error) {
        console.error('✗ Error initializing event details:', error);
        showLoadingError();
    }
}

/**
 * Retrieves event data from Firestore database
 * 
 * Queries the events collection for a specific event by ID and deserializes
 * the document into the currentEvent variable for display.
 * 
 * @param {string} eventId - The unique identifier of the event to retrieve
 */
async function loadEventFromFirestore(eventId) {
    try {
        console.log('✓ Loading event:', eventId);
        
        const doc = await db.collection('events').doc(eventId).get();
        
        if (!doc.exists) {
            console.error('✗ Event not found');
            showLoadingError();
            return;
        }
        
        currentEvent = {
            id: doc.id,
            ...doc.data()
        };
        
        displayEventDetails();
        
    } catch (error) {
        console.error('✗ Error loading event:', error);
        showLoadingError();
    }
}

/**
 * Renders event details to the DOM and manages RSVP interface visibility
 * 
 * Constructs HTML representation of event information including formatted dates,
 * organizer details, and RSVP section. Conditionally displays RSVP button or
 * login prompt based on user authentication status. Updates page title and
 * retrieves current RSVP count from database.
 */
async function displayEventDetails() {
    if (!currentEvent) {
        showLoadingError();
        return;
    }
    
    console.log('✓ Displaying event details:', currentEvent);
    
    try {
        const eventDate = new Date(currentEvent.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const formattedTime = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        console.log('📝 Formatted date:', formattedDate, 'time:', formattedTime);
        
        // Populate image
        const eventImage = document.getElementById('eventImage');
        console.log('🖼️ eventImage element:', eventImage);
        if (eventImage) {
            eventImage.src = currentEvent.image || `https://picsum.photos/800/400?random=${Math.random()}`;
            eventImage.onerror = function() { this.src = 'https://picsum.photos/800/400?random=default'; };
            console.log('✓ Event image set');
        }
        
        // Populate status badge
        const statusBadge = document.getElementById('statusBadge');
        console.log('🏷️ statusBadge element:', statusBadge);
        if (statusBadge) {
            statusBadge.textContent = currentEvent.status || 'approved';
            statusBadge.className = `status-badge ${currentEvent.status || 'approved'}`;
        }
        
        // Populate title
        const eventTitle = document.getElementById('eventTitle');
        console.log('📜 eventTitle element:', eventTitle);
        if (eventTitle) {
            eventTitle.textContent = currentEvent.name || 'Untitled Event';
            console.log('✓ Title set:', currentEvent.name);
        } else {
            console.warn('⚠️ eventTitle element not found');
        }
        
        // Populate date
        const eventDateEl = document.getElementById('eventDate');
        console.log('📅 eventDate element:', eventDateEl);
        if (eventDateEl) {
            eventDateEl.textContent = formattedDate;
        }
        
        // Populate time
        const eventTimeEl = document.getElementById('eventTime');
        console.log('⏰ eventTime element:', eventTimeEl);
        if (eventTimeEl) {
            eventTimeEl.textContent = formattedTime;
        }
        
        // Populate location
        const eventLocation = document.getElementById('eventLocation');
        console.log('📍 eventLocation element:', eventLocation);
        if (eventLocation) {
            eventLocation.textContent = currentEvent.location || 'Location TBA';
        }
        
        // Populate category/type
        const eventCategory = document.getElementById('eventCategory');
        console.log('🏷️ eventCategory element:', eventCategory);
        if (eventCategory) {
            eventCategory.textContent = currentEvent.category || currentEvent.type || 'Event';
            eventCategory.className = `category-badge badge-${(currentEvent.category || currentEvent.type || 'event').toLowerCase()}`;
        }
        
        // Populate description
        const eventDescription = document.getElementById('eventDescription');
        console.log('📄 eventDescription element:', eventDescription);
        if (eventDescription) {
            eventDescription.textContent = currentEvent.description || 'No description available';
        }
        
        // Populate organizer info
        const eventOrganizer = document.getElementById('eventOrganizer');
        console.log('👤 eventOrganizer element:', eventOrganizer);
        if (eventOrganizer) {
            eventOrganizer.textContent = currentEvent.organizer || currentEvent.organizerName || 'Not specified';
        }
        
        const eventOrgEmail = document.getElementById('eventOrgEmail');
        console.log('📧 eventOrgEmail element:', eventOrgEmail);
        if (eventOrgEmail) {
            if (currentEvent.organizerEmail) {
                eventOrgEmail.innerHTML = `📧 <a href="mailto:${currentEvent.organizerEmail}">${currentEvent.organizerEmail}</a>`;
            } else {
                eventOrgEmail.textContent = '';
            }
        }
        
        const eventOrgPhone = document.getElementById('eventOrgPhone');
        console.log('📱 eventOrgPhone element:', eventOrgPhone);
        if (eventOrgPhone) {
            if (currentEvent.organizerPhone) {
                eventOrgPhone.textContent = `📱 ${currentEvent.organizerPhone}`;
            } else {
                eventOrgPhone.textContent = '';
            }
        }
        
        // Get RSVP count
        const rsvpCount = await getRSVPCount(currentEvent.id);
        const attendeeCount = document.getElementById('attendeeCount');
        if (attendeeCount) {
            attendeeCount.textContent = rsvpCount;
        }
        
        // Setup RSVP form
        const rsvpForm = document.getElementById('rsvpForm');
        if (rsvpForm) {
            rsvpForm.onsubmit = handleRSVPSubmit;
        }
        
        // Update browser tab title
        document.title = (currentEvent.name || 'Event') + ' - Naija Events';
        
        console.log('✓ Event details displayed successfully');
    } catch (error) {
        console.error('✗ Error displaying event details:', error);
        showLoadingError();
    }
}

/**
 * Displays error state when event cannot be loaded from data sources
 * 
 * Renders a user-friendly error message and provides navigation back to
 * the events listing page for users to continue browsing.
 */
function showLoadingError() {
    const eventTitle = document.getElementById('eventTitle');
    const eventDescription = document.getElementById('eventDescription');
    
    if (eventTitle) {
        eventTitle.textContent = '❌ Unable to load event';
    }
    
    if (eventDescription) {
        eventDescription.innerHTML = '<p>The event may not exist or has been removed.</p><a href="event-list.html" class="btn btn-primary" style="margin-top: 1rem;">← Return to Events</a>';
    }
}

/**
 * RSVP to event
 */
async function rsvpEvent() {
    const user = window.firebaseAuth?.currentUser;
    
    if (!user) {
        alert('Please log in to RSVP for events.');
        openAuthModal();
        return;
    }
    
    // Show RSVP form modal
    openRSVPModal();
}

/**
 * Open RSVP modal
 */
function openRSVPModal() {
    const modal = document.getElementById('rsvpModal');
    if (!modal) {
        // Create modal if it doesn't exist
        createRSVPModal();
        document.getElementById('rsvpModal').style.display = 'flex';
        return;
    }
    modal.style.display = 'flex';
}

/**
 * Close RSVP modal
 */
function closeRSVPModal() {
    const modal = document.getElementById('rsvpModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Create RSVP modal
 */
function createRSVPModal() {
    const user = window.firebaseAuth?.currentUser;
    
    let html = `
        <div id="rsvpModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>RSVP for Event</h2>
                    <button class="close-btn" onclick="closeRSVPModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="rsvpForm" onsubmit="handleRSVPSubmit(event)">
                        <div class="form-group">
                            <label for="rsvpName">Full Name *</label>
                            <input type="text" id="rsvpName" placeholder="Your full name" required value="${user?.displayName || ''}">
                        </div>
                        <div class="form-group">
                            <label for="rsvpEmail">Email Address *</label>
                            <input type="email" id="rsvpEmail" placeholder="Your email" required value="${user?.email || ''}">
                        </div>
                        <div class="form-group">
                            <label for="rsvpPhone">Phone Number (Optional)</label>
                            <input type="tel" id="rsvpPhone" placeholder="Your phone number">
                        </div>
                        <div id="rsvpMessage" class="auth-message" style="display: none;"></div>
                        <button type="submit" class="btn btn-primary btn-block" id="rsvpSubmitBtn">Confirm RSVP</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Handle RSVP form submission
 */
async function handleRSVPSubmit(event) {
    event.preventDefault();
    
    if (!currentEvent) {
        alert('Error: Event not loaded');
        return;
    }
    
    const name = document.getElementById('rsvpName').value.trim();
    const email = document.getElementById('rsvpEmail').value.trim();
    const phone = document.getElementById('rsvpPhone').value.trim();
    const submitBtn = document.getElementById('rsvpSubmitBtn');
    const messageDiv = document.getElementById('rsvpMessage');
    
    // Validate
    if (!name || !email) {
        showRSVPMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving RSVP...';
    
    try {
        // Add RSVP to Firebase
        const result = await addRSVP(currentEvent.id, {
            name: name,
            email: email,
            phone: phone
        });
        
        if (result.success) {
            showRSVPMessage(result.message, 'success');
            
            // Send notification email to organizer
            if (currentEvent.organizerEmail) {
                console.log('📧 Sending RSVP notification email...');
                await sendRSVPNotification(
                    currentEvent.id, 
                    currentEvent.name, 
                    currentEvent.organizerEmail, 
                    { name, email, phone }
                );
            }
            
            // Reset form
            document.getElementById('rsvpForm').reset();
            
            // Reload attendee count after 1.5 seconds
            setTimeout(() => {
                closeRSVPModal();
                displayEventDetails(); // Reload to show updated count
            }, 1500);
        } else {
            showRSVPMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Error submitting RSVP:', error);
        showRSVPMessage('Error saving RSVP. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm RSVP';
    }
}

/**
 * Show RSVP message
 */
function showRSVPMessage(message, type) {
    const messageDiv = document.getElementById('rsvpMessage');
    if (!messageDiv) return;
    
    messageDiv.textContent = message;
    messageDiv.className = 'auth-message ' + (type === 'error' ? 'error' : 'success');
    messageDiv.style.display = 'block';
}

/**
 * Share event
 */
function shareEvent() {
    const text = `Check out this event: ${currentEvent.name} - ${currentEvent.location}`;
    const url = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: currentEvent.name,
            text: text,
            url: url
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('📤 Event link copied to clipboard!');
        });
    }
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', initEventDetailsPage);
