/**
 * Authentication Module for Naija Events
 * 
 * Manages user authentication lifecycle including:
 * - User login and signup through Firebase Authentication
 * - Session state management and persistence
 * - UI synchronization based on authentication status
 * - Role-based access control (admin privileges)
 * - Error handling and validation feedback
 */

let isSignUpMode = false;
let authInitialized = false;

/**
 * Initializes the authentication module when Firebase becomes available
 * 
 * Implements polling to detect Firebase readiness and sets up the auth state listener.
 * Includes timeout mechanism to prevent indefinite waiting if Firebase fails to load.
 */
function initializeAuthModule() {
    if (authInitialized) return;
    
    console.log('✓ Initializing auth module');
    
    const checkFirebase = setInterval(() => { // Polling mechanism to detect when Firebase authentication service is initialized
        if (window.firebaseAuth) {
            clearInterval(checkFirebase);
            console.log('✓ Firebase auth available, setting up listener');
            initializeAuth();
            authInitialized = true;
        }
    }, 50);
    
    setTimeout(() => { // Safety timeout to prevent indefinite polling if Firebase fails to initialize
        if (!authInitialized) {
            console.error('✗ Firebase auth not available after 5 seconds');
            clearInterval(checkFirebase);
        }
    }, 5000);
}

/**
 * Sets up real-time listener for Firebase authentication state changes
 * 
 * Registers a callback with Firebase to respond immediately when user logs in or out,
 * ensuring UI remains synchronized with authentication status at all times.
 */
function initializeAuth() {
    console.log('✓ Setting up auth state listener');
    
    const auth = window.firebaseAuth;
    
    auth.onAuthStateChanged(user => { // Register real-time listener that triggers when authentication status changes
        if (user) {
            console.log('✓ User logged in:', user.email);
            handleUserLoggedIn(user);
        } else {
            console.log('✓ No user logged in');
            handleUserLoggedOut();
        }
    });
}

/**
 * Handles UI updates when a user successfully authenticates
 * 
 * Updates navigation and UI elements to reflect authenticated state, displays user email,
 * and conditionally reveals admin-only interface elements if user has admin privileges.
 * 
 * @param {Object} user - Firebase user object containing authentication data
 */
function handleUserLoggedIn(user) {
    console.log('✓ Handling user logged in:', user.email);
    
    const authLoggedOut = document.getElementById('authLoggedOut'); // Update UI elements if they exist
    const authLoggedIn = document.getElementById('authLoggedIn');
    const userEmail = document.getElementById('userEmail');
    
    if (authLoggedOut) authLoggedOut.style.display = 'none';
    if (authLoggedIn) authLoggedIn.style.display = 'flex';
    if (userEmail) userEmail.textContent = user.email;
    
    const isAdmin = user.email === 'admin@naija-events.ng'; // Determine if user has admin privileges based on verified email address
    const adminLink = document.getElementById('adminLink');
    const adminFooterLink = document.getElementById('adminFooterLink');
    
    if (adminLink) {
        adminLink.style.display = isAdmin ? 'block' : 'none';
    }
    if (adminFooterLink) {
        adminFooterLink.style.display = isAdmin ? 'block' : 'none';
    }
}

/**
 * Handles UI updates when a user logs out or session ends
 * 
 * Resets navigation to unauthenticated state and hides admin-only interface elements.
 * Ensures no sensitive options are visible to non-authenticated users.
 */
function handleUserLoggedOut() {
    console.log('✓ Handling user logged out');
    
    const authLoggedOut = document.getElementById('authLoggedOut'); // Update UI elements if they exist
    const authLoggedIn = document.getElementById('authLoggedIn');
    
    if (authLoggedOut) authLoggedOut.style.display = 'block';
    if (authLoggedIn) authLoggedIn.style.display = 'none';
    
    const adminLink = document.getElementById('adminLink'); // Hide admin link
    const adminFooterLink = document.getElementById('adminFooterLink');
    
    if (adminLink) {
        adminLink.style.display = 'none';
    }
    if (adminFooterLink) {
        adminFooterLink.style.display = 'none';
    }
}

