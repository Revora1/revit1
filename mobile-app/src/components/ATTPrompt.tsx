import React from 'react';
import { Target, Check, Shield } from 'lucide-react';
import { AppTrackingTransparency } from '@capgo/capacitor-app-tracking-transparency';

interface ATTPromptProps {
  onComplete: () => void;
}

export function ATTPrompt({ onComplete }: ATTPromptProps) {
  const handleContinue = async () => {
    try {
      await AppTrackingTransparency.requestPermission();
    } catch (e) {
      console.log("Failed to request ATT permission:", e);
    } finally {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-between px-6 pt-16 pb-10 text-white animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-6 mt-8">
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6">
          <Target size={32} className="text-yellow-500" />
        </div>
        
        <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-tight">
          Help Us Keep <br/> RevitUp Free
        </h1>
        
        <p className="text-zinc-400 text-sm font-medium leading-relaxed">
          RevitUp relies on ads to keep the servers running. To show you relevant ads that match your interests, we need your permission.
        </p>

        <div className="space-y-4 pt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check size={14} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase">Relevant Ads</h3>
              <p className="text-xs text-zinc-500 mt-1">See ads tailored to car enthusiasts rather than random promotions.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield size={14} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase">You're in Control</h3>
              <p className="text-xs text-zinc-500 mt-1">You can change this anytime in your device settings. Your data is never sold.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <button 
          onClick={handleContinue}
          className="w-full bg-yellow-500 text-black font-black uppercase italic tracking-widest py-4 rounded-xl active:scale-95 transition-all text-sm"
        >
          Continue
        </button>
        <p className="text-[10px] text-zinc-500 text-center font-medium px-4">
          On the next screen, tap "Allow" to support RevitUp.
        </p>
      </div>
    </div>
  );
}
