/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  images: {
    unoptimized: true,
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  trailingSlash: true,
  output: 'export',
  distDir: 'out',
  assetPrefix: '',
  
  // 配置webpack（简化版）
  webpack: (config, { isServer, webpack }) => {
    // 仅在生产环境启用基础代码保护
    if (!isServer && process.env.NODE_ENV === 'production') {
      // 移除source maps以增加逆向难度
      config.devtool = false;
      
      // 启用更严格的代码压缩
      config.optimization = {
        ...config.optimization,
        minimize: true,
        usedExports: true,
        sideEffects: false,
      };
    }
    
    return config;
  },
}

export default nextConfig
