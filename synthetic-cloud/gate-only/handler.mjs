import { matchesDeploy } from '../edge-access.mjs';
import { accessDigestKey, accessError, authorizeAccess, privateHeaders } from '../access.mjs';

export function gateProbe(binding, readEnv = key => globalThis.Netlify.env.get(key)) {
  return async (request, context) => {
    const head = request.method === 'HEAD';
    try {
      const url = new URL(request.url);
      if (!matchesDeploy(binding, context, url.origin, readEnv)) return accessError(503, head);
      const denied = await authorizeAccess(request, readEnv(accessDigestKey));
      if (denied) return denied;
      if (url.pathname !== '/') return accessError(404, head);
      if (!head && request.method !== 'GET') return accessError(405);
      return new Response(head ? null : 'Synthetic access check OK', {
        headers: privateHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }, 'Authorization'),
      });
    } catch {
      return accessError(503, head);
    }
  };
}
