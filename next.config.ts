import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // pdfmake (+ pdfkit/fontkit) must stay external so its internal font/asset
  // resolution keeps working inside the serverless PDF route.
  serverExternalPackages: ["pdfmake"],
};

export default nextConfig;
