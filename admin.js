document.addEventListener('DOMContentLoaded', function() { // ADMIN DASHBOARD FUNCTIONALITY
    const checkInterval = setInterval(() => { // Wait for dataManager to be ready
        if (window.dataManager) {
            clearInterval(checkInterval);
            initializeAdminPage();
        }
    }, 100);
});

function initializeAdminPage() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminLoginSection = document.getElementById('adminLoginSection');
    const adminDashboard = document.getElementById('adminDashboard');

    if (dataManager.isAdminLoggedIn()) { // Check if already logged in
        showDashboard();
    }

    if (adminLoginForm) { // Handle login
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAdminLogin();
        });
    }

    if (logoutBtn) { // Handle logout
        logoutBtn.addEventListener('click', function() {
            handleAdminLogout();
        });
    }

    document.querySelectorAll('.tab-btn').forEach(btn => { // Tab switching
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
});

function handleAdminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    const loginError = document.getElementById('loginError');

    if (!email || !password) {
        loginError.textContent = 'Please fill in all fields';
        return;
    }

    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        dataManager.setAdminSession({
            email: email,
            loggedInAt: new Date().toISOString()
        });
        showDashboard();
    } else {
        loginError.textContent = 'Invalid email or password';
    }
}

function handleAdminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        dataManager.clearAdminSession();
        document.getElementById('adminLoginSection').style.display = 'block';
        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('adminLoginForm').reset();
        document.getElementById('loginError').textContent = '';
    }
}

function showDashboard() {
    document.getElementById('adminLoginSection').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    loadDashboardData();
}

function loadDashboardData() {
    (async () => {
        await loadStatistics();
        await loadPendingEvents();
        await loadApprovedEvents();
        await loadRejectedEvents();
        await loadRsvpList();
    })();
}

async function loadStatistics() {
    const stats = await dataManager.getDashboardStats();
    document.getElementById('totalEvents').textContent = stats.totalEvents;
    document.getElementById('pendingEvents').textContent = stats.pendingEvents;
    document.getElementById('approvedEvents').textContent = stats.approvedEvents;
    document.getElementById('totalAttendees').textContent = stats.totalRsvps;
}

async function loadPendingEvents() {
    const events = await dataManager.getEventsByStatus('pending');
    renderEventTable('pendingEventsList', events, true);
}

async function loadApprovedEvents() {
    const events = await dataManager.getEventsByStatus('approved');
    renderEventTable('approvedEventsList', events, false);
}

async function loadRejectedEvents() {
    const events = await dataManager.getEventsByStatus('rejected');
    renderEventTable('rejectedEventsList', events, false);
}

function renderEventTable(containerId, events, showApprovalBtns) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (events.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No events</p>';
        return;
    }

    let html = '<div class="event-row event-row-header"><span>Event</span><span>Category</span><span>Date</span><span>Actions</span></div>';

    events.forEach(event => {
        let actionBtns = '';

        if (showApprovalBtns) {
            actionBtns = `
                <div class="event-actions">
                    <button class="btn btn-success" onclick="approveEvent(${event.id})">Approve</button>
                    <button class="btn btn-danger" onclick="rejectEvent(${event.id})">Reject</button>
                </div>
            `;
        } else {
            actionBtns = `
                <div class="event-actions">
                    <button class="btn btn-secondary" onclick="deleteEvent(${event.id})">Delete</button>
                </div>
            `;
        }

        html += `
            <div class="event-row">
                <span><strong>${event.title}</strong><br><small>${event.organizer}</small></span>
                <span>${event.category}</span>
                <span>${formatDate(event.date)}</span>
                ${actionBtns}
            </div>
        `;
    });

    container.innerHTML = html;
}

async function loadRsvpList() {
    const rsvps = await dataManager.getAllRsvps();
    const container = document.getElementById('rsvpList');

    if (!container) return;

    if (rsvps.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No RSVPs yet</p>';
        return;
    }

    const htmlParts = [];
    for (const rsvp of rsvps) {
        const event = await dataManager.getEventById(rsvp.eventId);
        htmlParts.push(`
            <div class="rsvp-card">
                <h4>${rsvp.name}</h4>
                <p><strong>Event:</strong> ${event ? event.title : 'Event not found'}</p>
                <p><strong>Email:</strong> ${rsvp.email}</p>
                <p><strong>Phone:</strong> ${rsvp.phone || 'Not provided'}</p>
                <p><strong>Date:</strong> ${new Date(rsvp.createdAt).toLocaleDateString()}</p>
            </div>
        `);
    }

    container.innerHTML = htmlParts.join('');
}

function approveEvent(eventId) {
    if (confirm('Approve this event?')) {
        (async () => {
            await dataManager.approveEvent(eventId);
            loadDashboardData();
        })();
    }
}

function rejectEvent(eventId) {
    if (confirm('Reject this event?')) {
        (async () => {
            await dataManager.rejectEvent(eventId);
            loadDashboardData();
        })();
    }
}

function deleteEvent(eventId) {
    if (confirm('Delete this event? This cannot be undone.')) {
        (async () => {
            await dataManager.deleteEvent(eventId);
            loadDashboardData();
        })();
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => { // Hide all tabs
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => { // Remove active class from all buttons
        btn.classList.remove('active');
    });

    const tabElement = document.getElementById(tabName + 'Tab'); // Show selected tab
    if (tabElement) {
        tabElement.classList.add('active');
    }

    event.target.classList.add('active'); // Add active class to clicked button
}
