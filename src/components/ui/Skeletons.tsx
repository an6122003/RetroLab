/**
 * Skeleton loading components for every major layout section.
 * Uses CSS shimmer animation for a premium feel.
 */

function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`skeleton-bone rounded ${className}`} style={style} />
  );
}

/* ───── Homepage Skeletons ───── */

export function HomePageSkeleton() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col w-full animate-fade-in">
      {/* Hero Grid */}
      <div className="flex flex-col gap-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map(i => <HeroCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map(i => <SmallCardSkeleton key={i} />)}
        </div>
      </div>

      {/* Ticker */}
      <div className="mb-12">
        <Bone className="w-full h-12 rounded-lg" />
      </div>

      {/* Magazine Section */}
      <div className="flex flex-col w-full mb-16 border-b border-gray-200 pb-12">
        {/* Mag Top */}
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          <Bone className="w-full md:w-[380px] shrink-0 aspect-[16/9] rounded-lg" />
          <div className="flex-1 flex flex-col justify-center gap-4">
            <Bone className="w-20 h-4" />
            <Bone className="w-full h-8" />
            <Bone className="w-3/4 h-8" />
            <Bone className="w-full h-4" />
            <Bone className="w-32 h-3" />
          </div>
        </div>
        {/* Mag Hero */}
        <Bone className="w-full aspect-[16/9] md:aspect-[2.5/1] rounded-lg mb-12" />
        {/* 4 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {[0, 1, 2, 3].map(i => <MagCardSkeleton key={i} />)}
        </div>
      </div>

      {/* Asymmetric */}
      <div className="flex flex-col lg:flex-row gap-10 mb-16">
        <div className="flex-1 flex flex-col gap-8">
          <div className="border-b border-gray-200 pb-8">
            <Bone className="w-full aspect-[16/9] rounded-lg mb-4" />
            <Bone className="w-20 h-3 mb-3" />
            <Bone className="w-full h-8 mb-2" />
            <Bone className="w-3/4 h-4 mb-2" />
            <Bone className="w-32 h-3" />
          </div>
          {[0, 1, 2].map(i => <ListCardSkeleton key={i} />)}
        </div>
        <aside className="w-full lg:w-[300px] shrink-0">
          <Bone className="w-full aspect-[3/4] rounded-lg" />
        </aside>
      </div>

      {/* Notable */}
      <div className="mb-16">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-10">
          <Bone className="w-40 h-8" />
          <div className="hidden md:flex gap-8">
            <Bone className="w-16 h-4" />
            <Bone className="w-12 h-4" />
            <Bone className="w-16 h-4" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[0, 1, 2].map(i => <GridCardSkeleton key={i} />)}
        </div>
      </div>

      {/* Video */}
      <div className="mb-16 bg-gray-950 rounded-xl p-6 md:p-10">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-10">
          <Bone className="w-40 h-8 !bg-gray-800" />
          <Bone className="w-24 h-4 !bg-gray-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex flex-col">
              <Bone className="w-full aspect-[16/9] rounded-md mb-3 !bg-gray-800" />
              <Bone className="w-3/4 h-4 mb-1 !bg-gray-800" />
              <Bone className="w-20 h-3 !bg-gray-800" />
            </div>
          ))}
        </div>
      </div>

      {/* Editor Picks */}
      <div className="mb-12">
        <Bone className="w-56 h-8 mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[0, 1].map(i => <EditorCardSkeleton key={i} />)}
        </div>
      </div>
    </main>
  );
}

/* ───── Article Page Skeleton ───── */

