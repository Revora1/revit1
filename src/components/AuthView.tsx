import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export function AuthView() {
  const { signIn, error, isIOS } = useAuth();
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center p-6 bg-black text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-zinc-900 rounded-full blur-[100px] -z-10 opacity-50" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-8 w-full max-w-sm"
      >
        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-tighter italic">REVITUP</h1>
          <p className="text-zinc-400 font-medium">FOR THE CAR COMMUNITY</p>
        </div>

        <div className="space-y-4">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium"
            >
              {error}
            </motion.div>
          )}

          {isIOS && isIframe && !error && (
             <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
                Tip: If sign-in fails on iPhone, try opening this app in a new tab.
             </div>
          )}

          <button
            id="google-signin-btn"
            onClick={signIn}
            className="w-full h-14 bg-white text-black rounded-full font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
           <LogIn size={20} />
            CONTINUE WITH GOOGLE
          </button>
          
          <p className="text-xs text-zinc-500 px-8">
            By joining, you agree to our Terms and Service.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
