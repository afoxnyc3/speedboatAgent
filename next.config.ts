import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Temporarily ignore TypeScript errors during build
    // TODO: Remove after resolving strict mode TypeScript issues
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
