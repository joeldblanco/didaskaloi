import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      // Cache page navigations (documents)
      urlPattern: /^https?.*\/$/,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-cache",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 3, // Fall back to cache after 3 seconds
      },
    },
    {
      // Cache API routes and server actions with CacheFirst strategy
      urlPattern: /^https?.*\/_next\/data\/.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "next-data-cache",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 3, // Fall back to cache after 3 seconds
      },
    },
    {
      // Cache static resources (JS, CSS, fonts, images)
      urlPattern: /^https?.*\/_next\/static\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-cache",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Cache images
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Catch-all for other requests
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "general-cache",
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 3, // Fall back to cache after 3 seconds
      },
    },
  ],
});

export default pwaConfig(nextConfig);
