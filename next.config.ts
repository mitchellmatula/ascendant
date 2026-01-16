import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is now the default in Next.js 16
  // cacheComponents: true, // Enable when ready - see next16.md for migration notes
  
  // Allow ngrok domain for development
  allowedDevOrigins: ["https://proven-fine-baboon.ngrok-free.app"],
  
  // Allow larger file uploads (250MB for videos)
  experimental: {
    serverActions: {
      bodySizeLimit: "300mb",
    },
    proxyClientMaxBodySize: "300mb",
  },
  
  // Disable aggressive caching in development
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      // Video thumbnail sources
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "i.vimeocdn.com",
      },
    ],
  },
};

export default nextConfig;
