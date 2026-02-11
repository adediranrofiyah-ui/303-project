/**
 * Data Layer and Sample Events Module
 * 
 * Provides initial sample event data and configuration for the application.
 * Includes template data structure for event objects and sample events for testing.
 * Future extension point for backend API integration.
 */

// Backend API endpoint configuration for future server integration
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Sample Events Dataset
 * 
 * Collection of pre-populated event records used for initial application setup and testing.
 * Each event includes all required fields: title, category, date/time, location, description,
 * organizer information, status, and attendee tracking. Ready for migration to Firestore.
 */
const SAMPLE_EVENTS = [
    {
        id: 1,
        title: "Osun Osogbo Sacred Festival 2026",
        category: "Festival",
        date: "2026-02-15",
        time: "09:00",
        location: "Osogbo, Osun State",
        description: "The grand annual Osun Osogbo Festival celebrating the Osun River goddess. Experience traditional masquerades, sacred river ceremonies, cultural dances, music performances, and religious rituals. A vibrant celebration of Yoruba heritage and spirituality.",
        image: "",
        organizer: "Osun Osogbo Festival Committee",
        organizerEmail: "osunfestival@osun.ng",
        organizerPhone: "+234-803-123-4567",
        status: "approved",
        attendees: [],
        createdAt: "2026-01-10"
    },
    {
        id: 2,
        title: "Khadijah & Najimdeen Walimatul Nikkah",
        category: "Wedding",
        date: "2026-10-17",
        time: "16:00",
        location: "Adolak Event Centre, Osogbo, Osun State",
        description: "You are cordially invited to the Walimatul Nikkah (Islamic wedding reception) of Khadijah and Najimdeen. Join us for a beautiful celebration of their union with family, friends, and well-wishers. Reception with traditional refreshments and festivities.",
        image: "",
        organizer: "Khadijah",
        organizerEmail: "khadijah@example.ng",
        organizerPhone: "+234-803-456-7890",
        status: "approved",
        attendees: [],
        createdAt: "2026-01-15"
    },
    {
        id: 3,
        title: "Wedding Reception - Winston & Favour",
        category: "Wedding",
        date: "2026-07-25",
        time: "17:00",
        location: "Mercy Event Centre, Ekiti State",
        description: "You are invited to the wedding reception of Winston and Favour. Join us as we celebrate their marriage with food, music, dance, and joyful moments with loved ones. Dress code: Formal attire.",
        image: "",
        organizer: "Winston",
        organizerEmail: "winston@example.ng",
        organizerPhone: "+234-805-789-0123",
        status: "approved",
        attendees: [],
        createdAt: "2026-01-15"
    }
];

// ============================================
// FIREBASE DATA MANAGER
// ============================================

