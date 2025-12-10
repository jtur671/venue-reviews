import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set the workspace root to avoid lockfile detection warnings
  // This tells Next.js to use the current directory as the root, ignoring parent lockfiles
  outputFileTracingRoot: path.resolve(__dirname || process.cwd()),
};

export default nextConfig;
