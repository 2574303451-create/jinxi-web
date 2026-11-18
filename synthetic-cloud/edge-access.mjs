import { accessDigestKey, accessError, authorizeAccess, privateHeaders, privateResponse } from './access.mjs';

export function matchesDeploy(binding, context, origin, readEnv) {
  return binding && Date.parse(binding.expiresAt) > Date.now() &&
    context?.deploy?.context === 'production' && context.deploy.published === true &&
    [
      [binding.origin, origin], [binding.origin, context.site?.url],
      [binding.commit, readEnv('JINXI_SERVICE_APPROVAL')], [binding.teamId, context.account?.id],
      [binding.siteId, context.site?.id], [binding.deployId, context.deploy.id],
    ].every(([expected, actual]) => typeof expected === 'string' && expected.length && expected === actual);
}

function serveAsset(file, request, policy) {
  const headers = privateHeaders({
    'Content-Type': file.type,
    'Content-Security-Policy': policy,
    'Strict-Transport-Security': 'max-age=31536000',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  }, 'Authorization');
  const bytes = Uint8Array.from(atob(file.bytes), character => character.charCodeAt(0));
  const head = request.method === 'HEAD';
  if (file.type === 'video/mp4') {
    headers.set('Accept-Ranges', 'bytes');
    const range = request.headers.get('range');
    if (range && !head) {
      const match = /^bytes=(\d{0,15})-(\d{0,15})$/.exec(range);
      const start = match?.[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match?.[2]));
      const end = !match?.[1] || !match?.[2] ? bytes.length - 1 : Math.min(Number(match[2]), bytes.length - 1);
      if (!match || (!match[1] && !match[2]) || start >= bytes.length || end < start) {
        headers.set('Content-Range', 'bytes */' + bytes.length);
        return new Response(null, { status: 416, headers });
      }
      headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + bytes.length);
      return new Response(bytes.subarray(start, end + 1), { status: 206, headers });
    }
  }
  headers.set('Content-Length', String(bytes.length));
  return new Response(head ? null : bytes, { headers });
}

export function createAccessEdge(binding, assets, policy, readEnv = key => globalThis.Netlify.env.get(key)) {
  return async function protect(request, context) {
    const head = request.method === 'HEAD';
    try {
      const url = new URL(request.url);
      if (!matchesDeploy(binding, context, url.origin, readEnv) || !assets || !policy) return accessError(503, head);
      const refusal = await authorizeAccess(request, readEnv(accessDigestKey));
      if (refusal) return refusal;

      const pathname = url.pathname;
      if (pathname.startsWith('/api/') || pathname.startsWith('/.netlify/functions/')) {
        return privateResponse(await context.next(request));
      }
      if (request.method !== 'GET' && !head) return accessError(405, head);
      const path = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
      if (Object.hasOwn(assets, path)) return serveAsset(assets[path], request, policy);
      if (!pathname.endsWith('/') && Object.hasOwn(assets, pathname + '/index.html')) {
        return new Response(null, { status: 308, headers: privateHeaders({ Location: pathname + '/' }, 'Authorization') });
      }
      return accessError(404, head);
    } catch {
      return accessError(503, head);
    }
  };
}