class DataManager {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.storage = firebase.storage();
        this.initializeFirebase();
    }

    async initializeFirebase() {
        try {
            const eventsRef = await this.db.collection('events').get(); // Check if events collection exists, if not create with sample data
            if (eventsRef.empty) {
                for (const event of SAMPLE_EVENTS) { // Initialize with sample events
                    await this.db.collection('events').add(event);
                }
            }
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    // Event Management
    async getAllEvents() {
        try {
            const snapshot = await this.db.collection('events').get();
            const events = [];
            snapshot.forEach(doc => {
                events.push({ id: doc.id, ...doc.data() });
            });
            return events;
        } catch (error) {
            console.error('Error getting events:', error);
            return [];
        }
    }

    async getEventById(id) {
        try {
            const doc = await this.db.collection('events').doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting event:', error);
            return null;
        }
    }

    async getEventsByStatus(status) {
        try {
            const snapshot = await this.db.collection('events')
                .where('status', '==', status)
                .get();
            const events = [];
            snapshot.forEach(doc => {
                events.push({ id: doc.id, ...doc.data() });
            });
            return events;
        } catch (error) {
            console.error('Error getting events by status:', error);
            return [];
        }
    }

    async getEventsByCategory(category) {
        try {
            const snapshot = await this.db.collection('events')
                .where('category', '==', category)
                .get();
            const events = [];
            snapshot.forEach(doc => {
                events.push({ id: doc.id, ...doc.data() });
            });
            return events;
        } catch (error) {
            console.error('Error getting events by category:', error);
            return [];
        }
    }

    async getEventsByDateRange(fromDate, toDate) {
        try {
            const snapshot = await this.db.collection('events')
                .where('date', '>=', fromDate)
                .where('date', '<=', toDate)
                .get();
            const events = [];
            snapshot.forEach(doc => {
                events.push({ id: doc.id, ...doc.data() });
            });
            return events;
        } catch (error) {
            console.error('Error getting events by date range:', error);
            return [];
        }
    }

    async createEvent(eventData) {
        try {
            const newEvent = {
                ...eventData,
                status: eventData.status || 'pending',
                attendees: [],
                createdAt: new Date().toISOString().split('T')[0]
            };
            const docRef = await this.db.collection('events').add(newEvent);
            return { id: docRef.id, ...newEvent };
        } catch (error) {
            console.error('Error creating event:', error);
            return null;
        }
    }

    // Alias for createEvent (used by admin panel)
    async addEvent(eventData) {
        return this.createEvent(eventData);
    }

    async updateEvent(id, updates) {
        try {
            await this.db.collection('events').doc(id).update(updates);
            return await this.getEventById(id);
        } catch (error) {
            console.error('Error updating event:', error);
            return null;
        }
    }

    async approveEvent(id) {
        return this.updateEvent(id, { status: 'approved' });
    }

    async rejectEvent(id) {
        return this.updateEvent(id, { status: 'rejected' });
    }

    async deleteEvent(id) {
        try {
            await this.db.collection('events').doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error deleting event:', error);
            return false;
        }
    }

    // RSVP Management
    async getAllRsvps() {
        try {
            const snapshot = await this.db.collection('rsvps').get();
            const rsvps = [];
            snapshot.forEach(doc => {
                rsvps.push({ id: doc.id, ...doc.data() });
            });
            return rsvps;
        } catch (error) {
            console.error('Error getting RSVPs:', error);
            return [];
        }
    }

    async getRsvpsByEventId(eventId) {
        try {
            const snapshot = await this.db.collection('rsvps')
                .where('eventId', '==', eventId)
                .get();
            const rsvps = [];
            snapshot.forEach(doc => {
                rsvps.push({ id: doc.id, ...doc.data() });
            });
            return rsvps;
        } catch (error) {
            console.error('Error getting RSVPs by event:', error);
            return [];
        }
    }

    async addRsvp(eventIdOrData, emailParam = null) {
        try {
            let rsvpData; // Handle both signatures: addRsvp(eventId, email) and addRsvp({eventId, email, ...})
            if (typeof eventIdOrData === 'string' && emailParam) {
                rsvpData = {
                    eventId: eventIdOrData,
                    email: emailParam,
                    name: emailParam,
                    timestamp: new Date().toISOString()
                };
            } else {
                rsvpData = eventIdOrData;
            }

            const existing = await this.db.collection('rsvps') // Check if already RSVP'd
                .where('eventId', '==', rsvpData.eventId)
                .where('email', '==', rsvpData.email)
                .get();

            if (!existing.empty) {
                return { error: 'You have already RSVP\'d to this event' };
            }

            const newRsvp = {
                ...rsvpData,
                timestamp: new Date().toISOString()
            };
            const docRef = await this.db.collection('rsvps').add(newRsvp);
            
            const event = await this.getEventById(rsvpData.eventId); // Update event attendees
            if (event) {
                const attendees = event.attendees || [];
                attendees.push(rsvpData.email);
                await this.updateEvent(rsvpData.eventId, { attendees });
            }

            return { id: docRef.id, ...newRsvp };
        } catch (error) {
            console.error('Error adding RSVP:', error);
            return { error: error.message };
        }
    }

    async removeRsvp(id) {
        try {
            const rsvp = await this.db.collection('rsvps').doc(id).get();
            if (rsvp.exists) {
                const rsvpData = rsvp.data();
                
                const event = await this.getEventById(rsvpData.eventId); // Update event attendees
                if (event && event.attendees) {
                    const updatedAttendees = event.attendees.filter(a => a !== rsvpData.name);
                    await this.updateEvent(rsvpData.eventId, { attendees: updatedAttendees });
                }
            }
            
            await this.db.collection('rsvps').doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error removing RSVP:', error);
            return false;
        }
    }

    // Admin Session Management
    setAdminSession(adminData) {
        localStorage.setItem('adminSession', JSON.stringify(adminData));
    }

    getAdminSession() {
        const session = localStorage.getItem('adminSession');
        return session ? JSON.parse(session) : null;
    }

    clearAdminSession() {
        localStorage.setItem('adminSession', JSON.stringify(null));
    }

    isAdminLoggedIn() {
        const session = this.getAdminSession();
        return session !== null;
    }

    // Dashboard Statistics
    async getDashboardStats() {
        try {
            const events = await this.getAllEvents();
            const rsvps = await this.getAllRsvps();

            return {
                totalEvents: events.length,
                pendingEvents: events.filter(e => e.status === 'pending').length,
                approvedEvents: events.filter(e => e.status === 'approved').length,
                rejectedEvents: events.filter(e => e.status === 'rejected').length,
                totalRsvps: rsvps.length
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return {};
        }
    }

    // Image Upload to Firebase Storage
    async uploadEventImage(file, eventTitle) {
        try {
            const fileName = `events/${Date.now()}_${file.name}`;
            const storageRef = this.storage.ref(fileName);
            const snapshot = await storageRef.put(file);
            const downloadUrl = await snapshot.ref.getDownloadURL();
            return downloadUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        }
    }

    // Search & Filter
    searchEvents(query) {
        const events = this.getAllEvents();
        const q = query.toLowerCase();
        return events.filter(e => 
            e.title.toLowerCase().includes(q) ||
            e.location.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q)
        );
    }
}

// Initialize Data Manager
// DataManager will be instantiated by firebase-config.js after Firebase is initialized
// This prevents errors when DataManager tries to access firebase before it's loaded

// API Wrapper for Future Backend Integration
class ApiClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
        this.isOnline = false; // Detect backend availability
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, { method: 'GET', timeout: 2000 });
            this.isOnline = response.ok;
        } catch (error) {
            this.isOnline = false;
        }
        return this.isOnline;
    }

    // Events Endpoints
    async getEvents() {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.baseUrl}/events`);
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
            }
        }
        return dataManager.getAllEvents(); // Fallback to localStorage
    }

    async getEvent(id) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.baseUrl}/events/${id}`);
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
            }
        }
        return dataManager.getEventById(id);
    }

    async createEvent(eventData) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.baseUrl}/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventData)
                });
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
            }
        }
        return dataManager.createEvent(eventData); // Fallback to localStorage
    }

    async updateEvent(id, updates) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.baseUrl}/events/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
            }
        }
        return dataManager.updateEvent(id, updates);
    }

    async deleteEvent(id) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.baseUrl}/events/${id}`, {
                    method: 'DELETE'
                });
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
            }
        }
        return dataManager.deleteEvent(id);
    }

    // RSVPs Endpoints
    async addRsvp(rsvpData) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.baseUrl}/rsvps`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rsvpData)
                });
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
            }
        }
        return dataManager.addRsvp(rsvpData);
    }

    async getRsvps(eventId) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.baseUrl}/events/${eventId}/rsvps`);
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
            }
        }
        return dataManager.getRsvpsByEventId(eventId);
    }

    // Admin Endpoints
    async authenticateAdmin(email, password) {
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.baseUrl}/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
            }
        }
        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) { // Mock authentication
            return { success: true, token: 'mock-token-' + Date.now() };
        }
        return { success: false, error: 'Invalid credentials' };
    }
}

// Initialize API Client
const apiClient = new ApiClient();
