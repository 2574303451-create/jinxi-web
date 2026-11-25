export const accessDigestKey = 'JINXI_SYNTHETIC_ACCESS_SHA256';
export const accessUser = 'jinxi-test';

export function privateHeaders(init, vary) {
  const headers = new Headers(init);
  headers.set('Cache-Control', 'no-store, private');
  headers.set('Netlify-CDN-Cache-Control', 'no-store');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Pragma', 'no-cache');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (vary) headers.set('Vary', vary);
  return headers;
}

export function accessError(status, head = false, challenge = true) {
  const headers = privateHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }, 'Authorization, Cookie');
  if (status === 401 && challenge) headers.set('WWW-Authenticate', 'Basic realm="JINXI synthetic TEST", charset="UTF-8"');
  const message = status === 401 ? 'TEST_ACCESS_REQUIRED' :
    status === 404 ? 'TEST_ROUTE_NOT_FOUND' : status === 405 ? 'TEST_METHOD_REJECTED' : 'TEST_ACCESS_UNAVAILABLE';
  return new Response(head ? null : message, { status, headers });
}

// The server-side value is the SHA-256 of a random 32-byte password
// represented as 64 lowercase hexadecimal characters.
export async function authorizeAccess(request, digest) {
  const head = request.method === 'HEAD';
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) return accessError(503, head);
  const value = request.headers.get('authorization') || '';
  const encoded = /^Basic ([A-Za-z0-9+/=]{1,104})$/i.exec(value)?.[1];
  let password;
  try {
    const decoded = encoded && atob(encoded);
    if (decoded?.startsWith(accessUser + ':')) password = decoded.slice(accessUser.length + 1);
  } catch { return accessError(401, head); }
  if (!password || !/^[a-f0-9]{64}$/.test(password)) return accessError(401, head);
  const actual = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)));
  let difference = 0;
  for (let index = 0; index < actual.length; index++) {
    difference |= actual[index] ^ Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16);
  }
  return difference ? accessError(401, head) : null;
}

const visitorCookie = '__Host-jinxi_test_access';
const encode = value => new TextEncoder().encode(value);
const signatureInput = (binding, expires) =>
  encode(JSON.stringify(['jinxi-test-access-v1', binding.origin, binding.siteId, binding.deployId, expires]));
const signingKey = digest => crypto.subtle.importKey('raw', encode(digest),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

// Basic Auth starts a browser session on a top-level document. Later requests
// may omit the Authorization header and must never open a native dialog.
export async function authorizeBrowserAccess(request, digest, binding, document = false) {
  const head = request.method === 'HEAD';
  const now = Math.floor(Date.now() / 1000);
  const deadline = Math.floor(Date.parse(binding.expiresAt) / 1000);
  if (!/^[a-f0-9]{64}$/.test(digest ?? '') || !Number.isSafeInteger(deadline) || deadline <= now) {
    return { refusal: accessError(503, head, false) };
  }
  const cookies = (request.headers.get('cookie') ?? '').split(';')
    .map(field => field.trim()).filter(field => field.startsWith(visitorCookie + '='));
  const token = cookies.length === 1 && /^(\d{1,12})\.([a-f0-9]{64})$/.exec(cookies[0].slice(visitorCookie.length + 1));
  if (token) {
    const expires = Number(token[1]);
    if (expires > now && expires <= deadline &&
        await crypto.subtle.verify('HMAC', await signingKey(digest),
          Uint8Array.from(token[2].match(/../g), pair => parseInt(pair, 16)), signatureInput(binding, expires))) {
      return {};
    }
  }
  if (await authorizeAccess(request, digest)) return { refusal: accessError(401, head, document) };
  if (!document || request.method !== 'GET') return {};
  const expires = Math.min(deadline, now + 4 * 3600);
  const signed = await crypto.subtle.sign('HMAC', await signingKey(digest), signatureInput(binding, expires));
  const hex = Array.from(new Uint8Array(signed), b => b.toString(16).padStart(2, '0')).join('');
  return { cookie: visitorCookie + '=' + expires + '.' + hex +
    '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=' + (expires - now) };
}

export function privateResponse(response) {
  const headers = privateHeaders(response.headers);
  const vary = headers.get('Vary');
  if (vary !== '*') {
    const names = (vary ?? '').split(',').map(name => name.trim().toLowerCase());
    const missing = ['Authorization', 'Cookie'].filter(name => !names.includes(name.toLowerCase()));
    if (missing.length) headers.set('Vary', [vary, ...missing].filter(Boolean).join(', '));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
