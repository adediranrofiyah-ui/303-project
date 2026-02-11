/**
 * User Profile Module
 * Handles user profile display, editing, and event management
 * 
 * Features:
 * - Display user profile information
 * - Show created events
 * - Show RSVP'd events
 * - Edit profile information
 * - Tab navigation
 */

let userProfile = {};
let db = null;

/**
 * Initialize profile page
 */
async function initProfilePage() {
    console.log('✓ Profile page initializing...');
    
    try {
        // Wait for Firebase
        let attempts = 0;
        while (!window.firebaseDb && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.firebaseDb) {
            console.error('✗ Firebase not available');
            return;
        }

        db = window.firebaseDb;
        console.log('✓ Firebase ready');

        // Check authentication state using Firebase's auth
        return new Promise((resolve) => {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (!user) {
                    console.warn('⚠ User not logged in');
                    window.location.href = '../index.html';
                    resolve();
                    return;
                }

                console.log('✓ User authenticated:', user.email);

                // Store user reference
                window.currentUser = user;

                // Load user profile
                await loadUserProfile();

                // Display profile info
                displayProfileInfo();

                // Load created events
                await loadCreatedEvents();

                // Load event attendees for created events
                await loadEventAttendees();

                // Load RSVP'd events
                await loadRsvpEvents();

                // Setup event listeners
                setupProfileListeners();

                console.log('✓ Profile page loaded successfully');
                resolve();
            });
        });
    } catch (error) {
        console.error('✗ Profile page error:', error);
    }
}

/**
 * Load user profile from Firestore
 */
