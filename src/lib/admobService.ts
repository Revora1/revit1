import { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdmobConsentStatus, RewardAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Test Ad Unit IDs provided by Google AdMob
const ADMOB_IDS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    native: 'ca-app-pub-3940256099942544/2247696110',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    native: 'ca-app-pub-3940256099942544/3986624511',
  }
};

let isAdMobInitialized = false;

export const admobService = {
  isNative: (): boolean => {
    return Capacitor.isNativePlatform();
  },

  getAdUnitId: (type: 'banner' | 'interstitial' | 'rewarded' | 'native'): string => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      return ADMOB_IDS.ios[type];
    }
    return ADMOB_IDS.android[type];
  },

  initialize: async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[AdMob Web Mock] Initializing AdMob system (Native Ad in Feed)...');
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
    console.log(`[AdMob] Banner ads have been disabled. AdMob is integrated strictly as native ads in the feed.`);
    return false;
  },

  hideBanner: async () => {
    return true;
  },

  resumeBanner: async () => {
    return true;
  },

  removeBanner: async () => {
    return true;
  },

  showInterstitial: async (onAdDismissed?: () => void): Promise<boolean> => {
    console.log(`[AdMob] Interstitial ads have been disabled. AdMob is integrated strictly as native ads in the feed.`);
    if (onAdDismissed) onAdDismissed();
    return false;
  },

  showRewarded: async (onRewarded: (rewardType: string, rewardAmount: number) => void, onAdDismissed?: () => void): Promise<boolean> => {
    console.log(`[AdMob] Rewarded ads have been disabled. AdMob is integrated strictly as native ads in the feed.`);
    if (onAdDismissed) onAdDismissed();
    return false;
  }
};
