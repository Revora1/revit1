import { useEffect, useState, useRef } from 'react';

// Use Google's sample VAST tag for IMA
export const IMA_SAMPLE_AD_TAG = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';

interface UseIMAProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  adContainerRef: React.RefObject<HTMLElement>;
  adTagUrl?: string;
  onAdStart?: () => void;
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
  onContentPauseRequested?: () => void;
  onContentResumeRequested?: () => void;
}

export function useIMA({ 
  videoRef, 
  adContainerRef, 
  adTagUrl = IMA_SAMPLE_AD_TAG, 
  onAdStart, 
  onAdComplete, 
  onAdError,
  onContentPauseRequested,
  onContentResumeRequested
}: UseIMAProps) {
  const [adsManager, setAdsManager] = useState<any>(null);
  const [adsLoader, setAdsLoader] = useState<any>(null);
  const [adDisplayContainer, setAdDisplayContainer] = useState<any>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const playAdsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Load IMA SDK
    if (!document.getElementById('ima-sdk-script')) {
      const script = document.createElement('script');
      script.id = 'ima-sdk-script';
      script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
      script.onload = () => {
        setIsSdkLoaded(true);
      };
      document.head.appendChild(script);
    } else {
      setIsSdkLoaded(true);
    }
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    const adContainerElement = adContainerRef.current;

    if (!isSdkLoaded || !videoElement || !adContainerElement || !(window as any).google) return;

    const google = (window as any).google;

    // Create ad display container
    const displayContainer = new google.ima.AdDisplayContainer(adContainerElement, videoElement);
    setAdDisplayContainer(displayContainer);

    // Initialize ads loader
    const loader = new google.ima.AdsLoader(displayContainer);
    setAdsLoader(loader);

    loader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      (adsManagerLoadedEvent: any) => {
        const adsRenderingSettings = new google.ima.AdsRenderingSettings();
        adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
        
        // VideoElement must be passed in here so IMA can control it
        const manager = adsManagerLoadedEvent.getAdsManager(videoElement, adsRenderingSettings);
        setAdsManager(manager);

        // Add event listeners to the AdsManager
        manager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, (adErrorEvent: any) => {
          console.error('Ad Error:', adErrorEvent.getError());
          if (onAdError) onAdError(adErrorEvent.getError());
          manager.destroy();
        });

        manager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
          if (onContentPauseRequested) onContentPauseRequested();
          else videoElement.pause();
        });

        manager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
          if (onContentResumeRequested) onContentResumeRequested();
          else videoElement.play().catch((e: any) => console.log('Resume error', e));
        });

        manager.addEventListener(google.ima.AdEvent.Type.STARTED, () => {
          if (onAdStart) onAdStart();
        });

        manager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
          if (onAdComplete) onAdComplete();
        });

        // Save playAds function to start ads
        playAdsRef.current = () => {
          try {
            // Initialize the container. Must be done via a user action on mobile devices.
            displayContainer.initialize();
            
            // Set dimensions
            manager.init(videoElement.clientWidth, videoElement.clientHeight, google.ima.ViewMode.NORMAL);
            
            manager.start();
          } catch (adError) {
            console.error('Ad Error:', adError);
            if (onAdError) onAdError(adError);
          }
        };
        
        // Auto-play the ad once loaded if we want
        playAdsRef.current();
      },
      false
    );

    loader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      (adErrorEvent: any) => {
        console.error('Ad loader Error:', adErrorEvent.getError());
        if (onAdError) onAdError(adErrorEvent.getError());
      },
      false
    );

    // Cleanup
    return () => {
      if (loader) {
        loader.destroy();
      }
      if (adsManager) {
        adsManager.destroy();
      }
    };
  }, [isSdkLoaded, videoRef, adContainerRef]);

  const requestAds = (tagUrl = adTagUrl) => {
    if (!adsLoader || !isSdkLoaded || !(window as any).google) return;
    
    const google = (window as any).google;
    const adsRequest = new google.ima.AdsRequest();
    
    adsRequest.adTagUrl = tagUrl;
    
    const videoElement = videoRef.current;
    
    // Pass the video element constraints
    adsRequest.linearAdSlotWidth = videoElement?.clientWidth || 640;
    adsRequest.linearAdSlotHeight = videoElement?.clientHeight || 400;
    adsRequest.nonLinearAdSlotWidth = videoElement?.clientWidth || 640;
    adsRequest.nonLinearAdSlotHeight = videoElement?.clientHeight || 400;
    
    adsLoader.requestAds(adsRequest);
  };

  return { requestAds, isSdkLoaded };
}
