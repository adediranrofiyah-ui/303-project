function isUserAdmin() { // Check if user is admin
    const user = window.firebaseAuth?.currentUser;
    return user && user.email === 'admin@naija-events.ng';
}

function checkAdminAccess() { // Verify admin access
    return isUserAdmin();
}
