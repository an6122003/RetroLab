import { getPosts } from "@/lib/notion";
import type { Metadata } from "next";
import * as Layouts from "./layouts";
import CategorySchema from "@/components/seo/CategorySchema";

export const revalidate = 3600;

const CATEGORY_MAP: Record<string, string> = {
  'tin-tuc': 'Tin tức',
  'ai': 'AI',
  'cong-nghe': 'Công Nghệ',
  'it': 'Công Nghệ Thông Tin',
  'game-gia-lap': 'Game & Giả Lập',
  'chua-phan-loai': 'Chưa phân loại',
};

function getCategoryName(slug: string): string {
  return CATEGORY_MAP[slug] || slug;
}

const SITE_URL = 'https://retrolab.com.vn';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'tin-tuc': 'Tin tức công nghệ mới nhất, cập nhật nhanh chóng từ nhiều nguồn uy tín. Đọc ngay trên RetroLab.',
  'ai': 'Tin tức và phân tích chuyên sâu về Trí Tuệ Nhân Tạo (AI), Machine Learning, LLM, và ứng dụng AI trong đời sống.',
  'cong-nghe': 'Đánh giá smartphone, laptop, gadgets và xu hướng công nghệ nổi bật nhất. Cập nhật liên tục trên RetroLab.',
  'it': 'Tin tức IT, lập trình, DevOps, cloud computing, cybersecurity và các công nghệ doanh nghiệp.',
  'game-gia-lap': 'Tin tức gaming, đánh giá game, giả lập retro, emulator và văn hóa gaming tại Việt Nam.',
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const categoryName = getCategoryName(resolvedParams.slug);
  const description = CATEGORY_DESCRIPTIONS[resolvedParams.slug]
    || `Tất cả bài viết trong chuyên mục ${categoryName} trên RetroLab.`;
  const url = `${SITE_URL}/category/${resolvedParams.slug}`;

  return {
    title: `${categoryName} - Tin tức & Bài viết`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: `${categoryName} - RetroLab`,
      description,
      url,
      siteName: 'RetroLab',
      locale: 'vi_VN',
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `${categoryName} - RetroLab`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${categoryName} - RetroLab`,
      description,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const categoryName = getCategoryName(slug);
  const description = CATEGORY_DESCRIPTIONS[slug]
    || `Tất cả bài viết trong chuyên mục ${categoryName} trên RetroLab.`;
  
  const allPosts = await getPosts();
  let categoryPosts: typeof allPosts;

  // Filter by both Category and Tags (case-insensitive) — pass if either matches
  const matchName = categoryName.toLowerCase();
  categoryPosts = allPosts.filter(p => {
    const catMatch = p.category.toLowerCase() === matchName;
    const tagMatch = p.tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .includes(matchName);
    return catMatch || tagMatch;
  });

  // Fallback: show 10 latest posts if no matches found
  if (categoryPosts.length === 0) {
    categoryPosts = allPosts.slice(0, 10);
  }

  // Inject structured data for all category layouts
  const schemaElement = (
    <CategorySchema
      categoryName={categoryName}
      categorySlug={slug}
      description={description}
      articleCount={categoryPosts.length}
    />
  );

  if (slug === 'ai') {
    return <>{schemaElement}<Layouts.AILayout categoryName={categoryName} slug={slug} posts={categoryPosts} /></>;
  }

  if (slug === 'tin-tuc') {
    return <>{schemaElement}<Layouts.NewsLayout categoryName={categoryName} slug={slug} posts={categoryPosts} /></>;
  }

  if (slug === 'cong-nghe') {
    return <>{schemaElement}<Layouts.MagazineLayout categoryName={categoryName} slug={slug} posts={categoryPosts} /></>;
  }

  if (slug === 'game-gia-lap') {
    return <>{schemaElement}<Layouts.AlternateLayout categoryName={categoryName} slug={slug} posts={categoryPosts} /></>;
  }

  if (slug === 'it') {
    return <>{schemaElement}<Layouts.ITLayout categoryName={categoryName} slug={slug} posts={categoryPosts} /></>;
  }

  // Default layout
  return <>{schemaElement}<Layouts.DefaultCategoryLayout categoryName={categoryName} slug={slug} posts={categoryPosts} /></>;
}