export function ArticleSkeleton() {
  return (
    <div className="bg-white font-sans text-gray-800 animate-fade-in">
      {/* Hero Image */}
      <Bone className="w-full h-[400px] md:h-[500px] lg:h-[600px] mb-12 !rounded-none" />

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 flex flex-col items-center gap-4">
          <Bone className="w-24 h-3" />
          <Bone className="w-full h-10" />
          <Bone className="w-3/4 h-10" />
          <Bone className="w-40 h-3" />
        </div>
        {/* Paragraphs */}
        <div className="flex flex-col gap-4 mb-12">
          {[...Array(8)].map((_, i) => (
            <Bone key={i} className="w-full h-4" style={{ width: `${85 + Math.random() * 15}%` } as React.CSSProperties} />
          ))}
          <Bone className="w-full h-48 rounded-lg my-4" />
          {[...Array(6)].map((_, i) => (
            <Bone key={`p2-${i}`} className="w-full h-4" style={{ width: `${80 + Math.random() * 20}%` } as React.CSSProperties} />
          ))}
        </div>

        {/* Tags */}
        <div className="flex gap-2 mb-4">
          <Bone className="w-16 h-7 rounded-full" />
          <Bone className="w-20 h-7 rounded-full" />
          <Bone className="w-14 h-7 rounded-full" />
        </div>
      </div>

      {/* Related */}
      <div className="w-full bg-[#f8f9fa] py-16 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Bone className="w-48 h-6 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {[0, 1, 2].map(i => <GridCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── Category Page Skeleton ───── */

export function CategorySkeleton() {
  return (
    <div className="bg-white font-sans text-gray-800 animate-fade-in">
      {/* Hero Banner */}
      <Bone className="w-full h-[350px] md:h-[450px] !rounded-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-16">
        {/* Spotlight */}
        <Bone className="w-40 h-8 mb-10" />
        <div className="flex flex-col gap-16 mb-20">
          {[0, 1].map(i => (
            <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-center`}>
              <Bone className="w-full md:w-1/2 aspect-[16/9] rounded-lg" />
              <div className="w-full md:w-1/2 flex flex-col gap-4">
                <Bone className="w-full h-10" />
                <Bone className="w-3/4 h-10" />
                <Bone className="w-full h-4" />
                <Bone className="w-2/3 h-4" />
                <Bone className="w-32 h-3" />
              </div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <Bone className="w-32 h-6 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map(i => <SmallCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

/* ───── Search Page Skeleton ───── */

export function SearchSkeleton() {
  return (
    <div className="bg-white font-sans text-gray-800 min-h-screen animate-fade-in">
      <div className="bg-[#f8f9fa] border-b border-gray-200 py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <Bone className="w-40 h-12 mb-8" />
          <Bone className="w-full max-w-2xl h-14 rounded-full" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Bone className="w-64 h-6 mb-10" />
        <div className="flex flex-col gap-10">
          {[0, 1, 2].map(i => <ListCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

/* ───── Individual Card Skeletons ───── */

function HeroCardSkeleton() {
  return (
    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden">
      <Bone className="w-full h-full !rounded-lg" />
      <div className="absolute inset-0 flex flex-col justify-between p-6">
        <Bone className="w-20 h-5 self-start" />
        <Bone className="w-3/4 h-8" />
      </div>
    </div>
  );
}

function SmallCardSkeleton() {
  return (
    <div className="flex flex-col">
      <Bone className="w-full aspect-[16/9] rounded-lg mb-4" />
      <Bone className="w-3/4 h-5 mb-2" />
      <Bone className="w-24 h-3" />
    </div>
  );
}

function MagCardSkeleton() {
  return (
    <div className="flex flex-col items-center text-center">
      <Bone className="w-full aspect-[16/9] rounded-lg mb-6" />
      <Bone className="w-3/4 h-5 mb-3" />
      <Bone className="w-1/2 h-5 mb-3" />
      <Bone className="w-24 h-3" />
    </div>
  );
}

function ListCardSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-6 border-b border-gray-100 pb-8">
      <Bone className="w-full sm:w-[280px] shrink-0 aspect-[16/9] rounded-lg" />
      <div className="flex flex-col justify-center gap-3 flex-1">
        <Bone className="w-20 h-3" />
        <Bone className="w-full h-6" />
        <Bone className="w-full h-4" />
        <Bone className="w-2/3 h-4" />
        <Bone className="w-32 h-3" />
      </div>
    </div>
  );
}

function GridCardSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <Bone className="w-full aspect-[16/9] rounded-lg mb-4" />
      <Bone className="w-20 h-3 mb-3" />
      <Bone className="w-full h-6 mb-2" />
      <Bone className="w-full h-4 mb-2" />
      <Bone className="w-2/3 h-4" />
    </div>
  );
}

function EditorCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <Bone className="w-full aspect-[16/9] !rounded-none" />
      <div className="p-6 flex flex-col gap-3">
        <Bone className="w-20 h-3" />
        <Bone className="w-full h-8" />
        <Bone className="w-full h-4" />
        <Bone className="w-3/4 h-4" />
        <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
          <Bone className="w-24 h-3" />
          <Bone className="w-20 h-3" />
        </div>
      </div>
    </div>
  );
}
