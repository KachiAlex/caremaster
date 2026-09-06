import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import NativeSplash from './NativeSplash';
import Onboarding from '../pages/Onboarding';
import pushNotificationService from '../services/pushNotificationService';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

const NativeMobileHandler = ({ children }) => {
  const [showCustomSplash, setShowCustomSplash] = useState(Capacitor.isNativePlatform());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstLaunch, setIsFirstFirstLaunch] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const initMobile = async () => {
      if (!Capacitor.isNativePlatform()) {
        setLoading(false);
        return;
      }

      try {
        // Hide default splash immediately so we can show our custom animated one
        await SplashScreen.hide();
        
        // Style status bar
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#12302C' });

        // Check if first launch
        const { value } = await Preferences.get({ key: 'has_seen_onboarding' });
        setIsFirstFirstLaunch(value !== 'true');

        // Initial network check
        const status = await Network.getStatus();
        setIsOnline(status.connected);

        // Listen for network changes and clean up on unmount
        const listener = await Network.addListener('networkStatusChange', status => {
          setIsOnline(status.connected);
        });

        // Initialize Push Notifications
        await pushNotificationService.init();

      } catch (err) {
        // Mobile initialization error is already handled by fallback UI
      } finally {
        setLoading(false);
      }
    };

    initMobile();

    return () => {
      try {
        listener?.remove?.();
      } catch (err) {
        // Listener removal may fail on non-native platforms
      }
    };
  }, []);

  const handleSplashComplete = () => {
    setShowCustomSplash(false);
    // Only show onboarding on first launch (explicitly true, not null/loading)
    if (isFirstLaunch === true) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = async () => {
    await Preferences.set({ key: 'has_seen_onboarding', value: 'true' });
    setShowOnboarding(false);
  };

  if (showCustomSplash) {
    return <NativeSplash onComplete={handleSplashComplete} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      {Capacitor.isNativePlatform() && !isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[2000] bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
            <WifiOff className="w-4 h-4" />
            <span>Offline mode — some data may be cached.</span>
          </div>
          <button
            onClick={async () => {
              setRetrying(true);
              try {
                const status = await Network.getStatus();
                setIsOnline(status.connected);
              } finally {
                setRetrying(false);
              }
            }}
            disabled={retrying}
            className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1 rounded-md flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Checking...' : 'Retry'}
          </button>
        </div>
      )}
      {children}
    </>
  );
};

export default NativeMobileHandler;
