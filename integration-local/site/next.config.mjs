import path from 'node:path';
import { fileURLToPath } from 'node:url';
// This project has no export/build command. It is started by the guarded local runner.
if (process.env.NODE_ENV !== 'development' || process.env.JINXI_INTEGRATION_RENDERER !== 'local-synthetic-v1') throw Error('LOCAL_DEV_RENDERER_ONLY');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export default {
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ['127.0.0.1'],
  webpack(config) { config.resolve.alias['@'] = root; return config; },
};
