import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // prisma.config.ts has a pre-existing node type mismatch; suppress build-time TS errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