async function loadUserProfile() {
    try {
        const userRef = db.collection('users').doc(window.currentUser.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            userProfile = userDoc.data();
            console.log('✓ User profile loaded');
        } else {
            // Create new profile document
            userProfile = {
                email: window.currentUser.email,
                displayName: window.currentUser.email.split('@')[0],
                phoneNumber: '',
                location: '',
                bio: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await userRef.set(userProfile);
            console.log('✓ New user profile created');
        }
    } catch (error) {
        console.error('✗ Error loading profile:', error);
    }
}

/**
 * Display profile information
 */
function displayProfileInfo() {
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const memberEl = document.getElementById('profileMemberSince');

    if (nameEl) {
        nameEl.textContent = userProfile.displayName || 'User Profile';
    }

    if (emailEl) {
        emailEl.textContent = userProfile.email;
    }

    if (memberEl && userProfile.createdAt) {
        const joinDate = new Date(userProfile.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        memberEl.textContent = `Member since ${joinDate}`;
    }

    // Populate form fields
    populateProfileForm();
}

/**
 * Populate edit form with current profile data
 */
function populateProfileForm() {
    document.getElementById('displayName').value = userProfile.displayName || '';
    document.getElementById('phoneNumber').value = userProfile.phoneNumber || '';
    document.getElementById('location').value = userProfile.location || '';
    document.getElementById('bio').value = userProfile.bio || '';
}

/**
 * Load events created by user
 */
async function loadCreatedEvents() {
    try {
        const eventsRef = db.collection('events');
        const snapshot = await eventsRef.where('organizerId', '==', window.currentUser.uid).get();

        const events = [];
        snapshot.forEach(doc => {
            events.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayCreatedEvents(events);
        console.log(`✓ Loaded ${events.length} created events`);
    } catch (error) {
        console.error('✗ Error loading created events:', error);
    }
}

/**
 * Display created events
 */
function displayCreatedEvents(events) {
    const container = document.getElementById('createdEventsList');

    if (!container) return;

    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>📭 You haven\'t created any events yet. <a href="post-event.html">Create one now!</a></p></div>';
        return;
    }

    const html = events.map(event => {
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <div class="event-card" onclick="viewEventDetails('${event.id}', event)">
                <img src="${event.image || 'https://picsum.photos/300/200?random=default'}" 
                     alt="${event.name}" 
                     class="event-card-image"
                     onerror="this.src='https://picsum.photos/300/200?random=default'">
                <div class="event-card-content">
                    <h3>${event.name || 'Untitled Event'}</h3>
                    <div class="event-card-meta">
                        <span class="event-type-badge badge-${event.type.toLowerCase()}">${event.type}</span>
                        <span class="event-date">📅 ${formattedDate}</span>
                    </div>
                    <p class="event-location">📍 ${event.location || 'Location TBA'}</p>
                    <p class="event-description">${(event.description || 'No description').substring(0, 100)}...</p>
                    <div class="event-actions">
                        <button class="btn btn-sm btn-primary" onclick="viewEventDetails('${event.id}', event); event.stopPropagation();">View Details</button>
                        <button class="btn btn-sm btn-secondary" onclick="editEvent('${event.id}'); event.stopPropagation();">Edit</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Load attendees for events created by user
 */
async function loadEventAttendees() {
    try {
        const eventsRef = db.collection('events');
        const eventsSnapshot = await eventsRef.where('organizerId', '==', window.currentUser.uid).get();

        const eventsList = [];
        
        for (const doc of eventsSnapshot.docs) {
            const event = {
                id: doc.id,
                name: doc.data().name || 'Untitled Event',
                ...doc.data()
            };

            // Get attendees for this event
            const attendeesSnapshot = await db.collection('events').doc(event.id).collection('attendees').get();
            
            const attendees = [];
            for (const attendeeDoc of attendeesSnapshot.docs) {
                attendees.push({
                    id: attendeeDoc.id,
                    email: attendeeDoc.data().email,
                    timestamp: attendeeDoc.data().timestamp
                });
            }

            eventsList.push({
                ...event,
                attendees: attendees
            });
        }

        displayEventAttendees(eventsList);
        console.log(`✓ Loaded attendees for ${eventsList.length} events`);
    } catch (error) {
        console.error('✗ Error loading event attendees:', error);
    }
}

/**
 * Display attendees for user's created events
 */
function displayEventAttendees(eventsList) {
    const container = document.getElementById('attendeesList');

    if (!container) return;

    if (eventsList.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>📭 You haven\'t created any events yet. <a href="post-event.html">Create one now!</a></p></div>';
        return;
    }

    // Filter out events with no attendees
    const eventsWithAttendees = eventsList.filter(event => event.attendees && event.attendees.length > 0);
    const eventsWithoutAttendees = eventsList.filter(event => !event.attendees || event.attendees.length === 0);

    let html = '';

    // Display events with attendees
    eventsWithAttendees.forEach(event => {
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        html += `
            <div class="attendees-section">
                <div class="event-header">
                    <h3>📍 ${event.name}</h3>
                    <span class="attendee-count">👥 ${event.attendees.length} attendee${event.attendees.length !== 1 ? 's' : ''}</span>
                    <span class="event-date">${formattedDate}</span>
                </div>
                <div class="attendees-list">
                    ${event.attendees.map(attendee => {
                        const attendeeDate = new Date(attendee.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });
                        return `
                            <div class="attendee-card">
                                <div class="attendee-avatar">👤</div>
                                <div class="attendee-info">
                                    <p class="attendee-email">${attendee.email}</p>
                                    <p class="attendee-date">RSVP'd on ${attendeeDate}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    // Display events without attendees
    if (eventsWithoutAttendees.length > 0) {
        html += `
            <div class="no-attendees-section">
                <h3>Events with No Attendees Yet</h3>
                ${eventsWithoutAttendees.map(event => {
                    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    });
                    return `
                        <div class="empty-event-card">
                            <p>📅 ${event.name} (${eventDate})</p>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    container.innerHTML = html || '<div class="empty-state"><p>No attendees yet. Share your events to get RSVPs!</p></div>';
}

/**
 * Load events user has RSVP'd to
 */
async function loadRsvpEvents() {
    try {
        const rsvpRef = db.collection('rsvps');
        const snapshot = await rsvpRef.where('userId', '==', window.currentUser.uid).get();

        const eventIds = [];
        snapshot.forEach(doc => {
            eventIds.push(doc.data().eventId);
        });

        if (eventIds.length === 0) {
            displayRsvpEvents([]);
            return;
        }

        // Fetch event details for RSVP'd events
        const eventsRef = db.collection('events');
        const events = [];

        for (const eventId of eventIds) {
            const eventDoc = await eventsRef.doc(eventId).get();
            if (eventDoc.exists) {
                events.push({
                    id: eventDoc.id,
                    ...eventDoc.data()
                });
            }
        }

        displayRsvpEvents(events);
        console.log(`✓ Loaded ${events.length} RSVP'd events`);
    } catch (error) {
        console.error('✗ Error loading RSVP events:', error);
    }
}

/**
 * Display RSVP'd events
 */
function displayRsvpEvents(events) {
    const container = document.getElementById('rsvpEventsList');

    if (!container) return;

    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>📭 You haven\'t RSVP\'d to any events yet. <a href="event-list.html">Browse events</a> and RSVP today!</p></div>';
        return;
    }

    const html = events.map(event => {
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <div class="event-card" onclick="viewEventDetails('${event.id}', event)">
                <img src="${event.image || 'https://picsum.photos/300/200?random=default'}" 
                     alt="${event.name}" 
                     class="event-card-image"
                     onerror="this.src='https://picsum.photos/300/200?random=default'">
                <div class="event-card-content">
                    <h3>${event.name || 'Untitled Event'}</h3>
                    <div class="event-card-meta">
                        <span class="event-type-badge badge-${event.type.toLowerCase()}">${event.type}</span>
                        <span class="event-date">📅 ${formattedDate}</span>
                    </div>
                    <p class="event-location">📍 ${event.location || 'Location TBA'}</p>
                    <p class="event-description">${(event.description || 'No description').substring(0, 100)}...</p>
                    <button class="btn btn-primary btn-sm" onclick="viewEventDetails('${event.id}', event); event.stopPropagation();">View Details</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Setup event listeners for profile page
 */
function setupProfileListeners() {
    // Tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfile);
    }

    // Edit profile button
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => switchTab('edit'));
    }

    console.log('✓ Profile listeners setup');
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Deactivate all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tabElement = document.getElementById(tabName + 'Tab');
    if (tabElement) {
        tabElement.classList.add('active');
    }

    // Activate selected button
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    console.log(`✓ Switched to ${tabName} tab`);
}

/**
 * Save profile changes
 */
async function saveProfile(e) {
    e.preventDefault();

    try {
        const messageEl = document.getElementById('profileMessage');

        const updatedProfile = {
            displayName: document.getElementById('displayName').value || userProfile.displayName,
            phoneNumber: document.getElementById('phoneNumber').value,
            location: document.getElementById('location').value,
            bio: document.getElementById('bio').value,
            updatedAt: new Date()
        };

        // Update Firestore
        await db.collection('users').doc(window.currentUser.uid).update(updatedProfile);

        // Update local profile
        userProfile = { ...userProfile, ...updatedProfile };

        // Update display
        displayProfileInfo();

        // Show success message
        messageEl.className = 'message success';
        messageEl.textContent = '✓ Profile updated successfully!';
        messageEl.style.display = 'block';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);

        console.log('✓ Profile saved');
    } catch (error) {
        console.error('✗ Error saving profile:', error);
        const messageEl = document.getElementById('profileMessage');
        messageEl.className = 'message error';
        messageEl.textContent = '✗ Error saving profile. Please try again.';
        messageEl.style.display = 'block';
    }
}

/**
 * Discard changes
 */
function discardChanges() {
    populateProfileForm();
}

/**
 * View event details
 */
function viewEventDetails(eventId, e) {
    if (e) {
        e.stopPropagation();
    }

    // Store event in session storage
    sessionStorage.setItem('selectedEventId', eventId);

    // Navigate to event details page
    window.location.href = `event-details.html?id=${eventId}`;
}

/**
 * Edit event (navigate to post-event page)
 */
function editEvent(eventId) {
    sessionStorage.setItem('editEventId', eventId);
    window.location.href = `post-event.html?edit=${eventId}`;
}
