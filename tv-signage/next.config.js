/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurar orígenes permitidos para desarrollo
  allowedDevOrigins: [
    '192.168.101.3',
    '192.168.*.*',
    '172.16.*.*',
    'localhost',
    '127.0.0.1'
  ],
  
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken'],
  images: {
    // Configuración para máxima calidad de imágenes 4K/2K
    unoptimized: true, // Desactivar optimización automática para mantener calidad original
    formats: ['image/webp', 'image/avif'], // Formatos de alta calidad
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Incluir resoluciones hasta 4K
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 1024, 2048, 4096], // Tamaños hasta 4K
    minimumCacheTTL: 60, // Cache mínimo
    dangerouslyAllowSVG: true, // Permitir SVG de alta calidad
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '172.16.31.17',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '172.16.1.43',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.101.3',
        port: '3000',
        pathname: '/uploads/**',
      },
      // Permitir cualquier IP de la red local
      {
        protocol: 'http',
        hostname: '172.16.*.*',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.*.*',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
  },
  // Configuración para mejorar compatibilidad con autoplay y HLS
  async headers() {
    return [
      {
        source: '/screen/:path*',
        headers: [
          {
            key: 'Feature-Policy',
            value: 'autoplay *',
          },
          {
            key: 'Permissions-Policy',
            value: 'autoplay=*',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Accept-Ranges',
            value: 'bytes',
          },
          {
            key: 'Content-Disposition',
            value: 'inline',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, HEAD, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Range, Content-Type',
          },
        ],
      },
      {
        source: '/thumbnails/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Disposition',
            value: 'inline',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/api/hls/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Range',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/hls/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000',
          },
        ],
      },
    ];
  },
  // Configuración experimental para manejar archivos grandes
  experimental: {
    largePageDataBytes: 128 * 1024, // 128KB
    isrMemoryCacheSize: 0, // Desactivar cache en memoria para archivos grandes
  },
  
  // Configuración para archivos grandes
  serverRuntimeConfig: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        {
          module: /node_modules\/@ffmpeg-installer\/ffmpeg/,
          message: /Critical dependency: the request of a dependency is an expression/,
        },
      ];
    }
    return config;
  },
}

module.exports = nextConfig
