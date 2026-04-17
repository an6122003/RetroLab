import type { MetadataRoute } from 'next';

const SITE_URL = 'https://retrolab.com.vn';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Standard web crawlers — full access
        userAgent: '*',
        allow: '/',
        disallow: ['/auth/', '/profile/', '/api/', '/admin/'],
      },
      {
        // Google AI (Gemini, AI Overviews) — allow full crawl for AEO
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/auth/', '/profile/', '/api/', '/admin/'],
      },
      {
        // ChatGPT / OpenAI crawler — allow so articles appear in ChatGPT search
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/auth/', '/profile/', '/api/', '/admin/'],
      },
      {
        // ChatGPT user-agent — allow for real-time browsing
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: ['/auth/', '/profile/', '/api/', '/admin/'],
      },
      {
        // Perplexity AI crawler
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/auth/', '/profile/', '/api/', '/admin/'],
      },
      {
        // Anthropic Claude crawler
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/auth/', '/profile/', '/api/', '/admin/'],
      },
      {
        // Common Chat AI (Cohere, etc.)
        userAgent: 'cohere-ai',
        allow: '/',
        disallow: ['/auth/', '/profile/', '/api/', '/admin/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
