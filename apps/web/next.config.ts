import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@job-tracker/shared"],
  reactStrictMode: true,
};

export default nextConfig;
