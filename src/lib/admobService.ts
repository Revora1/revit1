import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, AdMobRewardItem } from '@capacitor-community/admob';
import { AdMobNativeAdvanced } from '@brandonknudsen/admob-native-advanced';

// Real Ad Unit IDs provided by Google AdMob
const ADMOB_IDS = {
  android: {
    native: 'ca-app-pub-2103649447635694/6789922553',
    appId: 'ca-app-pub-2103649447635694~2975257474'
  },
  ios: {
    native: 'ca-app-pub-2103649447635694/6789922553',
    appId: 'ca-app-pub-2103649447635694~2975257474'
  }
};

let isAdMobInitialized = false;

export const admobService = {
  isNative: (): boolean => {
    return Capacitor.isNativePlatform();
  },

  isInitialized: (): boolean => {
    return isAdMobInitialized;
  },
  getAdUnitId: (type: 'banner' | 'interstitial' | 'rewarded' | 'native'): string => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      return ADMOB_IDS.ios[type];
    }
    return ADMOB_IDS.android[type];
  },

  initialize: async () => {
    if (!admobService.isNative()) {
       console.log('AdMob is only available on native devices.');
       return false;
    }
    
    if (!isAdMobInitialized) {
      console.log('[AdMob Native Feed SDK] Initializing AdMob system...');
      try {
        await AdMob.initialize({});
        
        const appId = Capacitor.getPlatform() === 'ios' ? ADMOB_IDS.ios.appId : ADMOB_IDS.android.appId;
        await AdMobNativeAdvanced.initialize({ appId });
        
        isAdMobInitialized = true;
        window.dispatchEvent(new Event('admob-initialized'));
      } catch (err) {
        console.error('Failed to initialize AdMob', err);
      }
    } else {
      window.dispatchEvent(new Event('admob-initialized'));
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
