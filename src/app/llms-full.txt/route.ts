/**
 * Dynamic llms-full.txt
 * 
 * Extended version of llms.txt that includes a full article index.
 * AI crawlers (GPTBot, ClaudeBot, PerplexityBot) use this as a
 * machine-readable content directory to understand what the site covers.
 * 
 * Referenced from the static llms.txt via a link.
 * Auto-updates as new articles are published.
 */

import { getPosts } from '@/lib/notion';

const SITE_URL = 'https://retrolab.com.vn';

export const revalidate = 3600; // Regenerate hourly

export async function GET() {
  const posts = await getPosts();

  // Group articles by category
  const byCategory = new Map<string, typeof posts>();
  for (const post of posts) {
    const cat = post.category || 'Chưa phân loại';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(post);
  }

  const lines: string[] = [
    '# RetroLab - Full Article Index',
    '',
    '> This is the extended content directory for RetroLab (https://retrolab.com.vn).',
    '> Vietnamese-language technology magazine covering AI, IT, consumer tech, and gaming.',
    '',
    `## Stats`,
    '',
    `- Total articles: ${posts.length}`,
    `- Categories: ${byCategory.size}`,
    `- Last updated: ${new Date().toISOString()}`,
    '',
  ];

  // Output articles grouped by category
  Array.from(byCategory.entries()).forEach(([category, catPosts]) => {
    lines.push(`## ${category}`);
    lines.push('');
    catPosts.slice(0, 50).forEach((post) => { // Cap at 50 per category
      const date = post.date ? new Date(post.date).toISOString().split('T')[0] : 'unknown';
      lines.push(`- [${post.title}](${SITE_URL}/article/${post.slug}) (${date})`);
      if (post.excerpt) {
        const shortExcerpt = post.excerpt.length > 150
          ? post.excerpt.substring(0, 147) + '...'
          : post.excerpt;
        lines.push(`  ${shortExcerpt}`);
      }
    });
    lines.push('');
  });

  lines.push('## Links');
  lines.push('');
  lines.push(`- RSS Feed: ${SITE_URL}/feed.xml`);
  lines.push(`- Sitemap: ${SITE_URL}/sitemap.xml`);
  lines.push(`- Contact: contact@retrolab.com.vn`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
    },
  });
}
