import React, { useEffect } from 'react';
import { ADSENSE_CLIENT_ID, ADSENSE_SLOT_ID, ADSENSE_LAYOUT_KEY } from '../constants';

interface AdSlotProps {
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function AdSlot({ className }: AdSlotProps) {
  useEffect(() => {
    const consent = localStorage.getItem('gdpr-consent');

    // 1. Ensure AdSense script is loaded
    if (!document.getElementById('adsense-script')) {
      const script = document.createElement('script');
      script.id = 'adsense-script';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }

    // 2. Initialize Ad
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        // GDPR: If user has not explicitly accepted, request non-personalized ads
        if (consent !== 'accepted') {
          (window as any).adsbygoogle = window.adsbygoogle || [];
          (window as any).adsbygoogle.requestNonPersonalizedAds = 1;
        } else {
          (window as any).adsbygoogle = window.adsbygoogle || [];
          (window as any).adsbygoogle.requestNonPersonalizedAds = 0;
        }

        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key={ADSENSE_LAYOUT_KEY}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={ADSENSE_SLOT_ID}
      />
    </div>
  );
}
