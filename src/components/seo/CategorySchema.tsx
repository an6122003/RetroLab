/**
 * Category Page Structured Data (JSON-LD)
 * 
 * Injects CollectionPage + BreadcrumbList schema for category pages.
 * This helps Google understand the site hierarchy and display
 * breadcrumbs in search results for category URLs.
 */

const SITE_URL = 'https://retrolab.com.vn';

interface CategorySchemaProps {
  categoryName: string;
  categorySlug: string;
  description: string;
  articleCount: number;
}

export default function CategorySchema({
  categoryName,
  categorySlug,
  description,
  articleCount,
}: CategorySchemaProps) {
  const categoryUrl = `${SITE_URL}/category/${categorySlug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': categoryUrl,
        name: `${categoryName} - RetroLab`,
        description: description,
        url: categoryUrl,
        isPartOf: {
          '@id': `${SITE_URL}/#website`,
        },
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
        inLanguage: 'vi',
        numberOfItems: articleCount,
      },
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
            name: categoryName,
            item: categoryUrl,
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
