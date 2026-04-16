/**
 * AEO (Answer Engine Optimization) Article Schema
 * 
 * Injects structured JSON-LD data into the page for:
 * - NewsArticle schema (for Google News, Discover)
 * - FAQPage schema (for Google AI Overviews, Perplexity, ChatGPT)
 * - BreadcrumbList (for rich SERP breadcrumbs)
 * 
 * The FAQ schema is the key AEO differentiator — AI search engines
 * (Perplexity, ChatGPT, Google AI Overviews) extract FAQ answers as
 * direct citations, dramatically increasing visibility.
 */

const SITE_URL = 'https://retrolab.com.vn';

export interface FAQItem {
  question: string;
  answer: string;
}

interface AEOArticleSchemaProps {
  title: string;
  description: string;
  author: string;
  publishedDate: string;
  modifiedDate?: string;
  coverImage: string;
  articleUrl: string;
  category: string;
  tags?: string;
  faqItems?: FAQItem[];
  wordCount?: number;
}

export default function AEOArticleSchema({
  title,
  description,
  author,
  publishedDate,
  modifiedDate,
  coverImage,
  articleUrl,
  category,
  tags,
  faqItems,
  wordCount,
}: AEOArticleSchemaProps) {
  // Build the main @graph array
  const graph: Record<string, any>[] = [
    // 1. NewsArticle — core article schema
    {
      '@type': 'NewsArticle',
      '@id': articleUrl,
      headline: title,
      description: description,
      image: {
        '@type': 'ImageObject',
        url: coverImage,
        width: 1200,
        height: 630,
      },
      datePublished: publishedDate,
      dateModified: modifiedDate || publishedDate,
      author: {
        '@type': 'Person',
        name: author,
      },
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': articleUrl,
      },
      articleSection: category,
      keywords: tags || undefined,
      inLanguage: 'vi',
      isAccessibleForFree: true,
      ...(wordCount ? { wordCount } : {}),
    },

    // 2. BreadcrumbList — rich breadcrumbs in SERP
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Trang chủ',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: category,
          item: `${SITE_URL}/category/${category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '')}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: title,
          item: articleUrl,
        },
      ],
    },
  ];

  // 3. FAQPage — THE AEO WEAPON
  // AI search engines (Perplexity, ChatGPT, Google AI Overviews) extract
  // FAQ answers as direct citations. This is the #1 way to appear in AI answers.
  if (faqItems && faqItems.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqItems.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
