import React, { createContext, useContext, useState, useEffect } from 'react';

const PWAContext = createContext(null);

export const PWAProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [lastDataFetchTime, setLastDataFetchTime] = useState(new Date());
  const [offlineToast, setOfflineToast] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineToast({ type: 'RECONNECTED', message: '🟢 Network connection restored. Syncing latest data...' });
      setTimeout(() => setOfflineToast(null), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineToast({ type: 'OFFLINE', message: '⚡ You are offline. Viewing cached app shell. Live actions disabled.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capture PWA Install Prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('[PWA] beforeinstallprompt event captured');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      alert('To install Nourish on Android: Tap Chrome Menu (⋮) -> "Add to Home screen" or "Install app".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const updateFetchTimestamp = () => {
    setLastDataFetchTime(new Date());
  };

  // Online Action Guard: Prevents sensitive stock/price edits when offline
  const guardOnlineAction = (actionFn, actionName = 'This action') => {
    if (!isOnline) {
      alert(`⚡ ${actionName} requires an active network connection. Please reconnect to internet.`);
      return false;
    }
    return actionFn();
  };

  return (
    <PWAContext.Provider
      value={{
        isOnline,
        isInstallable,
        promptInstall,
        lastDataFetchTime,
        updateFetchTimestamp,
        offlineToast,
        setOfflineToast,
        guardOnlineAction
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);
