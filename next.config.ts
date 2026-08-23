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
  // Ensure the bundled TTF fonts are traced into the PDF export function.
  outputFileTracingIncludes: {
    "/api/export/pdf": ["./src/lib/export/fonts/**/*"],
  },
};

export default nextConfig;
