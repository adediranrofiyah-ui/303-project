async function addRSVP(eventId, rsvpData) { // RSVP Management Module - Handles RSVPs, attendee tracking, and organizer notifications - Features: Create/manage RSVPs, validate duplicates, track attendee count, send notifications - Add new RSVP record for an event - validates duplicate submissions and updates attendee count
    try {
        if (!window.firebaseDb) {
            console.error('✗ Firebase not available');
            return false;
        }

        console.log('✓ Adding RSVP for event:', eventId);
        
        const user = window.firebaseAuth?.currentUser; // Check if user already RSVP'd to prevent duplicates
        const userEmail = rsvpData.email;
        
        const existingRSVP = await window.firebaseDb.collection('rsvps')
            .where('eventId', '==', eventId)
            .where('email', '==', userEmail)
            .get();

        if (!existingRSVP.empty) {
            console.log('✗ User has already RSVP\'d to this event');
            return { success: false, message: 'You have already RSVP\'d to this event!' };
        }

        const rsvpRef = await window.firebaseDb.collection('rsvps').add({ // Create new RSVP record in Firestore with attendee info
            eventId: eventId,
            name: rsvpData.name,
            email: rsvpData.email,
            phone: rsvpData.phone || '',
            userId: user?.uid || 'guest',
            createdAt: new Date().toISOString(),
            status: 'attending'
        });

        console.log('✓ RSVP added with ID:', rsvpRef.id);

        await updateEventAttendeeCount(eventId); // Update event's attendee count

        return { success: true, message: '✅ RSVP confirmed! See you at the event!' };
    } catch (error) {
        console.error('✗ Error adding RSVP:', error);
        return { success: false, message: 'Error saving RSVP. Please try again.' };
    }
}

async function getEventRSVPs(eventId) { // Get all RSVP records for a specific event
    try {
        if (!window.firebaseDb) {
            return [];
        }

        const snapshot = await window.firebaseDb.collection('rsvps') // Query Firestore for all RSVPs matching the event
            .where('eventId', '==', eventId)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('✗ Error getting RSVPs:', error);
        return [];
    }
}

async function getRSVPCount(eventId) { // Get total RSVP count for an event
    try {
        const rsvps = await getEventRSVPs(eventId); // Get all RSVPs and return length
        return rsvps.length;
    } catch (error) {
        console.error('✗ Error getting RSVP count:', error);
        return 0;
    }
}

async function updateEventAttendeeCount(eventId) { // Update event document with latest attendee count from RSVP records
    try {
        const count = await getRSVPCount(eventId); // Get current RSVP count
        
        await window.firebaseDb.collection('events').doc(eventId).update({ // Update event document with new count
            attendeeCount: count
        });

        console.log('✓ Event attendee count updated:', count);
    } catch (error) {
        console.error('✗ Error updating attendee count:', error);
    }
}

async function hasUserRSVPd(eventId, email) { // Check if user has already RSVP'd to prevent duplicate submissions
    try {
        if (!window.firebaseDb) {
            return false;
        }

        const snapshot = await window.firebaseDb.collection('rsvps') // Query for existing RSVP by email and event
            .where('eventId', '==', eventId)
            .where('email', '==', email)
            .get();

        return !snapshot.empty;
    } catch (error) {
        console.error('✗ Error checking RSVP:', error);
        return false;
    }
}

async function removeRSVP(rsvpId, eventId) { // Remove RSVP record from database and update attendee count
    try {
        if (!window.firebaseDb) {
            return false;
        }

        await window.firebaseDb.collection('rsvps').doc(rsvpId).delete(); // Delete RSVP document from Firestore
        
        await updateEventAttendeeCount(eventId); // Update event attendee count after deletion
        
        console.log('✓ RSVP removed');
        return true;
    } catch (error) {
        console.error('✗ Error removing RSVP:', error);
        return false;
    }
}

async function getAllRSVPs() { // Get all RSVPs across all events for admin dashboard reporting
    try {
        if (!window.firebaseDb) {
            return [];
        }

        const snapshot = await window.firebaseDb.collection('rsvps').get(); // Query all RSVP documents
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('✗ Error getting all RSVPs:', error);
        return [];
    }
}

async function sendRSVPNotification(eventId, eventName, organizerEmail, rsvpData) { // Send email notification to event organizer when attendee RSVPs
    try {
        emailjs.init('6C0LTe71_jmMWZJrv'); // Initialize EmailJS service with public API key
        
        const event = await window.firebaseDb.collection('events').doc(eventId).get(); // Get event info from Firestore for email
        const eventData = event.data();
        
        const templateParams = { // Prepare email template parameters with event and attendee info
            organizer_email: organizerEmail,
            organizer_name: eventData?.organizer || 'Event Organizer',
            event_name: eventName,
            event_date: eventData?.date ? new Date(eventData.date).toLocaleDateString() : 'TBA',
            event_location: eventData?.location || 'Not specified',
            attendee_name: rsvpData.name,
            attendee_email: rsvpData.email,
            attendee_phone: rsvpData.phone || 'Not provided',
            rsvp_date: new Date().toLocaleDateString(),
            rsvp_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        const response = await emailjs.send('service_naija_events', 'template_rsvp_notification', templateParams); // Send email through EmailJS service
        
        console.log('✓ RSVP notification email sent to organizer:', organizerEmail);
        return { success: true, message: 'Notification sent to organizer' };
        
    } catch (error) {
        console.error('✗ Error sending RSVP notification:', error);
        // Email failure doesn't block RSVP - log warning but return success
        console.warn('⚠ Email notification could not be delivered at this time');
        return { success: true, message: 'RSVP confirmed! (Email notification pending)' };
    }
}

