/**\n * Firebase Configuration and Initialization Module\n * \n * Initializes Firebase SDK and exposes the following services globally:\n * - window.firebaseDb: Firestore database instance\n * - window.firebaseAuth: Firebase Authentication instance\n * - window.firebaseStorage: Firebase Cloud Storage instance\n */

console.log('✓ firebase-config.js loading');

/**\n * Initializes Firebase with project credentials and core services\n * \n * Implements recursive retry logic to handle Firebase SDK loading delays.\n * Safely handles cases where Firebase is already initialized and exposes\n * services globally for use across the application.\n */
function initializeFirebase() {
    console.log('✓ initializeFirebase() called');
    
    // Verify Firebase SDK has loaded from CDN
    if (!window.firebase) {
        console.error('✗ Firebase SDK not loaded yet');
        setTimeout(initializeFirebase, 100);
        return;
    }

    // Firebase project configuration credentials
    const firebaseConfig = {
        apiKey: "AIzaSyA5_3cEuTtYNAb0pjD5zn-RPJIBliafPJU",
        authDomain: "project-96e3d.firebaseapp.com",
        projectId: "project-96e3d",
        storageBucket: "project-96e3d.firebasestorage.app",
        messagingSenderId: "722219838385",
        appId: "1:722219838385:web:3903f387ea4d5d86fc6b90",
        measurementId: "G-52KWR5RME0"
    };

    try {
        // Check if Firebase is already initialized
        try {
            firebase.app();
            console.log('✓ Firebase already initialized');
        } catch (error) {
            // Firebase not yet initialized; perform initialization with credentials
            console.log('✓ Initializing Firebase...');
            firebase.initializeApp(firebaseConfig);
        }

        // Expose Firebase service instances globally for cross-module access
        window.firebaseDb = firebase.firestore();
        window.firebaseAuth = firebase.auth();
        window.firebaseStorage = firebase.storage();
        
        console.log("✓ Firebase initialized successfully!");
        console.log("✓ Firebase services ready:", {
            firebaseDb: !!window.firebaseDb,
            firebaseAuth: !!window.firebaseAuth,
            firebaseStorage: !!window.firebaseStorage
        });
        
    } catch (error) {
        console.error('✗ Firebase initialization error:', error);
        console.error('✗ Error details:', error.message, error.stack);
    }
}

// Initialize Firebase on document load or immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    // DOM has already loaded; initialize immediately
    initializeFirebase();
}
