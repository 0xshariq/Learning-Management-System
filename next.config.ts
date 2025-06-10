import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.geeksforgeeks.org" },
      { protocol: "https", hostname: "simpleprogrammer.com" },
      { protocol: "https", hostname: "marketplace.canva.com" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};
  
  export default nextConfig;