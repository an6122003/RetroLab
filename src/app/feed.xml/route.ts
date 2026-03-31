import { getPosts } from '@/lib/notion';

const SITE_URL = 'https://retrolab.com.vn';

export async function GET() {
  const posts = await getPosts();

  const rssItems = posts.slice(0, 50).map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE_URL}/article/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/article/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <category>${post.category}</category>
      <author>RetroLab</author>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <enclosure url="${post.coverImage}" type="image/jpeg" />
    </item>`).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>RetroLab - Tạp chí Công nghệ</title>
    <link>${SITE_URL}</link>
    <description>Bắt trọn mọi chuyển động của thế giới số. Tin tức tổng hợp đa nguồn về Công Nghệ, AI, Game và Giả Lập.</description>
    <language>vi</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/logo.svg</url>
      <title>RetroLab</title>
      <link>${SITE_URL}</link>
    </image>
    ${rssItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
