import https from 'https';
import crypto from 'crypto';

interface AdMobKey {
  keyId: number;
  pem: string;
  base64: string;
}

interface AdMobKeysResponse {
  keys: AdMobKey[];
}

// In-memory cache for AdMob public verification keys (Google recommends max 24 hour TTL)
let cachedKeys: Map<number, string> = new Map();
let cacheExpiresAt = 0;

const ADMOB_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Fetches Google AdMob ECDSA public keys with caching.
 */
export async function getAdMobPublicKeys(): Promise<Map<number, string>> {
  const now = Date.now();
  if (cachedKeys.size > 0 && now < cacheExpiresAt) {
    return cachedKeys;
  }

  return new Promise((resolve) => {
    https.get(ADMOB_KEYS_URL, (res) => {
      if (res.statusCode !== 200) {
        console.warn(`[AdMob SSV] Failed to fetch public keys, HTTP status ${res.statusCode}`);
        return resolve(cachedKeys); // Return existing cache if any
      }

      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsed: AdMobKeysResponse = JSON.parse(rawData);
          const keyMap = new Map<number, string>();
          if (Array.isArray(parsed.keys)) {
            for (const k of parsed.keys) {
              if (k.keyId && k.pem) {
                keyMap.set(k.keyId, k.pem);
              }
            }
          }
          if (keyMap.size > 0) {
            cachedKeys = keyMap;
            cacheExpiresAt = Date.now() + CACHE_TTL_MS;
            console.log(`[AdMob SSV] Successfully loaded ${keyMap.size} verification public keys from AdMob.`);
          }
          resolve(cachedKeys);
        } catch (err) {
          console.error('[AdMob SSV] Failed to parse AdMob public keys JSON:', err);
          resolve(cachedKeys);
        }
      });
    }).on('error', (err) => {
      console.error('[AdMob SSV] Error connecting to AdMob key server:', err);
      resolve(cachedKeys);
    });
  });
}

/**
 * Verifies an AdMob Server-Side Verification (SSV) callback URL.
 * AdMob passes parameters in alphabetical order, followed by &signature=...&key_id=...
 */
export async function verifyAdMobSSV(originalUrl: string): Promise<{
  isValid: boolean;
  reason?: string;
  params: Record<string, string>;
}> {
  try {
    const questionIndex = originalUrl.indexOf('?');
    if (questionIndex === -1) {
      return { isValid: false, reason: 'No query string found', params: {} };
    }

    const queryString = originalUrl.substring(questionIndex + 1);

    // Find signature=
    const sigIndex = queryString.indexOf('signature=');
    if (sigIndex === -1) {
      return { isValid: false, reason: 'Missing signature parameter', params: {} };
    }

    // Content to verify is everything before &signature=
    // (Notice: query strings have & before signature unless signature is first, but Google specs state it is second-to-last)
    const contentToVerify = sigIndex > 0 && queryString[sigIndex - 1] === '&'
      ? queryString.substring(0, sigIndex - 1)
      : queryString.substring(0, sigIndex);

    // Extract signature and key_id from queryString
    const parsedParams: Record<string, string> = {};
    const urlParams = new URLSearchParams(queryString);
    urlParams.forEach((val, key) => {
      parsedParams[key] = val;
    });

    const signature = parsedParams['signature'];
    const keyIdStr = parsedParams['key_id'];

    if (!signature) {
      return { isValid: false, reason: 'Empty signature', params: parsedParams };
    }
    if (!keyIdStr) {
      return { isValid: false, reason: 'Missing key_id parameter', params: parsedParams };
    }

    const keyId = parseInt(keyIdStr, 10);
    if (isNaN(keyId)) {
      return { isValid: false, reason: `Invalid key_id format: ${keyIdStr}`, params: parsedParams };
    }

    // Fetch keys (cached)
    let keys = await getAdMobPublicKeys();
    let publicKeyPem = keys.get(keyId);

    // If keyId not in cache, force fresh download
    if (!publicKeyPem) {
      cacheExpiresAt = 0; // Invalidate cache
      keys = await getAdMobPublicKeys();
      publicKeyPem = keys.get(keyId);
    }

    if (!publicKeyPem) {
      return { isValid: false, reason: `AdMob Public Key ID ${keyId} not found in trusted keys`, params: parsedParams };
    }

    // Convert web-safe base64 signature to standard base64 Buffer
    let base64Sig = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Sig.length % 4 !== 0) {
      base64Sig += '=';
    }
    const signatureBuffer = Buffer.from(base64Sig, 'base64');

    // Cryptographic verification with ECDSA-SHA256
    const verifier = crypto.createVerify('SHA256');
    verifier.update(contentToVerify, 'utf8');
    const isValid = verifier.verify(publicKeyPem, signatureBuffer);

    if (!isValid) {
      return { isValid: false, reason: 'Cryptographic signature mismatch', params: parsedParams };
    }

    return { isValid: true, params: parsedParams };
  } catch (err: any) {
    return { isValid: false, reason: err?.message || 'Verification exception', params: {} };
  }
}
