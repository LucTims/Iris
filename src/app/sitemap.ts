import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.irisboom.online';
  const lastMod = new Date('2026-10-15');

  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  }> = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/features', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/how-it-works', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/presentation', priority: 0.85, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/faq', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/docs', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/docs/automations', priority: 0.75, changeFrequency: 'weekly' },
    { path: '/docs/api-keys', priority: 0.75, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'monthly' },
  ];

  return routes.map((item) => ({
    url: `${baseUrl}${item.path}`,
    lastModified: lastMod,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));
}
