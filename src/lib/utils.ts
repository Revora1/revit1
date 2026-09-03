import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips HTML tags, removes javascript links and script tags,
 * and escapes active symbols to protect against Stored Cross-Site Scripting (XSS).
 */
export function sanitizeInput(text: string): string {
  if (!text) return '';
  
  // 1. Remove dangerous script, style, iframe, embed, object tags with content recursively
  let cleaned = text.replace(/<(script|style|iframe|embed|object|frameset|applet|form|meta)[^>]*>[\s\S]*?<\/\1>/gi, '');
  
  // 2. Remove self-closing or single html tags of interest
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // 3. Safe character escaping to prevent HTML injection execution
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
    
  return cleaned;
}

/**
 * Validates usernames to strictly enforce safe, alphanumeric-only profiles
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.length < 3 || username.length > 25) return false;
  const usernameRegex = /^[a-zA-Z0-9_\-]+$/;
  return usernameRegex.test(username);
}

export function getBaseUrl(): string {
  // Use the actual domain if running in Capacitor (native app) or AI Studio preview
  if (window.location.origin.includes('capacitor://') || 
      window.location.origin.includes('localhost') || 
      window.location.origin.includes('run.app') || 
      window.location.origin.includes('webcontainer')) {
    return 'https://revitup.today'; // Using .today domain as default native share link
  }
  return window.location.origin;
}

/**
 * Robust copy-to-clipboard function engineered to work inside sandboxed iframes and various mobile browsers.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Try modern clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard failed inside sandbox, trying fallback...", err);
    }
  }

  // 2. Legacy textarea select and execCommand('copy') fallback
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Position off-screen to avoid visual jump
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    
    if (successful) {
      return true;
    }
  } catch (err) {
    console.error("execCommand fallback failed:", err);
  }

  // 3. Last resort visual fallback - show a standard prompt so user can manually copy
  try {
    const manualPrompt = window.prompt("Copy the link below:", text);
    if (manualPrompt !== null) {
      return true;
    }
  } catch (err) {
    console.error("window.prompt fallback failed:", err);
  }

  return false;
}

export async function shareContent(shareData: { title: string; text: string; url: string }): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({
        title: shareData.title,
        text: shareData.text,
        url: shareData.url,
        dialogTitle: 'Share',
      });
      return true;
    } else if (navigator.share) {
      await navigator.share({
        title: shareData.title,
        text: shareData.text || undefined,
        url: shareData.url,
      });
      return true;
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.warn('Share failed, trying copy fallback...', error);
    } else {
      return false; // User cancelled
    }
  }
  
  // Fallback to clipboard
  return await copyToClipboard(shareData.url);
}

