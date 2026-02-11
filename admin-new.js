let currentUser = null; // Admin dashboard module
let adminAuth = null;
let db = null;

async function initAdminPage() { // Initialize admin page
    
    try {
        let attempts = 0; // Wait for Firebase to initialize
        while (!window.firebaseDb && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.firebaseDb) {
            console.error('✗ Firebase not available');
            alert('Failed to connect to database');
            return;
        }

        db = window.firebaseDb;
        adminAuth = firebase.auth();
        
        adminAuth.onAuthStateChanged((user) => { // Listen for login/logout changes
            if (user) {
                currentUser = user;
                showDashboard();
            } else {
                currentUser = null;
                showLoginPage();
            }
        });

        setupEventListeners();
    } catch (error) {
    }
}

function setupEventListeners() { // Setup event listeners
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    const postEventForm = document.getElementById('postEventForm');
    if (postEventForm) {
        postEventForm.addEventListener('submit', handlePostEvent);
    }
}

async function handleLogin(e) { // Handle login
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');

    if (!email || !password) {
        loginError.textContent = 'Please enter email and password';
        loginError.style.display = 'block';
        return;
    }

    try {
        loginError.textContent = 'Logging in...';
        loginError.style.display = 'block';
        loginError.style.color = '#0066cc';
        
        await adminAuth.signInWithEmailAndPassword(email, password);
        
        loginError.textContent = 'Login successful!';
        loginError.style.color = '#065f46';
        
        document.getElementById('loginForm').reset();
    } catch (error) {
        loginError.textContent = `Login failed: ${error.message}`;
        loginError.style.display = 'block';
        loginError.style.color = '#dc2626';
    }
}

async function handleLogout() { // Handle logout
    try {
        await adminAuth.signOut();
    } catch (error) {
        alert('Error logging out');
    }
}

function showLoginPage() { // Show login page
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboard() { // Show dashboard
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'block';
    
    loadDashboardStats(); // Load data
    loadPendingEvents();
}

function switchTab(tabName) { // Switch tabs
    console.log('✓ Switching to tab:', tabName);
    
    document.querySelectorAll('.tab-content').forEach(tab => { // Hide all tabs
        tab.style.display = 'none';
    });
    
    document.querySelectorAll('.tab-button').forEach(btn => { // Remove active class from all buttons
        btn.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(tabName + 'Tab'); // Show selected tab
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    event.target.classList.add('active'); // Add active class to button
    
    if (tabName === 'pending') { // Load data for the tab
        loadPendingEvents();
    } else if (tabName === 'approved') {
        loadApprovedEvents();
    } else if (tabName === 'rejected') {
        loadRejectedEvents();
    } else if (tabName === 'rsvp') {
        loadRsvpList();
    }
}

async function loadDashboardStats() { // Load dashboard stats
    
    try {
        if (!db) {
            console.warn('⚠ Database not available yet');
            return;
        }

        const eventsSnapshot = await db.collection('events').get(); // Get events
        const events = [];
        eventsSnapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });

        const pending = events.filter(e => e.status === 'pending').length;
        const approved = events.filter(e => e.status === 'approved').length;
        const rejected = events.filter(e => e.status === 'rejected').length;
        const total = events.length;

        const rsvpsSnapshot = await db.collection('rsvps').get();
        const rsvpCount = rsvpsSnapshot.size;

        document.getElementById('totalEvents').textContent = total;
        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('approvedCount').textContent = approved;
        document.getElementById('rsvpCount').textContent = rsvpCount;
    } catch (error) {
    }
}

async function loadPendingEvents() { // Load pending events
    
    try {
        if (!db) return;

        const snapshot = await db.collection('events')
            .where('status', '==', 'pending')
            .get();

        const events = [];
        snapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });

        displayEvents(events, 'pendingEventsList', 'pending');
    } catch (error) {
    }
}

async function loadApprovedEvents() { // Load approved events
    
    try {
        if (!db) return;

        const snapshot = await db.collection('events')
            .where('status', '==', 'approved')
            .get();

        const events = [];
        snapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });

        displayEvents(events, 'approvedEventsList', 'approved');
    } catch (error) {
    }
}

