import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.irisboom.online';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/*',
        '/dashboard',
        '/dashboard/*',
        '/projects',
        '/projects/*',
        '/redaction',
        '/redaction/*',
        '/cover-studio',
        '/cover-studio/*',
        '/analytics',
        '/analytics/*',
        '/automations',
        '/automations/*',
        '/settings',
        '/settings/*',
        '/billing',
        '/billing/*',
        '/profile',
        '/profile/*',
        '/guide',
        '/guide/*',
        '/export',
        '/export/*',
        '/api',
        '/api/*',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
