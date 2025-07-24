import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.geeksforgeeks.org" },
      { protocol: "https", hostname: "simpleprogrammer.com" },
      { protocol: "https", hostname: "marketplace.canva.com" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Serve static files from the /public/upload directory
  // This is the default behavior, but you can add a rewrite for clarity or custom routes
  async rewrites() {
    return [
      {
        source: "/upload/:path*",
        destination: "/upload/:path*",
      },
    ];
  },
};

export default nextConfig;