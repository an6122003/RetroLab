import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import NavigationProgress from "@/components/ui/NavigationProgress";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "RetroLab - Tạp chí Công nghệ",
  description: "Bắt trọn mọi chuyển động của thế giới số tại RetroLab. Trạm tin tức tổng hợp đa nguồn về Công Nghệ, AI cho đến thế giới Game và Giả Lập.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
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
          <ScrollToTop />
        </AuthProvider>
      </body>
    </html>
  );
}
