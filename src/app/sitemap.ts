import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.irisboom.online';

  const routes = [
    '',
    '/about',
    '/contact',
    '/faq',
    '/features',
    '/how-it-works',
    '/pricing',
    '/blog',
    '/docs'
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))
}
