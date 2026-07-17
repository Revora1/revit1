import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export function AuthView() {
  const { signIn, signInWithEmail, error, isIOS } = useAuth();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      signInWithEmail(email, password);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-black text-white relative overflow-hidden">
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

          {!showEmail ? (
            <>
              <button
                id="google-signin-btn"
                onClick={signIn}
                className="w-full h-14 bg-white text-black rounded-full font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
               <LogIn size={20} />
                CONTINUE WITH GOOGLE
              </button>
              
              <button
                onClick={() => setShowEmail(true)}
                className="w-full h-14 bg-zinc-900 border border-zinc-800 text-white rounded-full font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-zinc-800"
              >
                <Mail size={20} />
                CONTINUE WITH EMAIL
              </button>
            </>
          ) : (
            <motion.form 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleEmailSignIn} 
              className="space-y-3"
            >
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 focus:outline-none focus:border-zinc-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 focus:outline-none focus:border-zinc-500"
                required
              />
              <button
                type="submit"
                className="w-full h-14 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                SIGN IN
                <ChevronRight size={20} />
              </button>
              <button
                type="button"
                onClick={() => setShowEmail(false)}
                className="w-full py-2 text-zinc-400 text-sm font-medium hover:text-white transition-colors"
              >
                Back to Sign In Options
              </button>
            </motion.form>
          )}

          <p className="text-xs text-zinc-500 px-8 pt-4">
            By joining, you agree to our Terms and Service.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
