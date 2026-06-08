import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

