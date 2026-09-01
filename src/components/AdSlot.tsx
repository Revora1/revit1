import React, { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT_ID, ADSENSE_SLOT_ID, ADSENSE_LAYOUT_KEY } from '../constants';
import { Sparkles } from 'lucide-react';

interface AdSlotProps {
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function AdSlot({ className }: AdSlotProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef<boolean>(false);

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

    // 2. Initialize Ad only if not already pushed and the DOM element is unpopulated
    if (pushedRef.current) return;

    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && adRef.current) {
          // Check if this specific <ins> element already has an ad or data-adsbygoogle-status
          const alreadyFilled =
            adRef.current.getAttribute('data-adsbygoogle-status') ||
            adRef.current.getAttribute('data-ad-status') ||
            adRef.current.innerHTML.trim().length > 0;

          if (!alreadyFilled && !pushedRef.current) {
            window.adsbygoogle = window.adsbygoogle || [];
            
            // GDPR: If user has not explicitly accepted, request non-personalized ads
            if (consent !== 'accepted') {
              (window.adsbygoogle as any).requestNonPersonalizedAds = 1;
            } else {
              (window.adsbygoogle as any).requestNonPersonalizedAds = 0;
            }

            window.adsbygoogle.push({});
            pushedRef.current = true;
          }
        }
      } catch (e: any) {
        // Silently catch benign already-filled errors
        if (!e?.message?.includes('already have ads')) {
          console.error('AdSense initialization:', e);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className={`relative ${className || ''}`}>
      {/* Elegant SPONSORED Logo Header */}
      <div className="flex items-center justify-center gap-1.5 mb-2 bg-yellow-500 text-black py-1 px-3.5 rounded-full w-fit mx-auto shadow-[0_2px_8px_rgba(234,179,8,0.25)] border border-yellow-400">
        <Sparkles size={8} className="fill-black" />
        <span className="text-[8px] font-black tracking-[0.15em] uppercase font-sans">SPONSORED</span>
        <Sparkles size={8} className="fill-black" />
      </div>
      <ins
        ref={adRef}
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
