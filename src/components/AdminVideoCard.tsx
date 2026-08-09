import React, { useRef, useEffect, useState } from 'react';
import { useIMA } from '../hooks/useIMA';

interface AdminVideoProps {
  video: {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    hasPreRollAd?: boolean;
    hasMidRollAd?: boolean;
  };
  isActive: boolean;
}

export function AdminVideoCard({ video, isActive }: AdminVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [adError, setAdError] = useState(false);
  const [midRollRequested, setMidRollRequested] = useState(false);

  const { requestAds, isSdkLoaded } = useIMA({
    videoRef: videoRef,
    adContainerRef: adContainerRef,
    onAdStart: () => {
      setIsPlayingAd(true);
    },
    onAdComplete: () => {
      setIsPlayingAd(false);
    },
    onAdError: (e) => {
      console.error('IMA Ad Error:', e);
      setAdError(true);
      setIsPlayingAd(false);
      if (videoRef.current) {
        videoRef.current.play().catch(console.error);
      }
    },
    onContentPauseRequested: () => {
      if (videoRef.current) videoRef.current.pause();
    },
    onContentResumeRequested: () => {
      if (videoRef.current) videoRef.current.play().catch(console.error);
    }
  });

  useEffect(() => {
    if (!isActive) {
      if (videoRef.current) videoRef.current.pause();
      return;
    }

    if (video.hasPreRollAd && isSdkLoaded && !adError) {
      // IMA will pause the video when ad starts, but let's pause it initially
      if (videoRef.current) videoRef.current.pause();
      
      try {
        requestAds(); // This will trigger playAds internally in useIMA once loaded
      } catch (e) {
        setAdError(true);
        if (videoRef.current) videoRef.current.play().catch(console.error);
      }
    } else {
      if (videoRef.current) {
        videoRef.current.play().catch(console.error);
      }
    }
  }, [isActive, isSdkLoaded, video.hasPreRollAd, adError]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    // Check for mid-roll
    const progress = videoRef.current.currentTime / videoRef.current.duration;
    if (video.hasMidRollAd && progress >= 0.5 && !midRollRequested && isSdkLoaded && !adError) {
      setMidRollRequested(true);
      try {
        requestAds();
      } catch (e) {
        console.error('Mid-roll error', e);
      }
    }
  };

  return (
    <div className="h-full w-full relative bg-black snap-start snap-always flex flex-col justify-center overflow-hidden flex-shrink-0">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none z-10" />
      
      <div className="absolute bottom-24 left-4 right-16 z-30 space-y-3 pointer-events-auto">
        <h2 className="text-white font-black italic text-xl uppercase tracking-tighter">{video.title}</h2>
        <p className="text-zinc-300 text-sm font-medium">{video.description}</p>
        <div className="flex items-center gap-2 pt-2">
           <span className="text-[10px] font-black tracking-[0.2em] uppercase font-sans bg-amber-500 text-black px-2 py-1 rounded-sm">
             ADMIN SHOWCASE
           </span>
        </div>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {/* The video element */}
        <video
          ref={videoRef}
          src={video.videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          playsInline
          loop
          muted={false} // May require user interaction for autoplay unmuted
        />

        {/* The ad container layered on top */}
        <div 
          ref={adContainerRef} 
          className={`absolute inset-0 z-20 ${isPlayingAd ? 'block' : 'hidden'}`} 
        />
        
        {isPlayingAd && (
          <div className="absolute top-4 right-4 z-30 bg-amber-500 text-black px-2 py-1 rounded text-xs font-bold uppercase tracking-widest">
            Sponsored
          </div>
        )}
      </div>
    </div>
  );
}
