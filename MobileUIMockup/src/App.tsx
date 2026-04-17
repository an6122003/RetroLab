/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Header from './components/Header';
import Ticker from './components/Ticker';
import HeroSection from './components/HeroSection';
import MainContent from './components/MainContent';
import NewsletterSection from './components/NewsletterSection';
import ScrollToTop from './components/ScrollToTop';
import ArticlePage from './components/ArticlePage';
import CategoryPage from './components/CategoryPage';
import CategoryPageAlternate from './components/CategoryPageAlternate';
import CategoryPageMagazine from './components/CategoryPageMagazine';
import CategoryPageNews from './components/CategoryPageNews';
import SearchPage from './components/SearchPage';
import ProfilePage from './components/ProfilePage';
import Footer from './components/Footer';
import BottomNavigation from './components/BottomNavigation';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'article' | 'category' | 'category-alt' | 'category-mag' | 'category-news' | 'search' | 'profile'>('home');

  const togglePage = () => {
    if (currentPage === 'home') setCurrentPage('article');
    else if (currentPage === 'article') setCurrentPage('category');
    else if (currentPage === 'category') setCurrentPage('category-alt');
    else if (currentPage === 'category-alt') setCurrentPage('category-mag');
    else if (currentPage === 'category-mag') setCurrentPage('category-news');
    else if (currentPage === 'category-news') setCurrentPage('search');
    else if (currentPage === 'search') setCurrentPage('profile');
    else setCurrentPage('home');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 flex flex-col pb-[72px] md:pb-0">
      <div onClick={togglePage} className="bg-gray-100 text-center text-[10px] py-1 cursor-pointer hover:bg-gray-200 text-gray-400 shrink-0 uppercase tracking-widest">
        Demo: {currentPage} (Click to toggle)
      </div>
      <Header onProfileClick={() => setCurrentPage('profile')} />
      
      <div className="flex-grow">
        {currentPage === 'home' && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 flex flex-col w-full">
            <Ticker category="Tin tức" text="MacBook Neo có thể chạy Windows qua Parallels nhưng không tối ưu" />
            <MainContent />
            <NewsletterSection />
          </main>
        )}
        
        {currentPage === 'article' && (
          <main>
            <ArticlePage />
          </main>
        )}

        {currentPage === 'category' && (
          <main>
            <CategoryPage />
          </main>
        )}

        {currentPage === 'category-alt' && (
          <main>
            <CategoryPageAlternate />
          </main>
        )}

        {currentPage === 'category-mag' && (
          <main>
            <CategoryPageMagazine />
          </main>
        )}

        {currentPage === 'category-news' && (
          <main>
            <CategoryPageNews />
          </main>
        )}

        {currentPage === 'search' && (
          <main>
            <SearchPage />
          </main>
        )}

        {currentPage === 'profile' && (
          <main className="bg-[#f8f9fa] min-h-screen">
            <ProfilePage />
          </main>
        )}
      </div>
      
      <Footer />
      <BottomNavigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <ScrollToTop />
    </div>
  );
}
