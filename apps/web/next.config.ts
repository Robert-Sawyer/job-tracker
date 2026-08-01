import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@job-tracker/shared"],
  reactStrictMode: true,
  turbopack: {
    // The shared workspace package lives outside apps/web.
    root: workspaceRoot,
  },
};

export default nextConfig;
