// Hook for online/offline detection + sync queue count

import { useEffect, useRef, useState } from 'react';
import { syncQueue } from '../services/syncQueue';

const POLL_INTERVAL_MS = 10_000;

export function useOnlineStatus(): { isOnline: boolean; pendingActions: number } {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<number>(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh the pending count
  function refreshCount() {
    syncQueue
      .getCount()
      .then(setPendingActions)
      .catch(() => {
        // IndexedDB unavailable — silently ignore
      });
  }

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      refreshCount();
    }

    function handleOffline() {
      setIsOnline(false);
      refreshCount();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial count
    refreshCount();

    // Periodic poll so the badge stays up to date
    pollRef.current = setInterval(refreshCount, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pollRef.current !== null) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  return { isOnline, pendingActions };
}
