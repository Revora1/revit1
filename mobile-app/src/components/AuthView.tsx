import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronRight, Apple, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';

export function AuthView() {
  const { signInWithEmail, signUpWithEmail, error } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const { resetPassword } = useAuth();

  const isWeb = Capacitor.getPlatform() === 'web';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (isSignUp) {
      const cleanUsername = username.trim();
      if (!cleanUsername) {
        setValidationError('Please choose a username for your account.');
        return;
      }
      if (cleanUsername.length < 3 || cleanUsername.length > 20) {
        setValidationError('Username must be between 3 and 20 characters.');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        setValidationError('Username can only contain letters, numbers, and underscores.');
        return;
      }
    }

    if (email && password) {
      setIsSubmitting(true);
      try {
        if (isSignUp) {
          await signUpWithEmail(email, password, username);
        } else {
          await signInWithEmail(email, password);
        }
      } catch (err) {
        console.error("Authentication submission failed:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const activeError = validationError || error;

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
          {activeError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium"
            >
              {activeError}
            </motion.div>
          )}

          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAuth} 
            className="space-y-3 animate-fade-in"
          >
            <AnimatePresence initial={false}>
              {isSignUp && (
                <motion.div
                  key="username-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Choose Username (e.g. Tony, BoostedGT)"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.replace(/\s+/g, ''));
                      if (validationError) setValidationError(null);
                    }}
                    disabled={isSubmitting}
                    className="w-full h-14 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                    required={isSignUp}
                  />
                  <p className="text-[11px] text-zinc-500 text-left px-1">
                    Your permanent username across RevItUp.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-14 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
              required
            />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-14 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isSignUp ? 'CREATING ACCOUNT...' : 'AUTHENTICATING...'}
                </span>
              ) : (
                <>
                  {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
                  {isSignUp ? <UserPlus size={20} /> : <ChevronRight size={20} />}
                </>
              )}
            </button>
          </motion.form>

          <div className="flex flex-col items-center gap-4 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setValidationError(null);
              }}
              className="text-sm font-bold text-white hover:text-zinc-300 transition-colors flex items-center gap-2"
            >
              {isSignUp ? (
                <>
                  <LogIn size={16} /> ALREADY HAVE AN ACCOUNT? SIGN IN
                </>
              ) : (
                <>
                  <UserPlus size={16} /> NEED AN ACCOUNT? SIGN UP
                </>
              )}
            </button>
            
            <button 
              type="button"
              onClick={async () => {
                if (!email) {
                  setResetError('Please enter your email address first.');
                  return;
                }
                setIsSubmitting(true);
                setResetError(null);
                setResetSent(false);
                try {
                  await resetPassword(email);
                  setResetSent(true);
                } catch (err: any) {
                  setResetError(err.message || 'Failed to send reset email');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="text-xs text-zinc-400 font-bold hover:text-white transition-colors"
            >
              FORGOT PASSWORD?
            </button>
            {resetSent && (
              <p className="text-xs text-emerald-400 font-medium text-center">Password reset email sent! Check your inbox.</p>
            )}
            {resetError && (
              <p className="text-xs text-red-500 font-medium text-center">{resetError}</p>
            )}
          </div>

          <p className="text-xs text-zinc-500 px-8 pt-4">
            By joining, you agree to our <a href="/privacy-policy" className="underline hover:text-zinc-300">Privacy & Cookie Policy</a> and Terms of Service.
          </p>

          {isWeb && (
            <div className="pt-6">
              <a 
                href="https://apps.apple.com/gb/app/revitup/id6791627706" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-white px-5 py-3 rounded-2xl transition-all active:scale-95"
              >
                <Apple size={24} />
                <div className="text-left flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold leading-none mb-0.5">Download on the</span>
                  <span className="text-sm font-black tracking-tight leading-none">App Store</span>
                </div>
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
