// Low-level client for the JioSaavn web API plus stream URL decryption.
import CryptoJS from 'crypto-js';

const BASE = 'https://www.jiosaavn.com/api.php';
const DEFAULT_PARAMS = { api_version: '4', _format: 'json', _marker: '0', ctx: 'web6dot0' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');

export const DEFAULT_LANGUAGES = 'hindi,english';

/**
 * Call a JioSaavn endpoint. `callName` is the __call name, `params` are extra query params.
 * `languages` is a comma separated list that becomes the L cookie (drives home/trending content).
 */
export async function call(callName, params = {}, { languages = DEFAULT_LANGUAGES, timeoutMs = 15000 } = {}) {
  const url = new URL(BASE);
  url.searchParams.set('__call', callName);
  for (const [k, v] of Object.entries({ ...DEFAULT_PARAMS, ...params })) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json', Cookie: `L=${languages}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Upstream ${callName} responded ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Upstream ${callName} returned a non-JSON payload`);
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Decrypt the DES-ECB encoded media url into a plain CDN url. */
export function decryptMediaUrl(encrypted) {
  if (!encrypted) return null;
  try {
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encrypted) },
      DES_KEY,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 },
    );
    const url = decrypted.toString(CryptoJS.enc.Utf8);
    return url && url.startsWith('http') ? url : null;
  } catch {
    return null;
  }
}

/**
 * Build the quality ladder from a decrypted url. The CDN exposes the same file at
 * _12/_48/_96/_160/_320 kbps; 320 is only present when the catalog marks it as such.
 */
export function buildStreams(decryptedUrl, has320) {
  if (!decryptedUrl) return null;
  const at = (kbps) => decryptedUrl.replace(/_(12|48|96|160|320)\.(mp4|m4a|mp3)/, `_${kbps}.$2`);
  return {
    low: at(96),
    medium: at(160),
    high: has320 ? at(320) : at(160),
    highBitrate: has320 ? 320 : 160,
  };
}
