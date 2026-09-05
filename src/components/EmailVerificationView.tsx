import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, RefreshCw, LogOut, AlertCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

interface EmailVerificationViewProps {
  onVerified?: () => void;
}

export function EmailVerificationView({ onVerified }: EmailVerificationViewProps) {
  const { user, sendVerificationEmail, reloadUser, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // 60-second cooldown for resending
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setErrorMessage(null);
    try {
      const verified = await reloadUser();
      if (verified) {
        setVerifiedSuccess(true);
        setTimeout(() => {
          if (onVerified) onVerified();
        }, 1200);
      } else {
        setErrorMessage("We haven't received your confirmation yet. Please click the link in your email, then tap Check Status again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to check verification status. Please check your connection.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage(null);
    setResendSuccess(false);

    try {
      await sendVerificationEmail();
      setResendSuccess(true);
      setCooldown(60);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Too many requests. Please wait a minute before requesting another verification email.');
        setCooldown(60);
      } else {
        setErrorMessage(err.message || 'Failed to resend verification email.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div id="email-verification-view" className="h-full flex flex-col items-center justify-center p-6 bg-black text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-6"
      >
        {/* Animated Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
              {verifiedSuccess ? (
                <CheckCircle2 size={40} className="text-emerald-400 animate-bounce" />
              ) : (
                <Mail size={38} className="text-red-500" />
              )}
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[11px] font-black">
              1
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-red-500">REVITUP VERIFICATION</p>
          <h1 className="text-3xl font-black italic tracking-tight">VERIFY YOUR EMAIL</h1>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
            We sent a verification link to your email address:
          </p>
          <div className="pt-1">
            <span className="inline-block font-mono text-sm font-bold text-white bg-zinc-900/90 border border-zinc-800 px-4 py-1.5 rounded-full shadow-inner break-all">
              {user?.email || 'your email'}
            </span>
          </div>
        </div>

        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {verifiedSuccess && (
            <motion.div
              key="verified-msg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              Email verified successfully! Welcome to RevItUp.
            </motion.div>
          )}

          {resendSuccess && (
            <motion.div
              key="resend-msg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Send size={16} />
              Verification link resent! Check your inbox and spam folder.
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              key="error-msg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium text-left flex items-start gap-2.5"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pro Tip Box */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-left space-y-1.5">
          <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Quick Instructions
          </p>
          <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
            <li>Open the email from RevItUp and click the verification link.</li>
            <li>If you don't see it, check your <span className="text-white font-semibold">Spam</span> or <span className="text-white font-semibold">Junk</span> folder.</li>
            <li>Return here and tap <span className="text-white font-semibold">Check Verification Status</span>.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            id="btn-check-verification"
            type="button"
            onClick={handleCheckStatus}
            disabled={checking || verifiedSuccess}
            className="w-full h-13 bg-white hover:bg-zinc-200 text-black font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {checking ? (
              <>
                <RefreshCw size={18} className="animate-spin text-black" />
                CHECKING STATUS...
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                I'VE VERIFIED MY EMAIL
              </>
            )}
          </button>

          <button
            id="btn-resend-verification"
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending || verifiedSuccess}
            className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            {resending ? (
              <>
                <RefreshCw size={14} className="animate-spin text-zinc-400" />
                SENDING NEW LINK...
              </>
            ) : cooldown > 0 ? (
              <>
                <Send size={14} className="text-zinc-500" />
                RESEND EMAIL ({cooldown}s)
              </>
            ) : (
              <>
                <Send size={14} className="text-red-500" />
                RESEND VERIFICATION EMAIL
              </>
            )}
          </button>

          <button
            id="btn-verification-logout"
            type="button"
            onClick={logout}
            className="text-xs text-zinc-400 hover:text-white font-bold transition-colors flex items-center justify-center gap-1.5 mx-auto pt-2 cursor-pointer"
          >
            <LogOut size={14} />
            SIGN OUT / USE DIFFERENT EMAIL
          </button>
        </div>
      </motion.div>
    </div>
  );
}