async function loadRejectedEvents() { // Load rejected events
    
    try {
        if (!db) return;

        const snapshot = await db.collection('events')
            .where('status', '==', 'rejected')
            .get();

        const events = [];
        snapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });

        displayEvents(events, 'rejectedEventsList', 'rejected');
    } catch (error) {
    }
}

async function loadRsvpList() { // Load RSVP list
    
    try {
        if (!db) return;

        const eventsSnapshot = await db.collection('events').get(); // Get all events first
        const events = [];
        eventsSnapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });

        const rsvpsSnapshot = await db.collection('rsvps').get(); // Get all RSVPs
        const rsvps = [];
        rsvpsSnapshot.forEach(doc => {
            rsvps.push({ id: doc.id, ...doc.data() });
        });

        let html = `<div class="rsvp-container">`;

        if (rsvps.length === 0) {
            html += `
                <div style="text-align: center; padding: 2rem; color: #6b7280;">
                    <p style="font-size: 1.2rem;">📋 No RSVPs yet</p>
                    <p>When community members RSVP to events, they will appear here.</p>
                </div>
            `;
        } else {
            const rsvpsByEvent = {}; // Group RSVPs by event
            rsvps.forEach(rsvp => {
                if (!rsvpsByEvent[rsvp.eventId]) {
                    rsvpsByEvent[rsvp.eventId] = [];
                }
                rsvpsByEvent[rsvp.eventId].push(rsvp);
            });

            events.forEach(event => { // Display each event with its RSVPs
                const eventRsvps = rsvpsByEvent[event.id] || [];
                if (eventRsvps.length > 0) {
                    html += `
                        <div class="rsvp-event" style="margin-bottom: 2rem; padding: 1.5rem; background: #f9fafb; border-radius: 0.5rem; border-left: 4px solid #007a5e;">
                            <h3 style="margin-bottom: 1rem; color: #111827;">${event.name}</h3>
                            <p style="margin-bottom: 1.5rem; color: #6b7280;"><strong>📅 ${new Date(event.date).toLocaleDateString()}</strong> | <strong>📍 ${event.location || 'Not specified'}</strong></p>
                            <div style="margin-bottom: 1rem;">
                                <strong style="color: #007a5e;">👥 ${eventRsvps.length} attendee${eventRsvps.length !== 1 ? 's' : ''} RSVP'd</strong>
                            </div>
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                                    <thead>
                                        <tr style="background: #e5e7eb; border-bottom: 2px solid #d1d5db;">
                                            <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Name</th>
                                            <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Email</th>
                                            <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Phone</th>
                                            <th style="padding: 0.75rem; text-align: left; font-weight: 600;">RSVP Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                    `;

                    eventRsvps.forEach(rsvp => {
                        const rsvpDate = new Date(rsvp.createdAt).toLocaleDateString();
                        html += `
                            <tr style="border-bottom: 1px solid #d1d5db;">
                                <td style="padding: 0.75rem;">${rsvp.name || 'N/A'}</td>
                                <td style="padding: 0.75rem;"><a href="mailto:${rsvp.email}" style="color: #007a5e; text-decoration: none;">${rsvp.email}</a></td>
                                <td style="padding: 0.75rem;">${rsvp.phone || 'N/A'}</td>
                                <td style="padding: 0.75rem;">${rsvpDate}</td>
                            </tr>
                        `;
                    });

                    html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }
            });
        }

        html += `</div>`;
        const rsvpContainer = document.getElementById('rsvpList');
        if (rsvpContainer) {
            rsvpContainer.innerHTML = html;
        }
    } catch (error) {
    }
}

