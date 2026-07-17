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
    if (!isAdMobInitialized) {
      console.log('[AdMob Native Feed SDK] Initializing AdMob system...');
      isAdMobInitialized = true;
    }
    return true;
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
