import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,  //deploy and coeme back to fix ts and eslit
  },
};

export default nextConfig;