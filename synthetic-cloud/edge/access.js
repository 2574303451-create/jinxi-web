import { createAccessEdge } from '../../edge-access.mjs';

const binding = null; // JINXI_EDGE_BINDING
const assets = null; // JINXI_EDGE_ASSETS
const policy = null; // JINXI_EDGE_CSP

export const config = { path: '/*', onError: 'fail' };
export default createAccessEdge(binding, assets, policy);
