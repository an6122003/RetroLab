import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import NavigationProgress from "@/components/ui/NavigationProgress";

export const metadata: Metadata = {
  title: "RetroLab - Tạp chí Công nghệ",
  description: "RetroLab là tạp chí công nghệ dành cho những người yêu thích sự giao thoa giữa giá trị hoài cổ và sức mạnh của tương lai.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <Header />
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  );
}
