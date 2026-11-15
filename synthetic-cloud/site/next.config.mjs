import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.NODE_ENV !== 'production' || process.env.JINXI_SYNTHETIC_EXPORT !== '1') {
  throw Error('SYNTHETIC_STATIC_EXPORT_REQUIRED');
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export default {
  trailingSlash: true,
  output: 'export',
  distDir: 'out',
  images: { unoptimized: true },
  webpack(config, { isServer }) {
    config.resolve.alias['@'] = root;
    if (!isServer) config.devtool = false;
    return config;
  },
};
