import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Hệ thống', content: 'Chào mừng bạn đến với ProxiJob - Nền tảng việc làm hyperlocal!', time: 'Vừa xong', read: false }
  ]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const addNotification = useCallback((title, content, time = 'Vừa xong') => {
    setNotifications((prev) => [
      { id: Date.now(), title, content, time, read: false },
      ...prev
    ]);
  }, []);

  return {
    toast,
    showToast,
    hideToast,
    notifications,
    setNotifications,
    addNotification
  };
};
