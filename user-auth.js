// User Authentication Protection - For pages that require login (like post-event.html)
// Checks if user is logged in and redirects if not

// Check if user is logged in and enforce login requirement
function checkUserLogin() {
    // Wait for Firebase to be initialized
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth) {
            clearInterval(checkFirebase);
            enforceLogin();
        }
    }, 100);
}

// Enforce login requirement - redirect if not authenticated
function enforceLogin() {
    const auth = window.firebaseAuth;
    
    // Listen to auth state changes
    auth.onAuthStateChanged(user => {
        if (!user) {
            // User not logged in - show alert and redirect to home
            setTimeout(() => {
                alert('⚠️ Login Required\n\nPlease log in to access this page.');
                window.location.href = '../index.html';
            }, 500);
            return;
        }
        
        // User is logged in
        console.log('✓ User logged in:', user.email);
    });
}

// Get current user object for use in forms and authentication checks
function getCurrentUser() {
    return window.firebaseAuth.currentUser;
}
