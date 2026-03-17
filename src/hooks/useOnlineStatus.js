import { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'success', 'error'

  // Access the offline storage helpers so we can sync pending checklists
  const { getPendingChecklists, removePendingChecklist } = useOfflineStorage();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger background sync when coming back online
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('background-sync-checklists');
        });
      }
      // Also try to sync immediately
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event) => {
      if (!event.data) return;

      if (event.data.type === 'SYNC_COMPLETE') {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000); // Reset after 3 seconds
      }

      if (event.data.type === 'TRIGGER_LOCAL_SYNC') {
        syncPendingData();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    if (navigator.onLine) {
      syncPendingData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Function to sync pending data
  const syncPendingData = async () => {
    const pending = getPendingChecklists();
    if (pending.length === 0) return;

    setSyncStatus('syncing');

    try {
      let failedSyncs = 0;

      for (const item of pending) {
        try {
          await addDoc(collection(db, 'checklists'), item.data);
          removePendingChecklist(item.id);
          console.log('Synced pending checklist:', item.id);
        } catch (error) {
          failedSyncs += 1;
          console.error('Failed to sync checklist:', item.id, error);
        }
      }

      setSyncStatus(failedSyncs > 0 ? 'error' : 'success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  return { isOnline, syncStatus, setSyncStatus };
}

// Hook for managing offline submissions
export function useOfflineStorage() {
  const storePendingChecklist = async (checklistData) => {
    try {
      const pendingData = {
        id: Date.now().toString(),
        data: checklistData,
        timestamp: Date.now(),
        synced: false
      };

      // Store in localStorage as fallback (could be IndexedDB for production)
      const pending = JSON.parse(localStorage.getItem('pendingChecklists') || '[]');
      pending.push(pendingData);
      localStorage.setItem('pendingChecklists', JSON.stringify(pending));

      return pendingData.id;
    } catch (error) {
      console.error('Failed to store pending checklist:', error);
      throw error;
    }
  };

  const getPendingChecklists = () => {
    try {
      return JSON.parse(localStorage.getItem('pendingChecklists') || '[]');
    } catch (error) {
      console.error('Failed to get pending checklists:', error);
      return [];
    }
  };

  const removePendingChecklist = (id) => {
    try {
      const pending = JSON.parse(localStorage.getItem('pendingChecklists') || '[]');
      const filtered = pending.filter(item => item.id !== id);
      localStorage.setItem('pendingChecklists', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove pending checklist:', error);
    }
  };

  return { storePendingChecklist, getPendingChecklists, removePendingChecklist };
}
