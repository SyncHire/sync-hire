import type { NextConfig } from "next";
import { execFileSync } from "child_process";

// Get git commit SHA at build time (safe - no user input)
const getCommitSha = (): string => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
  } catch {
    return "dev";
  }
};

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',

  // Inject build info as public env vars
  env: {
    NEXT_PUBLIC_COMMIT_SHA: getCommitSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },

  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
