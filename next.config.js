/** @type {import('next').NextConfig} */

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure ESM packages like Excalidraw are transpiled for production builds
  transpilePackages: ['@excalidraw/excalidraw'],
  // Add empty turbopack config to silence the error
  turbopack: {},
  // Allow Excalidraw assets, Supabase storage, and inline data to work in production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://js.stripe.com https://connect-js.stripe.com https://*.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com https://unpkg.com",
              "img-src 'self' blob: data: https://*.supabase.co https://unpkg.com https://*.stripe.com",
              "connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co wss://*.livekit.cloud https://*.livekit.cloud https://unpkg.com https://api.stripe.com https://connect-js.stripe.com https://*.stripe.com https://*.stripe.network",
              "worker-src 'self' blob:",
              "frame-src 'self' blob: https://*.supabase.co https://js.stripe.com https://connect-js.stripe.com https://*.stripe.com https://*.stripe.network",
              "media-src 'self' blob: https://*.supabase.co",
            ].join('; '),
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        {
          module: /@supabase\/realtime-js\/dist\/module\/lib\/websocket-factory\.js/,
        },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;