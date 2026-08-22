import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // pdfmake (+ pdfkit/fontkit) must stay external so the server bundle keeps
  // their internal font/asset resolution working inside the serverless route.
  serverExternalPackages: ["pdfmake"],
};

export default nextConfig;
