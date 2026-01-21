import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
  },
});

const nextConfig: NextConfig = {
  // Turbopack is now the default in Next.js 16
  // Allow webpack plugins (like next-pwa) while using Turbopack for dev
  turbopack: {},
  
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

export default withPWA(nextConfig);
