/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    // Optimize package imports for better performance
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'zustand',
      'matrix-js-sdk'
    ],
    // Enable server actions if needed in future
    serverActions: true,
  },

  // Image optimization
  images: {
    domains: [
      'localhost',
      'matrix.org',
      // Add your production domains here
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_MATRIX_HOMESERVER: process.env.NEXT_PUBLIC_MATRIX_HOMESERVER,
    NEXT_PUBLIC_MATRIX_SERVER_NAME: process.env.NEXT_PUBLIC_MATRIX_SERVER_NAME,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle WebSocket and Matrix SDK in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: require.resolve('buffer'),
      }
    }

    // Handle file uploads
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './src'),
    }

    return config
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()'
          }
        ]
      },
      {
        // CORS headers for API routes
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ]
  },

  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/chat',
        destination: '/',
        permanent: false,
      }
    ]
  },

  // Custom rewrites for API
  async rewrites() {
    return [
      {
        source: '/ws',
        destination: '/api/ws',
      },
      {
        source: '/health',
        destination: '/api/health',
      }
    ]
  },

  // Optimize build output
  output: 'standalone',
  
  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Static file serving
  trailingSlash: false,
  
  // Enable SWC minification
  swcMinify: true,

  // PoweredBy header
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Custom page extensions
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Development configuration
  ...(process.env.NODE_ENV === 'development' && {
    eslint: {
      ignoreDuringBuilds: false,
    },
    typescript: {
      ignoreBuildErrors: false,
    },
  }),

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: false,
    },
    // Enable static optimization
    generateEtags: true,
    // Bundle analyzer (uncomment to analyze bundle)
    // bundleAnalyzer: {
    //   enabled: process.env.ANALYZE === 'true',
    // },
  }),
}

module.exports = nextConfig