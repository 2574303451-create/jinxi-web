import { accessError, authorizeAccess, accessDigestKey, privateHeaders } from '../access.mjs';
export function manualProbe(sha, deadline, read = key => globalThis.Netlify.env.get(key)) {
  return async (request, ctx) => {
    const head = request.method === 'HEAD';
    try {
      const origin = 'https://jinxi-synthetic-gate-test.netlify.app';
      const url = new URL(request.url);
      const expires = Date.parse(read('JINXI_GATE_EXPIRES_AT'));
      if (ctx.account?.id !== '689e1405e8627000726e883c' ||
          ctx.site?.id !== 'e8033919-6f54-4a27-b09d-26c14d8831ce' || ctx.site.url !== origin ||
          url.origin !== origin || ctx.deploy?.context !== 'production' || ctx.deploy.published !== true ||
          typeof ctx.deploy.id !== 'string' || !/^[0-9a-f]{24}$/.test(ctx.deploy.id) ||
          read('JINXI_SERVICE_APPROVAL') !== sha || !Number.isFinite(expires) ||
          !(Date.now() < expires && expires <= deadline)) return accessError(503, head);
      const denied = await authorizeAccess(request, read(accessDigestKey));
      if (denied) return denied;
      if (url.pathname !== '/') return accessError(404, head);
      if (!head && request.method !== 'GET') return accessError(405);
      return new Response(head ? null : 'Synthetic access check OK', {headers: privateHeaders({
        'Content-Type':'text/plain; charset=utf-8', 'X-Jinxi-Revision':sha, 'X-Jinxi-Deploy':ctx.deploy.id,
      }, 'Authorization')});
    } catch { return accessError(503, head); }
  };
}

