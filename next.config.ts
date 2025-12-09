import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack configuration for stable file watching
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        // Use polling for more reliable file watching on Linux
        poll: 1000,
        // Aggregate changes for 300ms before rebuilding
        aggregateTimeout: 300,
        // Ignore node_modules to reduce watcher load
        ignored: ["**/node_modules/**", "**/.git/**"],
      };
    }
    return config;
  },

  // Turbopack configuration
  turbopack: {
    root: process.cwd(),
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Generate build ID based on timestamp for consistent builds
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
