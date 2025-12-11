import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set the workspace root to avoid lockfile detection warnings locally
  // On Vercel, this won't be needed but it's harmless
  // Only set if we detect a parent lockfile (local development scenario)
  ...(process.env.VERCEL
    ? {}
    : {
        outputFileTracingRoot: path.resolve(process.cwd()),
      }),
};

export default nextConfig;
