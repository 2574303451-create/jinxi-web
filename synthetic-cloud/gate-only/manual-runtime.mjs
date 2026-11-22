import { accessError, authorizeAccess, accessDigestKey, privateHeaders } from '../access.mjs';
const logRefusal = event => console.warn('JINXI_GATE_REFUSAL',JSON.stringify(event));
export function manualProbe(sha, deadline, read = key => globalThis.Netlify.env.get(key), report = logRefusal) {
  return async (request, ctx) => {
    const head = request.method === 'HEAD';
    let stage='request';
    const refuse=(reason,checks={})=>{
      // Server logs contain fixed labels and booleans, never binding values,
      // request headers, environment contents or exception messages.
      try { report({version:1,reason,stage,checks}); } catch { /* Logging must not change refusal. */ }
      return accessError(503,head);
    };
    try {
      const origin = 'https://jinxi-synthetic-gate-test.netlify.app';
      const url = new URL(request.url);
      stage='expiry-read';
      const expires = Date.parse(read('JINXI_GATE_EXPIRES_AT'));
      stage='context';
      const contextChecks={
        account:ctx?.account?.id==='689e1405e8627000726e883c',
        site:ctx?.site?.id==='e8033919-6f54-4a27-b09d-26c14d8831ce',
        siteOrigin:ctx?.site?.url===origin,requestOrigin:url.origin===origin,
        deployContext:ctx?.deploy?.context==='production',published:ctx?.deploy?.published===true,
        deployId:typeof ctx?.deploy?.id==='string'&&/^[0-9a-f]{24}$/.test(ctx.deploy.id),
      };
      if(!Object.values(contextChecks).every(Boolean))return refuse('context',contextChecks);
      stage='approval-read';
      if(read('JINXI_SERVICE_APPROVAL')!==sha)return refuse('approval',{matches:false});
      stage='expiry';
      const expiryChecks={valid:Number.isFinite(expires),future:Date.now()<expires,withinDeadline:expires<=deadline};
      if(!Object.values(expiryChecks).every(Boolean))return refuse('expiry',expiryChecks);
      stage='digest-read';
      const digest=read(accessDigestKey);
      stage='credential-check';
      const denied = await authorizeAccess(request,digest);
      if(denied?.status===503)return refuse('access-config',{digestValid:typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest)});
      if (denied) return denied;
      if (url.pathname !== '/') return accessError(404, head);
      if (!head && request.method !== 'GET') return accessError(405);
      return new Response(head ? null : 'Synthetic access check OK', {headers: privateHeaders({
        'Content-Type':'text/plain; charset=utf-8', 'X-Jinxi-Revision':sha, 'X-Jinxi-Deploy':ctx.deploy.id,
      }, 'Authorization')});
    } catch { return refuse('exception'); }
  };
}