/**
 * Open auth modal
 */
function openAuthModal() {
    isSignUpMode = false;
    updateAuthModalUI();
    document.getElementById('authModal').style.display = 'flex';
}

/**
 * Close auth modal
 */
function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authForm').reset();
    document.getElementById('authMessage').style.display = 'none';
}

/**
 * Toggle between sign in and sign up modes
 */
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    updateAuthModalUI();
    document.getElementById('authForm').reset();
    document.getElementById('authMessage').style.display = 'none';
}

/**
 * Update modal UI based on auth mode
 */
function updateAuthModalUI() {
    const title = document.getElementById('authModalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleText = document.getElementById('authToggleText');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    
    if (isSignUpMode) {
        title.textContent = 'Create Account';
        submitBtn.textContent = 'Sign Up';
        toggleText.innerHTML = 'Already have an account? <button type="button" class="btn-link" onclick="toggleAuthMode()">Sign In</button>';
        confirmPasswordGroup.style.display = 'block';
        document.getElementById('authConfirmPassword').required = true;
    } else {
        title.textContent = 'Sign In';
        submitBtn.textContent = 'Sign In';
        toggleText.innerHTML = `Don't have an account? <button type="button" class="btn-link" onclick="toggleAuthMode()">Sign In</button>`;
        confirmPasswordGroup.style.display = 'none';
        document.getElementById('authConfirmPassword').required = false;
    }
}

/**
 * Handle auth form submission
 */
async function handleAuthSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const confirmPassword = document.getElementById('authConfirmPassword').value;
    const messageDiv = document.getElementById('authMessage');
    const submitBtn = document.getElementById('authSubmitBtn');
    
    if (!email || !password) { // Validate inputs
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (isSignUpMode) {
        if (password.length < 6) {
            showAuthMessage('Password must be at least 6 characters', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showAuthMessage('Passwords do not match', 'error');
            return;
        }
    }
    
    submitBtn.disabled = true; // Disable button during submission
    submitBtn.textContent = isSignUpMode ? 'Creating Account...' : 'Signing In...';
    
    try {
        const auth = window.firebaseAuth;
        let userCredential;
        
        if (isSignUpMode) {
            console.log('✓ Creating new account:', email); // Sign up
            userCredential = await auth.createUserWithEmailAndPassword(email, password);
            showAuthMessage('✅ Account created successfully! Welcome to Naija Events.', 'success');
        } else {
            console.log('✓ Signing in:', email); // Sign in
            userCredential = await auth.signInWithEmailAndPassword(email, password);
            showAuthMessage('✅ Signed in successfully!', 'success');
        }
        
        setTimeout(() => { // Close modal after 1.5 seconds
            closeAuthModal();
        }, 1500);
        
    } catch (error) {
        console.error('✗ Auth error:', error.message);
        let errorMessage = error.message;
        
        if (error.code === 'auth/email-already-in-use') { // Friendly error messages
            errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Use at least 6 characters.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'Email not found. Please sign up first.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
        }
        
        showAuthMessage(errorMessage, 'error');
    } finally {
        submitBtn.disabled = false; // Re-enable button
        submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    }
}

/**
 * Show auth message
 */
function showAuthMessage(message, type) {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.textContent = message;
    messageDiv.className = 'auth-message';
    messageDiv.classList.add(type === 'error' ? 'error' : 'success');
    messageDiv.style.display = 'block';
}

/**
 * Logout user
 */
async function logoutUser() {
    try {
        const auth = window.firebaseAuth;
        await auth.signOut();
        console.log('✓ User logged out');
    } catch (error) {
        console.error('✗ Logout error:', error);
    }
}

/**
 * Get current user
 */
function getCurrentUser() {
    return window.firebaseAuth.currentUser;
}

/**
 * Check if user is admin
 */
function isUserAdmin() {
    const user = getCurrentUser();
    return user && user.email === 'admin@naija-events.ng';
}
