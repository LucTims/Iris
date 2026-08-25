import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize barrel imports for tree-shaking (reduces bundle size significantly)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@tiptap/react',
      '@tiptap/starter-kit',
      'react-markdown',
    ],
  },
  // Allow next/image optimization for external domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
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
