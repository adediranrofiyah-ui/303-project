/**
 * UI Buttons Module
 * Handles authentication modal and dropdown menu functionality
 * Uses HTML elements, CSS styling, and JavaScript event listeners
 */

// ========================================
// AUTHENTICATION MODAL
// ========================================

/**
 * Open the authentication modal
 * Shows the #authModal HTML element by setting display: flex
 * Called when user clicks "Sign In" button
 */
function openAuthModal() {
    console.log('✓ openAuthModal() called');
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'flex';
        console.log('✓ Auth modal opened');
    } else {
        console.error('✗ authModal element not found');
    }
}

/**
 * Close the authentication modal
 * Hides the #authModal HTML element by setting display: none
 * Called when user clicks close button or completes authentication
 */
function closeAuthModal() {
    console.log('✓ closeAuthModal() called');
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'none';
        console.log('✓ Auth modal closed');
    }
}

// ========================================
// DROPDOWN MENU
// ========================================

/**
 * Initialize mobile menu drawer
 * Handles mobile navigation menu toggle
 */
function initializeMobileMenu() {
    console.log('✓ Initializing mobile menu');
    
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.querySelector('.main-nav');
    
    if (!mobileMenuBtn) {
        console.warn('⚠ Mobile menu button not found');
        return;
    }
    
    if (!navMenu) {
        console.warn('⚠ Nav menu not found');
        return;
    }
    
    // Toggle mobile menu
    mobileMenuBtn.addEventListener('click', function(e) {
        console.log('✓ Mobile menu button clicked');
        e.stopPropagation();
        navMenu.classList.toggle('mobile-active');
        console.log('✓ Mobile menu toggled');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!mobileMenuBtn.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('mobile-active');
            console.log('✓ Mobile menu closed - clicked outside');
        }
    });
    
    // Close menu when clicking a link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('mobile-active');
            console.log('✓ Mobile menu closed - link clicked');
        });
    });
    
    console.log('✓ Mobile menu initialization complete');
}

/**
 * Initialize dropdown menu
 * Attaches JavaScript event listeners to HTML elements
 * Manages visibility of #menuDropdown using CSS display property
 * Called on DOMContentLoaded event
 */
function initializeMenuButton() {
    console.log('✓ Initializing menu button');
    
    const menuBtn = document.getElementById('menuEllipsisBtn');
    const menuDropdown = document.getElementById('menuDropdown');
    
    if (!menuBtn) {
        console.warn('⚠ Menu button element not found');
        return;
    }
    
    if (!menuDropdown) {
        console.warn('⚠ Menu dropdown element not found');
        return;
    }
    
    console.log('✓ Menu elements found');
    
    // Toggle menu visibility when button is clicked
    menuBtn.addEventListener('click', function(e) {
        console.log('✓ Menu button clicked');
        e.stopPropagation();
        
        const isHidden = menuDropdown.style.display === 'none' || !menuDropdown.style.display;
        menuDropdown.style.display = isHidden ? 'block' : 'none';
        console.log('✓ Menu toggled to:', menuDropdown.style.display);
    });
    
    // Hide menu when user clicks outside
    document.addEventListener('click', function(e) {
        if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
            menuDropdown.style.display = 'none';
            console.log('✓ Menu closed - clicked outside');
        }
    });
    
    // Hide menu when user clicks a menu link
    menuDropdown.querySelectorAll('.dropdown-link').forEach(link => {
        link.addEventListener('click', function() {
            menuDropdown.style.display = 'none';
            console.log('✓ Menu closed - link clicked');
        });
    });
    
    console.log('✓ Menu button initialization complete');
}

// ========================================
// PAGE INITIALIZATION
// ========================================

/**
 * Initialize UI components when DOM is loaded
 * Waits for all HTML elements to be available
 * Then sets up JavaScript event listeners
 */

function initializeUIButtons() {
    console.log('✓ DOMContentLoaded event fired');
    
    // Initialize menu button
    initializeMenuButton();
    
    console.log('✓ UI buttons initialized');
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUIButtons);
} else {
    // DOM is already loaded
    initializeUIButtons();
}
