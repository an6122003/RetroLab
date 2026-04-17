import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import BottomNavigation from "@/components/ui/BottomNavigation";
import NavigationProgress from "@/components/ui/NavigationProgress";
import { AuthProvider } from "@/components/auth/AuthProvider";

const SITE_URL = "https://retrolab.com.vn";
const SITE_NAME = "RetroLab";
const DESCRIPTION =
  "Bắt trọn mọi chuyển động của thế giới số tại RetroLab. Trạm tin tức tổng hợp đa nguồn về Công Nghệ, AI cho đến thế giới Game và Giả Lập.";

export const metadata: Metadata = {
  // ── Core ──
  title: {
    default: "RetroLab - Tạp chí Công nghệ | Tin tức AI, IT, Game",
    template: "%s | RetroLab",
  },
  description: DESCRIPTION,
  keywords: [
    "công nghệ", "technology", "AI", "trí tuệ nhân tạo", "artificial intelligence",
    "tin tức công nghệ", "tech news", "IT", "lập trình", "programming",
    "game", "giả lập", "emulator", "retro gaming",
    "đánh giá", "review", "smartphone", "laptop",
    "machine learning", "deep learning", "LLM",
    "RetroLab", "tạp chí công nghệ", "Việt Nam",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,

  // ── Canonical & Alternates ──
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: "RetroLab RSS Feed" }],
    },
  },

  // ── Open Graph ──
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "RetroLab - Tạp chí Công nghệ",
    description: DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "RetroLab - Tạp chí Công nghệ",
      },
    ],
  },

  // ── Twitter ──
  twitter: {
    card: "summary_large_image",
    title: "RetroLab - Tạp chí Công nghệ",
    description: DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
  },

  // ── Robots ──
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Verification (add your IDs later) ──
  // verification: {
  //   google: "YOUR_GOOGLE_VERIFICATION_ID",
  //   yandex: "YOUR_YANDEX_ID",
  // },

  // ── Icons ──
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },

  // ── Manifest ──
  manifest: "/manifest.json",

  // ── Category ──
  category: "technology",

  // ── Other ──
  other: {
    "msapplication-TileColor": "#2563eb",
    "theme-color": "#ffffff",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

// ── JSON-LD: Organization + WebSite + SearchAction ──
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.svg`,
        width: 512,
        height: 512,
      },
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "vi",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://tmwkuavfhnjthcicxsed.supabase.co" />

        {/* DNS prefetch for image CDNs */}
        <link rel="dns-prefetch" href="https://www.notion.so" />
        <link rel="dns-prefetch" href="https://prod-files-secure.s3.us-west-2.amazonaws.com" />

        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <Header />
          <div className="flex-grow">
            {children}
          </div>
          <Footer />
          <BottomNavigation />
          <ScrollToTop />
        </AuthProvider>
      </body>
    </html>
  );
}
