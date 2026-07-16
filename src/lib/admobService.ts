import { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdmobConsentStatus, RewardAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Test Ad Unit IDs provided by Google AdMob
const ADMOB_IDS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  }
};

let isAdMobInitialized = false;

export const admobService = {
  isNative: (): boolean => {
    return Capacitor.isNativePlatform();
  },

  getAdUnitId: (type: 'banner' | 'interstitial' | 'rewarded'): string => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      return ADMOB_IDS.ios[type];
    }
    return ADMOB_IDS.android[type];
  },

  initialize: async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[AdMob Web Mock] Initializing AdMob system...');
      isAdMobInitialized = true;
      return true;
    }

    if (isAdMobInitialized) return true;

    try {
      console.log('[AdMob Native] Initializing Google AdMob SDK...');
      
      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: true,
      });

      // Request tracking authorization for iOS devices (ATT) separately in AdMob v8
      if (Capacitor.getPlatform() === 'ios') {
        try {
          await AdMob.requestTrackingAuthorization();
        } catch (e) {
          console.warn('[AdMob Native] ATT request bypassed or failed:', e);
        }
      }

      isAdMobInitialized = true;
      console.log('[AdMob Native] Google AdMob SDK Initialized Successfully!');
      return true;
    } catch (error) {
      console.error('[AdMob Native] Failed to initialize AdMob SDK:', error);
      return false;
    }
  },

  showBanner: async (position: 'top' | 'bottom' = 'bottom') => {
    const adId = admobService.getAdUnitId('banner');
    
    if (!Capacitor.isNativePlatform()) {
      console.log(`[AdMob Web Mock] Showing Banner Ad at ${position.toUpperCase()} with ID: ${adId}`);
      // Dispatch a custom event to notify web-mock banners in the DOM to show
      window.dispatchEvent(new CustomEvent('web-admob-banner-state', {
        detail: { visible: true, position }
      }));
      return true;
    }

    try {
      await admobService.initialize();
      
      const bannerPosition = position === 'top' 
        ? BannerAdPosition.TOP_CENTER 
        : BannerAdPosition.BOTTOM_CENTER;

      console.log(`[AdMob Native] Launching Banner Ad... ID: ${adId}`);
      await AdMob.showBanner({
        adId: adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: bannerPosition,
        margin: position === 'bottom' ? 52 : 0, // avoid overlapping bottom navbar or status bars
        isTesting: true
      });
      return true;
    } catch (error) {
      console.error('[AdMob Native] Error presenting banner ad:', error);
      return false;
    }
  },

  hideBanner: async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[AdMob Web Mock] Hiding Banner Ad');
      window.dispatchEvent(new CustomEvent('web-admob-banner-state', {
        detail: { visible: false }
      }));
      return true;
    }

    try {
      await AdMob.hideBanner();
      console.log('[AdMob Native] Banner Ad Hidden Successfully');
      return true;
    } catch (error) {
      console.error('[AdMob Native] Error hiding banner ad:', error);
      return false;
    }
  },

  resumeBanner: async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[AdMob Web Mock] Resuming Banner Ad');
      return true;
    }

    try {
      await AdMob.resumeBanner();
      return true;
    } catch (error) {
      console.error('[AdMob Native] Error resuming banner ad:', error);
      return false;
    }
  },

  removeBanner: async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[AdMob Web Mock] Removing Banner Ad');
      window.dispatchEvent(new CustomEvent('web-admob-banner-state', {
        detail: { visible: false }
      }));
      return true;
    }

    try {
      await AdMob.removeBanner();
      return true;
    } catch (error) {
      console.error('[AdMob Native] Error removing banner ad:', error);
      return false;
    }
  },

  showInterstitial: async (onAdDismissed?: () => void): Promise<boolean> => {
    const adId = admobService.getAdUnitId('interstitial');

    if (!Capacitor.isNativePlatform()) {
      console.log('[AdMob Web Mock] Triggering Mock Interstitial Ad with ID:', adId);
      // Dispatch a custom event to show the full screen mock ad
      window.dispatchEvent(new CustomEvent('web-admob-interstitial-trigger', {
        detail: { onDismiss: onAdDismissed }
      }));
      return true;
    }

    try {
      await admobService.initialize();
      
      console.log('[AdMob Native] Preloading Interstitial Ad...');
      await AdMob.prepareInterstitial({
        adId: adId,
        isTesting: true,
      });

      // Show interstitial
      console.log('[AdMob Native] Presenting Interstitial Ad...');
      await AdMob.showInterstitial();
      
      if (onAdDismissed) {
        onAdDismissed();
      }
      return true;
    } catch (error) {
      console.error('[AdMob Native] Error presenting interstitial ad:', error);
      // Fallback on failure
      if (onAdDismissed) onAdDismissed();
      return false;
    }
  },

  showRewarded: async (onRewarded: (rewardType: string, rewardAmount: number) => void, onAdDismissed?: () => void): Promise<boolean> => {
    const adId = admobService.getAdUnitId('rewarded');

    if (!Capacitor.isNativePlatform()) {
      console.log('[AdMob Web Mock] Triggering Mock Rewarded Ad with ID:', adId);
      // Dispatch a custom event to show the full screen mock rewarded ad
      window.dispatchEvent(new CustomEvent('web-admob-rewarded-trigger', {
        detail: { 
          onRewarded: () => onRewarded('Reputation Points', 50),
          onDismiss: onAdDismissed 
        }
      }));
      return true;
    }

    try {
      await admobService.initialize();

      console.log('[AdMob Native] Preloading Rewarded Video Ad...');
      await AdMob.prepareRewardVideoAd({
        adId: adId,
        isTesting: true,
      });

      // Add single-use event listener for reward
      const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: any) => {
        console.log('[AdMob Native] User earned reward:', reward);
        onRewarded(reward?.type || 'Reputation Points', reward?.amount || 50);
      });

      console.log('[AdMob Native] Presenting Rewarded Video Ad...');
      await AdMob.showRewardVideoAd();

      // Clean up listener
      setTimeout(() => {
        try {
          rewardListener.remove();
        } catch (e) {
          console.warn('Could not remove rewarded listener:', e);
        }
      }, 5000);

      if (onAdDismissed) {
        onAdDismissed();
      }
      return true;
    } catch (error) {
      console.error('[AdMob Native] Error presenting rewarded video ad:', error);
      // Fallback
      if (onAdDismissed) onAdDismissed();
      return false;
    }
  }
};
