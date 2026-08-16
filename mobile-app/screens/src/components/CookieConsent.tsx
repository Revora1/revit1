import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Check } from 'lucide-react';
import { GOOGLE_ANALYTICS_ID } from '../constants';
import { useAuth } from '../context/AuthContext';

export function CookieConsent() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  const loadGoogleScripts = () => {
    if (document.getElementById('gtag-script')) return;

    const script = document.createElement('script');
    script.id = 'gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`;
    document.head.appendChild(script);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', GOOGLE_ANALYTICS_ID);
    gtag('config', 'AW-17715078634');
  };

  useEffect(() => {
    if (!user) {
      setShow(false);
      return;
    }
    const consent = localStorage.getItem('gdpr-consent');
    if (consent !== 'accepted') {
      setShow(true);
    } else {
      loadGoogleScripts();
    }
  }, [user]);

  const handleConsent = (accepted: boolean) => {
    if (accepted) {
      localStorage.setItem('gdpr-consent', 'accepted');
      loadGoogleScripts();
      setShow(false);
      window.location.reload();
    } else {
      localStorage.removeItem('gdpr-consent');
      setShow(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-12 md:w-96 z-[200] bg-zinc-900 border border-zinc-800 rounded-[32px] shadow-2xl p-6 backdrop-blur-xl"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-white/10 rounded-2xl text-white">
              <Shield size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black italic tracking-tight text-white uppercase">Privacy First</h3>
              <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                We use cookies and share data with third-party advertising partners (like Google AdMob) to analyze app usage and deliver personalized advertisements. By clicking "Accept", you consent to this tracking and data sharing.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleConsent(false)}
              className="flex-1 py-3 px-4 rounded-2xl bg-zinc-800 text-zinc-400 text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={() => handleConsent(true)}
              className="flex-1 py-3 px-4 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={14} />
              Accept
            </button>
          </div>
          
          <button 
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
