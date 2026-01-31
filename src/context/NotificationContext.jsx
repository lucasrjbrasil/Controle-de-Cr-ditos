import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState(() => {
        const saved = localStorage.getItem('app_notifications');
        return saved ? JSON.parse(saved) : [];
    });

    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        localStorage.setItem('app_notifications', JSON.stringify(notifications));
        setUnreadCount(notifications.filter(n => !n.read).length);
    }, [notifications]);

    const addNotification = useCallback(({ title, message, type = 'info', id }) => {
        const newNotification = {
            id: id || Date.now() + Math.random(),
            title: title || type.charAt(0).toUpperCase() + type.slice(1),
            message,
            type,
            time: new Date().toISOString(),
            read: false
        };

        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    }, []);

    const updateNotification = useCallback((id, updates) => {
        setNotifications(prev => prev.map(n => {
            if (n.id === id) {
                // Update title if type changes and no specific title provided in updates
                let newTitle = updates.title || n.title;
                if (updates.type && !updates.title && n.title === n.type.charAt(0).toUpperCase() + n.type.slice(1)) {
                    newTitle = updates.type.charAt(0).toUpperCase() + updates.type.slice(1);
                }

                return { ...n, ...updates, title: newTitle };
            }
            return n;
        }));
    }, []);

    const markAsRead = useCallback((id) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            updateNotification,
            markAsRead,
            markAllAsRead,
            clearNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
