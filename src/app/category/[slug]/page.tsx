import { getPosts } from "@/lib/notion";
import type { Metadata } from "next";
import * as Layouts from "./layouts";

export const revalidate = 3600;

const CATEGORY_MAP: Record<string, string> = {
  'tin-tuc': 'Tin tức',
  'ai': 'AI',
  'danh-gia': 'Đánh giá',
  'goc-nhin': 'Góc nhìn',
  'tips-tricks': 'Tips & Tricks',
  'chua-phan-loai': 'Chưa phân loại',
  'xem-xong-mua': 'Xem xong mua',
  'vat-vo-danh-gia': 'Vật vờ đánh giá',
};

function getCategoryName(slug: string): string {
  return CATEGORY_MAP[slug] || slug;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const categoryName = getCategoryName(resolvedParams.slug);
  return {
    title: `${categoryName} - RetroLab`,
    description: `Tất cả bài viết trong chuyên mục ${categoryName} trên RetroLab.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const categoryName = getCategoryName(slug);
  
  const allPosts = await getPosts();
  let categoryPosts = allPosts.filter(
    p => p.category.toLowerCase() === categoryName.toLowerCase()
  );

  // If no posts in specific category, show all posts as fallback to demonstrate layout
  if (categoryPosts.length === 0) {
    categoryPosts = allPosts.slice(0, 10);
  }

  // Determine which layout to use based on the slug
  if (slug === 'ai' || slug === 'tin-tuc') {
    return <Layouts.NewsLayout categoryName={categoryName} posts={categoryPosts} />;
  }

  if (slug === 'danh-gia' || slug === 'vat-vo-danh-gia') {
    return <Layouts.MagazineLayout categoryName={categoryName} posts={categoryPosts} />;
  }

  if (slug === 'tips-tricks') {
    return <Layouts.AlternateLayout categoryName={categoryName} posts={categoryPosts} />;
  }

  // Default layout (includes Goc Nhin style)
  return <Layouts.DefaultCategoryLayout categoryName={categoryName} posts={categoryPosts} />;
}
