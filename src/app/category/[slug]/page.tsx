import { getPosts } from "@/lib/notion";
import type { Metadata } from "next";
import * as Layouts from "./layouts";

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

  if (slug === 'ai') {
    return <Layouts.AILayout categoryName={categoryName} slug={slug} posts={categoryPosts} />;
  }

  if (slug === 'tin-tuc') {
    return <Layouts.NewsLayout categoryName={categoryName} slug={slug} posts={categoryPosts} />;
  }

  if (slug === 'cong-nghe') {
    return <Layouts.MagazineLayout categoryName={categoryName} slug={slug} posts={categoryPosts} />;
  }

  if (slug === 'game-gia-lap') {
    return <Layouts.AlternateLayout categoryName={categoryName} slug={slug} posts={categoryPosts} />;
  }

  if (slug === 'it') {
    return <Layouts.ITLayout categoryName={categoryName} slug={slug} posts={categoryPosts} />;
  }

  // Default layout
  return <Layouts.DefaultCategoryLayout categoryName={categoryName} slug={slug} posts={categoryPosts} />;
}
