// Proof-of-Origin (PO) token minting via BotGuard. Without a session-bound PO token YouTube
// only serves the first ~1 MiB of any media stream. We run Google's BotGuard VM inside jsdom,
// obtain an integrity token from the WAA API, and mint a token bound to our visitor id.
import { JSDOM, VirtualConsole } from 'jsdom';
import { BotGuardClient } from 'bgutils-js/botguard';
import { WebPoMinter } from 'bgutils-js/webpo';
import { buildURL, GOOG_API_KEY, USER_AGENT } from 'bgutils-js/utils';

const REQUEST_KEY = 'O43z0dpjhgX20SCx4KAo'; // YouTube's public BotGuard request key
let domInstalled = false;

/** Install just enough of a browser environment for BotGuard's interpreter. Idempotent. */
function installDom() {
  if (domInstalled) return;
  const virtualConsole = new VirtualConsole(); // swallow "not implemented" notices (canvas etc.)
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { url: 'https://www.youtube.com/', pretendToBeVisual: true, virtualConsole });
  const win = dom.window;
  Object.defineProperties(globalThis, {
    window: { value: win, configurable: true },
    document: { value: win.document, configurable: true },
  });
  for (const key of ['HTMLElement', 'Element', 'Node', 'location', 'origin', 'navigator', 'self']) {
    if (!(key in globalThis)) {
      try {
        Object.defineProperty(globalThis, key, { value: win[key], configurable: true });
      } catch {
        /* ignore read-only globals */
      }
    }
  }
  domInstalled = true;
}

const waa = (endpoint, body) =>
  fetch(buildURL(endpoint, true), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json+protobuf',
      'x-goog-api-key': GOOG_API_KEY,
      'x-user-agent': 'grpc-web-javascript/0.1',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify(body),
  });

/**
 * Create a PO token minter using an InnerTube session that can fetch the BotGuard challenge.
 * Returns { sessionToken, mint(contentBinding), ttlMs }. `mint` produces content-bound tokens
 * (bind to a video id for media streams) from the same integrity token.
 */
export async function createPoTokenMinter(innertube, visitorData) {
  installDom();

  const challengeResponse = await innertube.getAttestationChallenge('ENGAGEMENT_TYPE_UNBOUND');
  const challenge = challengeResponse.bg_challenge;
  if (!challenge) throw new Error('BotGuard challenge unavailable');

  const interpreterUrl = challenge.interpreter_url?.private_do_not_access_or_else_trusted_resource_url_wrapped_value;
  if (!interpreterUrl) throw new Error('BotGuard interpreter url missing');
  const script = await fetch(`https:${interpreterUrl}`).then((r) => r.text());
  new Function(script)();

  const botguard = await BotGuardClient.create({ program: challenge.program, globalName: challenge.global_name, globalObject: globalThis });
  const webPoSignalOutput = [];
  const botguardResponse = await botguard.snapshot({ webPoSignalOutput });

  const itRes = await waa('GenerateIT', [REQUEST_KEY, botguardResponse]);
  if (!itRes.ok) throw new Error(`Integrity token request failed (${itRes.status})`);
  const [integrityToken, estimatedTtlSecs, mintRefreshThreshold] = await itRes.json();
  if (!integrityToken) throw new Error('No integrity token returned');

  const minter = await WebPoMinter.create({ integrityToken, estimatedTtlSecs, mintRefreshThreshold }, webPoSignalOutput);
  const sessionToken = await minter.mintAsWebsafeString(visitorData);
  const ttlMs = Math.max(60, Math.min(Number(estimatedTtlSecs) || 3600, 12 * 3600)) * 1000;
  const cache = new Map();
  return {
    sessionToken,
    ttlMs,
    expires: Date.now() + ttlMs,
    async mint(contentBinding) {
      let token = cache.get(contentBinding);
      if (!token) {
        token = await minter.mintAsWebsafeString(contentBinding);
        cache.set(contentBinding, token);
        if (cache.size > 1000) cache.delete(cache.keys().next().value);
      }
      return token;
    },
    shutdown: () => botguard.shutdown().catch(() => undefined),
  };
}
