import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Keep the headless-browser packages external so their native binaries and
  // asset resolution keep working inside the serverless PDF route.
  serverExternalPackages: ["puppeteer-core", "puppeteer", "@sparticuz/chromium"],
};

export default nextConfig;