function displayEvents(events, containerId, status) { // Display events in a container
    const container = document.getElementById(containerId);
    
    if (!events || events.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No events found</p>';
        return;
    }

    let html = '<div class="event-list">';
    
    events.forEach(event => {
        const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'No date';
        const eventTime = event.date ? new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        
        html += `
            <div class="event-card">
                <h3>${event.name || 'Untitled Event'}</h3>
                <p><strong>Type:</strong> ${event.type || 'Not specified'}</p>
                <p><strong>Date:</strong> ${eventDate} ${eventTime}</p>
                <p><strong>Location:</strong> ${event.location || 'Not specified'}</p>
                <p><strong>Organizer:</strong> ${event.organizer || 'Not specified'}</p>
                <p><strong>Email:</strong> ${event.organizerEmail || 'Not specified'}</p>
                <p><strong>Description:</strong> ${event.description ? event.description.substring(0, 100) + '...' : 'No description'}</p>
                <div class="event-actions">
        `;
        
        if (status === 'pending') {
            html += `
                    <button class="btn btn-small btn-success" onclick="approveEvent('${event.id}')">✅ Approve</button>
                    <button class="btn btn-small btn-danger" onclick="rejectEvent('${event.id}')">❌ Reject</button>
            `;
        } else if (status === 'approved') {
            html += `
                    <button class="btn btn-small btn-danger" onclick="rejectEvent('${event.id}')">❌ Reject</button>
            `;
        } else if (status === 'rejected') {
            html += `
                    <button class="btn btn-small btn-success" onclick="approveEvent('${event.id}')">✅ Re-approve</button>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

async function approveEvent(eventId) { // Approve event
    if (confirm('Are you sure you want to approve this event?')) {
        try {
            if (!db) return alert('Database not ready');
            
            await db.collection('events').doc(eventId).update({
                status: 'approved'
            });
            
            loadDashboardStats();
            loadPendingEvents();
            loadApprovedEvents();
            
            alert('Event approved successfully!');
        } catch (error) {
            alert('Error approving event: ' + error.message);
        }
    }
}

async function rejectEvent(eventId) { // Reject event
    const reason = prompt('Enter rejection reason (optional):');
    
    if (reason !== null) {
        try {
            if (!db) return alert('Database not ready');
            
            await db.collection('events').doc(eventId).update({
                status: 'rejected',
                rejectionReason: reason
            });
            
            loadDashboardStats(); // Reload data
            loadPendingEvents();
            loadRejectedEvents();
            
            alert('Event rejected successfully!');
        } catch (error) {
            alert('Error rejecting event: ' + error.message);
        }
    }
}

async function handlePostEvent(e) { // Handle posting new events
    e.preventDefault();
    
    if (!currentUser) {
        alert('You must be logged in');
        return;
    }

    try {
        if (!db) return alert('Database not ready');

        const title = document.getElementById('eventName').value.trim();
        const category = document.getElementById('eventType').value;
        const description = document.getElementById('eventDescription').value.trim();
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value;
        const location = document.getElementById('eventLocation').value.trim();
        const organizer = document.getElementById('eventOrganizer').value.trim();

        if (!title || !category || !description || !date || !time || !location) {
            alert('Please fill in all required fields');
            return;
        }

        const fullDateTime = new Date(`${date}T${time}`).toISOString();

        const eventData = {
            name: title,
            type: category,
            description: description,
            date: fullDateTime,
            location: location,
            organizer: organizer || 'Admin Posted',
            organizerEmail: email || currentUser.email,
            organizerPhone: '',
            image: `https://picsum.photos/400/300?random=${Math.random()}`,
            status: 'approved',
            attendees: [],
            createdAt: new Date().toISOString().split('T')[0]
        };

        const docRef = await db.collection('events').add(eventData);

        alert('Event posted successfully!');
        document.getElementById('postEventForm').reset();
        
        loadDashboardStats();
        loadApprovedEvents();
    } catch (error) {
        alert('Error posting event: ' + error.message);
    }
}

function viewAttendees(eventId, eventName) { // View attendees for an event
    alert(`Attendees for "${eventName}":\nFeature coming soon!`);
}

document.addEventListener('DOMContentLoaded', () => { // Initialize on page load
    console.log('✓ DOM loaded, initializing admin page');
    initAdminPage();
});
