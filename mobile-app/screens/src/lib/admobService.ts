export const admobService = {
  isNative: (): boolean => false,
  isInitialized: (): boolean => false,
  getAdUnitId: (): string => '',
  initialize: async () => false,
  showBanner: async (position?: 'top' | 'bottom') => false,
  hideBanner: async () => true,
  resumeBanner: async () => true,
  removeBanner: async () => true,
  showInterstitial: async (onAdDismissed?: () => void) => {
    if (onAdDismissed) onAdDismissed();
    return false;
  },
  showRewarded: async (onRewarded: any, onAdDismissed?: () => void) => {
    if (onAdDismissed) onAdDismissed();
    return false;
  }
};
