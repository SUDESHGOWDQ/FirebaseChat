import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      ...notification
    };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto remove notification
    if (newNotification.duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'success' });
  }, [addNotification]);

  const showError = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'error', duration: 0 });
  }, [addNotification]);

  const showInfo = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'info' });
  }, [addNotification]);

  const showWarning = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'warning' });
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showInfo,
    showWarning
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};