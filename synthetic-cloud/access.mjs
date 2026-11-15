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

export function accessError(status, head = false) {
  const headers = privateHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }, 'Authorization');
  if (status === 401) headers.set('WWW-Authenticate', 'Basic realm="JINXI synthetic TEST", charset="UTF-8"');
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

export function privateResponse(response) {
  const headers = privateHeaders(response.headers);
  const vary = headers.get('Vary');
  if (vary !== '*' && !vary?.split(',').some(name => name.trim().toLowerCase() === 'authorization')) {
    headers.set('Vary', vary ? vary + ', Authorization' : 'Authorization');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
