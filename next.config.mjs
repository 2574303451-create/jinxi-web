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
    unoptimized: false, // 启用图片优化以减少内存占用
    domains: [],
    formats: ['image/webp', 'image/avif'],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    minimumCacheTTL: 31536000, // 1年缓存
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
      
      // 启用更严格的代码压缩和内存优化
      config.optimization = {
        ...config.optimization,
        minimize: true,
        usedExports: true,
        sideEffects: false,
        // 分割代码以减少内存占用
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            images: {
              test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
              name: 'images',
              chunks: 'all',
            },
          },
        },
      };
    }
    
    // 内存优化配置
    config.performance = {
      maxAssetSize: 512000, // 512KB
      maxEntrypointSize: 512000,
      hints: 'warning',
    };
    
    return config;
  },
}

export default nextConfig
