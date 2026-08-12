import React, { useEffect, useRef, useState } from 'react';
import { AdMobNativeAdvanced, NativeAdData } from '@brandonknudsen/admob-native-advanced';
import { Capacitor } from '@capacitor/core';
import { admobService } from '../lib/admobService';

export function NativeAd({ adUnitId }: { adUnitId?: string }) {
  const adPlaceholderRef = useRef<HTMLDivElement>(null);
  const [adData, setAdData] = useState<NativeAdData | null>(null);
  const isIOS = Capacitor.getPlatform() === 'ios';
  const estimatedHeight = 300; // Estimated height for iOS placeholder

  useEffect(() => {
    const loadAd = async () => {
      try {
        const id = adUnitId || admobService.getAdUnitId('native');
        const data = await AdMobNativeAdvanced.loadAd({
          adUnitId: id
        });
        setAdData(data);
      } catch (e) {
        console.error('Failed to load native ad', e);
      }
    };
    
    if (Capacitor.isNativePlatform()) {
      if (admobService.isInitialized()) {
        loadAd();
      } else {
        const handleInit = () => {
          loadAd();
          window.removeEventListener('admob-initialized', handleInit);
        };
        window.addEventListener('admob-initialized', handleInit);
        return () => window.removeEventListener('admob-initialized', handleInit);
      }
    }
  }, [adUnitId]);

  useEffect(() => {
    if (!adData || !isIOS || !adPlaceholderRef.current) return;

    const configureAndPosition = async () => {
      await AdMobNativeAdvanced.configureNativeAdStyle({
        adId: adData.adId,
        style: {
          backgroundColor: '#000000',
          cornerRadius: 8,
          borderWidth: 1,
          borderColor: '#333333',
          headlineColor: '#ffffff',
          headlineFontSize: 16,
          bodyColor: '#cccccc',
          bodyFontSize: 14,
          advertiserColor: '#999999',
          advertiserFontSize: 11,
          ctaBackgroundColor: '#2196f3',
          ctaTextColor: '#ffffff',
          ctaFontSize: 14
        }
      });
      positionNativeAd();
    };
    
    configureAndPosition();

    // Position setup
    const positionNativeAd = () => {
      if (!adPlaceholderRef.current || !adData || !isIOS) return;

      const rect = adPlaceholderRef.current.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      AdMobNativeAdvanced.positionNativeAd({
        adId: adData.adId,
        x: rect.left,
        y: rect.top + scrollY,
        width: rect.width,
        height: rect.height
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      positionNativeAd();
    });
    resizeObserver.observe(document.body);

    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (adData) {
          if (entry.isIntersecting) {
            positionNativeAd();
          } else {
            AdMobNativeAdvanced.hideNativeAd({ adId: adData.adId });
          }
        }
      });
    }, { threshold: 0.1 });
    
    intersectionObserver.observe(adPlaceholderRef.current);

    let ticking = false;
    const updatePosition = () => {
      positionNativeAd();
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updatePosition);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      AdMobNativeAdvanced.hideNativeAd({ adId: adData.adId });
    };
  }, [adData, isIOS]);

  useEffect(() => {
    if (adData && !isIOS) {
      AdMobNativeAdvanced.reportImpression(adData.adId).catch(e => console.error('Impression error', e));
    }
  }, [adData, isIOS]);

  const onAdClick = async () => {
    if (!adData) return;
    if (!isIOS) {
      try {
        await AdMobNativeAdvanced.reportClick(adData.adId);
      } catch (error) {
        console.error('Error reporting ad click:', error);
      }
    }
  };

  const onAdChoicesClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isIOS) {
      window.open('https://www.google.com/settings/ads', '_blank');
    }
  };

  if (!adData && Capacitor.isNativePlatform()) return null;
  
  // Return dummy view in web view if needed, but the original project might just not show ads on web.
  if (!adData) {
     if (Capacitor.getPlatform() === 'web') {
        return (
          <div className="h-full w-full snap-start snap-always relative font-sans overflow-hidden flex items-center justify-center bg-black">
            <div className="w-full max-w-sm px-4">
              <div className="relative cursor-pointer border border-zinc-800 rounded-xl p-4 bg-zinc-900 shadow-xl">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded mr-3 bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
                <div className="mb-3 rounded overflow-hidden border border-zinc-800 h-[200px] bg-zinc-800 flex items-center justify-center">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Ad Placeholder</span>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="h-3 bg-zinc-800 rounded w-full" />
                  <div className="h-3 bg-zinc-800 rounded w-5/6" />
                </div>
                <button className="w-full py-3 bg-zinc-800 text-zinc-500 font-bold uppercase tracking-wide border-none rounded-lg text-sm mt-1">
                  Learn More
                </button>
                <div className="absolute -top-2 -left-2 bg-yellow-500 text-black px-2 py-0.5 rounded shadow-lg text-[10px] font-black tracking-widest uppercase">Sponsored Ad</div>
              </div>
            </div>
          </div>
        );
     }
     return null;
  }

  return (
    <div className={`h-full w-full snap-start snap-always relative font-sans overflow-hidden flex items-center justify-center ${isIOS ? 'bg-transparent' : 'bg-black'}`}>
      <div 
        ref={adPlaceholderRef}
        className={isIOS ? 'w-full px-4' : 'w-full max-w-sm px-4'}
        style={{ visibility: isIOS ? 'hidden' : 'visible', height: isIOS ? estimatedHeight : 'auto' }}
      >
        {!isIOS && (
          <div className="relative cursor-pointer border border-zinc-800 rounded-xl p-4 bg-zinc-900 shadow-xl" onClick={onAdClick}>
            <div className="flex items-center mb-3">
              {adData.iconUrl && (
                <img src={adData.iconUrl} className="w-10 h-10 rounded mr-3 object-cover" alt="Ad icon" />
              )}
              <div className="flex-1">
                {adData.headline && <h3 className="m-0 text-base font-semibold text-white leading-tight">{adData.headline}</h3>}
                {adData.advertiser && <p className="m-0 mt-1 text-xs text-zinc-400">{adData.advertiser}</p>}
              </div>
              <div className="flex items-center text-[10px] text-zinc-500 cursor-pointer bg-white/10 px-1 py-0.5 rounded ml-2" onClick={onAdChoicesClick}>
                {adData.adChoicesIconUrl && <img src={adData.adChoicesIconUrl} alt="AdChoices" className="w-4 h-4 mr-1" />}
                <span>{adData.adChoicesText || 'AdChoices'}</span>
              </div>
            </div>
            
            {adData.mediaContentUrl && (
              <div className="mb-3 rounded overflow-hidden border border-zinc-800">
                <img src={adData.mediaContentUrl} alt="Ad media" className="w-full max-h-[200px] object-cover" />
              </div>
            )}
            
            <div>
              {adData.body && <p className="m-0 mb-3 text-sm leading-relaxed text-zinc-300 line-clamp-3">{adData.body}</p>}
              
              {adData.isAppInstallAd && (
                <div className="flex items-center gap-2 mb-3 text-xs font-medium">
                  {adData.store && <span className="bg-blue-900/40 text-blue-400 border border-blue-900/60 px-2 py-0.5 rounded">{adData.store}</span>}
                  {adData.price && <span className="text-green-500">{adData.price}</span>}
                  {adData.starRating && (
                    <div className="text-orange-500 flex items-center gap-0.5">
                      {'★'.repeat(Math.round(adData.starRating))}
                      <span className="text-zinc-500">{'☆'.repeat(5 - Math.round(adData.starRating))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {adData.callToAction && (
              <button className="w-full py-3 bg-white text-black font-bold uppercase tracking-wide border-none rounded-lg text-sm cursor-pointer mt-1 hover:bg-zinc-200 active:scale-95 transition-all">
                {adData.callToAction}
              </button>
            )}
            
            <div className="absolute -top-2 -left-2 bg-yellow-500 text-black px-2 py-0.5 rounded shadow-lg text-[10px] font-black tracking-widest uppercase">Sponsored Ad</div>
          </div>
        )}
      </div>
    </div>
  );
};
