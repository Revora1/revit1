const fs = require('fs');
const content = fs.readFileSync('src/lib/admobService.ts', 'utf8');

const target = `  showBanner: async (position: 'top' | 'bottom' = 'bottom') => {
    if (!admobService.isNative()) return false;
    try {
      const options: BannerAdOptions = {
        adId: admobService.getAdUnitId('native'),
        adSize: BannerAdSize.BANNER,
        position: position === 'top' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: false
      };
      await AdMob.showBanner(options);
      return true;
    } catch (e) {
      console.error('Failed to show banner', e);
      return false;
    }
  },

  hideBanner: async () => {
    if (!admobService.isNative()) return false;
    try { await AdMob.hideBanner(); return true; } catch (e) { return false; }
  },

  resumeBanner: async () => {
    if (!admobService.isNative()) return false;
    try { await AdMob.resumeBanner(); return true; } catch (e) { return false; }
  },

  removeBanner: async () => {
    if (!admobService.isNative()) return false;
    try { await AdMob.removeBanner(); return true; } catch (e) { return false; }
  },`;

const replacement = `  showBanner: async (position: 'top' | 'bottom' = 'bottom') => {
    console.log(\`[AdMob] Banner ads have been disabled. AdMob is integrated strictly as native ads in the feed.\`);
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
  },`;

const newContent = content.replace(target, replacement);
fs.writeFileSync('src/lib/admobService.ts', newContent);

const overlays = `import React from 'react';

// Other AdMob overlays have been retired in favor of native feed ads.
export function AdMobOverlays() {
  return null;
}
`;
fs.writeFileSync('src/components/AdMobOverlays.tsx', overlays);

console.log('done');
