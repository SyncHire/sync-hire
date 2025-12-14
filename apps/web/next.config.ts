import {withSentryConfig} from "@sentry/nextjs";
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
  transpilePackages: ["@sync-hire/database"],
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    // Sentry/OpenTelemetry instrumentation packages (fix Turbopack + pnpm resolution)
    "import-in-the-middle",
    "require-in-the-middle",
  ],

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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "sync-hire",

  project: "web",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Webpack-specific Sentry options
  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  },
});