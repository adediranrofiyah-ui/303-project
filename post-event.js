// Post Event Module - Manages event submission workflow for community members
// Handles: Form validation, Firebase submission, image upload, user feedback

console.log('✓ post-event.js loaded');

let db = null;
let currentUser = null;

// Initialize and verify Firebase connectivity when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('✓ DOM ready, verifying Firebase connectivity...');
    
    // Polling mechanism to ensure Firebase is initialized
    let attempts = 0;
    while (!window.firebaseDb && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        if (attempts === 1 || attempts % 10 === 0) {
            console.log(`⏳ Waiting for Firebase initialization... (attempt ${attempts})`);
        }
    }
    
    // Store Firebase reference
    if (window.firebaseDb) {
        db = window.firebaseDb;
        console.log('✓✓✓ Firebase Firestore is ready!');
        console.log('✓ Firebase services available for event submission');
    } else {
        console.error('✗✗✗ Firebase not available after initialization timeout');
    }
    
    // Store current user info
    if (window.currentUser) {
        currentUser = window.currentUser;
        console.log('✓ Current user:', currentUser.email);
    }
    
    // Setup form and image handlers
    setupFormSubmission();
    setupImagePreview();
});

// Set up form submission event listener
function setupFormSubmission() {
    const form = document.getElementById('postEventForm');
    const submitBtn = document.getElementById('submitBtn');
    
    if (!form) {
        console.error('✗ Form not found');
        return;
    }
    
    // Handle form submit event
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('✓ Form submitted');
        
        // Show loading state on button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        try {
            // Validate form inputs before submission
            if (!validateForm(form)) {
                showStatus('Please fill in all required fields', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit for Approval';
                return;
            }
            
            // Check if user is logged in
            if (!window.currentUser) {
                showStatus('Please log in to submit an event', 'error');
                openAuthModal();
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit for Approval';
                return;
            }
            
            // Gather all form data
            const eventData = collectFormData(form);
            
            // Upload image file if user selected one
            if (eventData.imageFile) {
                console.log('⬆️ Uploading image...');
                eventData.image = await uploadEventImage(eventData.imageFile, eventData.title);
                delete eventData.imageFile;
            }
            
            // Save event document to Firestore
            console.log('💾 Saving event to Firestore...');
            const docRef = await db.collection('events').add(eventData);
            
            console.log('✓ Event submitted successfully! ID:', docRef.id);
            
            // Show success message
            showStatus('Event submitted successfully! Our team will review it shortly.', 'success');
            
            // Clear all form fields
            form.reset();
            
            // Restore button to normal state
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit for Approval';
            
            // Redirect to event list after 2 seconds
            setTimeout(() => {
                window.location.href = '../pages/event-list.html';
            }, 2000);
            
        } catch (error) {
            console.error('✗ Error submitting event:', error);
            showStatus(`Error: ${error.message}`, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit for Approval';
        }
    });
}

// Validate all required form fields
function validateForm(form) {
    // List of required field IDs
    const requiredFields = [
        'eventTitle',
        'eventCategory',
        'eventDescription',
        'eventDate',
        'eventTime',
        'eventLocation',
        'organizerName',
        'organizerEmail',
        'agreeTerms'
    ];
    
    let isValid = true;
    
    // Check each required field
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.error('✗ Field not found:', fieldId);
            return;
        }
        
        let isFieldValid = true;
        const errorText = field.parentElement.querySelector('.error-text');
        
        // Validate based on field type (checkbox vs text input)
        if (field.type === 'checkbox') {
            isFieldValid = field.checked;
        } else if (field.value.trim() === '') {
            isFieldValid = false;
        }
        
        // Show error styling if validation failed
        if (!isFieldValid) {
            isValid = false;
            if (errorText) {
                errorText.textContent = 'This field is required';
            }
            field.style.borderColor = '#ff6b6b';
        } else {
            if (errorText) {
                errorText.textContent = '';
            }
            field.style.borderColor = '';
        }
    });
    
    return isValid;
}

// Collect all form input values into event object
function collectFormData(form) {
    // Get all field values from form
    const eventTitle = document.getElementById('eventTitle').value;
    const eventCategory = document.getElementById('eventCategory').value;
    const eventDescription = document.getElementById('eventDescription').value;
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    const eventLocation = document.getElementById('eventLocation').value;
    const organizerName = document.getElementById('organizerName').value;
    const organizerEmail = document.getElementById('organizerEmail').value;
    const organizerPhone = document.getElementById('organizerPhone').value;
    const imageFile = document.getElementById('eventImage').files[0];
    
    // Combine date and time into single datetime
    const dateTime = new Date(`${eventDate}T${eventTime}`);
    
    // Return event data object with all required fields for Firestore
    return {
        name: eventTitle,
        category: eventCategory,
        description: eventDescription,
        date: dateTime,
        location: eventLocation,
        organizer: {
            name: organizerName,
            email: organizerEmail,
            phone: organizerPhone || ''
        },
        userId: window.currentUser.uid,
        userEmail: window.currentUser.email,
        status: 'pending',
        createdAt: new Date(),
        rsvpCount: 0,
        image: null,
        imageFile: imageFile,
        title: eventTitle
    };
}

// Upload image file to Firebase Storage
async function uploadEventImage(file, eventTitle) {
    // Check if Firebase Storage is available
    if (!window.firebaseStorage) {
        console.warn('⚠️ Firebase Storage not available');
        return null;
    }
    
    try {
        const storage = window.firebaseStorage;
        // Create unique filename with timestamp
        const fileName = `events/${Date.now()}_${file.name}`;
        const fileRef = storage.ref().child(fileName);
        
        // Upload file to storage
        await fileRef.put(file);
        // Get public download URL
        const url = await fileRef.getDownloadURL();
        
        console.log('✓ Image uploaded:', url);
        return url;
    } catch (error) {
        console.error('✗ Error uploading image:', error);
        return null;
    }
}

// Set up image file preview when user selects a file
function setupImagePreview() {
    const imageInput = document.getElementById('eventImage');
    const imagePreview = document.getElementById('imagePreview');
    
    if (!imageInput) return;
    
    // Listen for file selection
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        
        // If file selected, read and display as preview
        if (file) {
            const reader = new FileReader();
            
            // Show preview image after file is read
            reader.onload = (event) => {
                imagePreview.innerHTML = `
                    <img src="${event.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 5px; object-fit: cover;">
                `;
            };
            
            // Read file as data URL
            reader.readAsDataURL(file);
        } else {
            // Clear preview if no file selected
            imagePreview.innerHTML = '';
        }
    });
}

// Display status message to user with optional auto-hide
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    
    if (!statusDiv) return;
    
    // Set message type class for styling (success, error, info)
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds unless success (success stays visible)
    if (type !== 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}
