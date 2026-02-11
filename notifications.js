/**
 * Notifications Module
 * Handles in-app notifications for user events
 * 
 * Features:
 * - Create notifications for various events
 * - Display notification panel with list
 * - Mark notifications as read/unread
 * - Delete notifications
 * - Manage notification preferences
 * - Show unread count in bell icon
 */

let currentUser = null;
let notificationCount = 0;
let notifications = [];

/**
 * Initialize notifications module
 */
async function initNotifications() {
    console.log('✓ Notifications initializing...');
    
    try {
        // Wait for Firebase
        let attempts = 0;
        while (!window.firebaseDb && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.firebaseDb) {
            console.error('✗ Firebase not available');
            return;
        }

        window.notificationsDb = window.firebaseDb;
        console.log('✓ Firebase ready');

        // Wait for current user
        attempts = 0;
        while (!window.currentUser && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        currentUser = window.currentUser;

        if (!currentUser) {
            console.log('⚠ User not logged in - notifications disabled');
            return;
        }

        console.log('✓ User:', currentUser.email);

        // Load notifications
        await loadNotifications();

        // Setup event listeners
        setupNotificationListeners();

        // Update UI
        updateNotificationBell();

        console.log('✓ Notifications initialized');
    } catch (error) {
        console.error('✗ Notifications error:', error);
    }
}

/**
 * Load notifications from Firestore
 */
async function loadNotifications() {
    try {
        const notificationsRef = window.notificationsDb.collection('notifications');
        const snapshot = await notificationsRef
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        notifications = [];
        snapshot.forEach(doc => {
            notifications.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✓ Loaded ${notifications.length} notifications`);
    } catch (error) {
        console.error('✗ Error loading notifications:', error);
    }
}

/**
 * Create a new notification
 */
async function createNotification(type, eventId, eventName, title, message, actionUrl = '') {
    try {
        if (!currentUser) {
            console.warn('⚠ No user to create notification for');
            return;
        }

        const notification = {
            userId: currentUser.uid,
            type: type,
            eventId: eventId,
            eventName: eventName,
            title: title,
            message: message,
            actionUrl: actionUrl,
            createdAt: new Date(),
            readAt: null
        };

        const docRef = await window.notificationsDb.collection('notifications').add(notification);

        // Add to local array
        notifications.unshift({
            id: docRef.id,
            ...notification
        });

        // Update UI
        updateNotificationBell();
        displayNotifications();

        console.log('✓ Notification created:', title);
    } catch (error) {
        console.error('✗ Error creating notification:', error);
    }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId) {
    try {
        await window.notificationsDb.collection('notifications').doc(notificationId).update({
            readAt: new Date()
        });

        // Update local array
        const notif = notifications.find(n => n.id === notificationId);
        if (notif) {
            notif.readAt = new Date();
        }

        updateNotificationBell();
        displayNotifications();

        console.log('✓ Notification marked as read');
    } catch (error) {
        console.error('✗ Error marking as read:', error);
    }
}

/**
 * Mark notification as unread
 */
async function markAsUnread(notificationId) {
    try {
        await window.notificationsDb.collection('notifications').doc(notificationId).update({
            readAt: null
        });

        // Update local array
        const notif = notifications.find(n => n.id === notificationId);
        if (notif) {
            notif.readAt = null;
        }

        updateNotificationBell();
        displayNotifications();

        console.log('✓ Notification marked as unread');
    } catch (error) {
        console.error('✗ Error marking as unread:', error);
    }
}

/**
 * Delete a notification
 */
async function deleteNotification(notificationId) {
    try {
        await window.notificationsDb.collection('notifications').doc(notificationId).delete();

        // Remove from local array
        notifications = notifications.filter(n => n.id !== notificationId);

        updateNotificationBell();
        displayNotifications();

        console.log('✓ Notification deleted');
    } catch (error) {
        console.error('✗ Error deleting notification:', error);
    }
}

/**
 * Clear all notifications
 */
async function clearAllNotifications() {
    try {
        // Delete all in Firestore
        for (const notif of notifications) {
            await window.notificationsDb.collection('notifications').doc(notif.id).delete();
        }

        notifications = [];
        updateNotificationBell();
        displayNotifications();

        console.log('✓ All notifications cleared');
    } catch (error) {
        console.error('✗ Error clearing notifications:', error);
    }
}

/**
 * Get unread notification count
 */
function getUnreadCount() {
    return notifications.filter(n => !n.readAt).length;
}

/**
 * Update notification bell with count
 */
function updateNotificationBell() {
    const count = getUnreadCount();
    const countEl = document.getElementById('notificationCount');
    
    if (countEl) {
        if (count > 0) {
            countEl.textContent = count;
            countEl.style.display = 'flex';
        } else {
            countEl.style.display = 'none';
        }
    }
}

/**
 * Display notifications in panel
 */
function displayNotifications() {
    const listEl = document.getElementById('notificationsList');
    
    if (!listEl) return;

    if (notifications.length === 0) {
        listEl.innerHTML = '<div class="notifications-empty"><p>No notifications yet</p></div>';
        return;
    }

    const html = notifications.map(notif => {
        const createdDate = new Date(notif.createdAt);
        const timeAgo = getTimeAgo(createdDate);
        const unreadClass = !notif.readAt ? 'unread' : '';

        return `
            <div class="notification-item ${unreadClass}" data-id="${notif.id}">
                <div class="notification-icon">${getNotificationIcon(notif.type)}</div>
                <div class="notification-content">
                    <strong>${notif.title}</strong>
                    <p>${notif.message}</p>
                    <small>${timeAgo}</small>
                </div>
                <div class="notification-actions">
                    ${!notif.readAt ? `<button class="btn-icon" onclick="markAsRead('${notif.id}')" title="Mark as read">✓</button>` : ''}
                    <button class="btn-icon" onclick="deleteNotification('${notif.id}')" title="Delete">×</button>
                </div>
            </div>
        `;
    }).join('');

    listEl.innerHTML = html;
}

/**
 * Get notification icon by type
 */
function getNotificationIcon(type) {
    const icons = {
        'rsvp_confirmation': '✅',
        'event_reminder': '⏰',
        'event_update': '📢',
        'event_cancelled': '❌'
    };
    return icons[type] || '🔔';
}

/**
 * Calculate time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
}

/**
 * Setup notification bell event listeners
 */
function setupNotificationListeners() {
    const bellBtn = document.getElementById('notificationBell');
    const panel = document.getElementById('notificationPanel');
    const clearBtn = document.querySelector('.notifications-clear-all');

    if (bellBtn && panel) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            
            // Mark all as read when opened (optional)
            // markAllAsRead();
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-bell')) {
                panel.style.display = 'none';
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Clear all notifications?')) {
                clearAllNotifications();
            }
        });
    }

    console.log('✓ Notification listeners setup');
}

/**
 * Save notification preferences
 */
async function saveNotificationPreferences(preferences) {
    try {
        if (!currentUser) {
            console.warn('⚠ No user to save preferences for');
            return;
        }

        await window.notificationsDb.collection('notificationPreferences').doc(currentUser.uid).set(preferences, { merge: true });

        console.log('✓ Notification preferences saved');
    } catch (error) {
        console.error('✗ Error saving preferences:', error);
    }
}

/**
 * Load notification preferences
 */
async function loadNotificationPreferences() {
    try {
        if (!currentUser) return null;

        const doc = await window.notificationsDb.collection('notificationPreferences').doc(currentUser.uid).get();

        if (doc.exists) {
            return doc.data();
        }

        // Return defaults
        return {
            emailNotifications: true,
            inAppNotifications: true,
            reminderTime: '1day',
            notificationTypes: {
                rsvpConfirmation: true,
                eventReminder: true,
                eventUpdate: true,
                eventCancelled: true
            }
        };
    } catch (error) {
        console.error('✗ Error loading preferences:', error);
        return null;
    }
}

/**
 * Check if notification type is enabled in preferences
 */
async function isNotificationTypeEnabled(type) {
    const prefs = await loadNotificationPreferences();
    
    if (!prefs) return true; // Default to enabled

    const typeMap = {
        'rsvp_confirmation': 'rsvpConfirmation',
        'event_reminder': 'eventReminder',
        'event_update': 'eventUpdate',
        'event_cancelled': 'eventCancelled'
    };

    const prefType = typeMap[type];
    return prefs.notificationTypes[prefType] !== false;
}

/**
 * Navigate to notification action
 */
function navigateToNotification(notificationId) {
    const notif = notifications.find(n => n.id === notificationId);
    
    if (notif && notif.actionUrl) {
        markAsRead(notificationId);
        window.location.href = notif.actionUrl;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications);
} else {
    initNotifications();
}

// Also initialize on Firebase ready
if (window.notificationsReady === undefined) {
    window.notificationsReady = initNotifications();
}
