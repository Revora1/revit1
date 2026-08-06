const fs = require('fs');
let code = fs.readFileSync('src/components/Profile.tsx', 'utf8');

// Replace the main profile loading
const profileLoadingTarget = `  if (loading) return (
    <div className="min-h-full bg-black flex items-center justify-center pb-20">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );`;

const profileLoadingReplacement = `  if (loading) return (
    <div className="relative min-h-full w-full bg-black pb-20 flex flex-col overflow-hidden animate-pulse">
      {/* Header Skeleton */}
      <div className="p-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] border-b border-zinc-900 bg-zinc-950/50 flex items-center justify-between">
        <div className="h-6 w-32 bg-zinc-800 rounded-lg" />
        <div className="h-6 w-6 bg-zinc-800 rounded-full" />
      </div>

      {/* Main Profile Skeleton */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-800" />
          
          {/* Stats Skeletons */}
          <div className="flex gap-4 pt-2">
            <div className="flex flex-col items-center">
              <div className="h-4 w-6 bg-zinc-800 rounded mb-1" />
              <div className="h-3 w-12 bg-zinc-900 rounded" />
            </div>
            <div className="flex flex-col items-center">
              <div className="h-4 w-6 bg-zinc-800 rounded mb-1" />
              <div className="h-3 w-16 bg-zinc-900 rounded" />
            </div>
            <div className="flex flex-col items-center">
              <div className="h-4 w-6 bg-zinc-800 rounded mb-1" />
              <div className="h-3 w-16 bg-zinc-900 rounded" />
            </div>
          </div>
        </div>

        {/* Bio Skeleton */}
        <div className="space-y-2 mb-6">
          <div className="h-4 w-1/3 bg-zinc-800 rounded" />
          <div className="h-3 w-2/3 bg-zinc-900 rounded" />
          <div className="h-3 w-1/2 bg-zinc-900 rounded" />
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-zinc-800 rounded-xl" />
          <div className="w-10 h-10 bg-zinc-800 rounded-xl" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex justify-around border-t border-b border-zinc-900 py-3">
        <div className="h-4 w-16 bg-zinc-900 rounded" />
        <div className="h-4 w-16 bg-zinc-900 rounded" />
        <div className="h-4 w-16 bg-zinc-900 rounded" />
      </div>

      {/* Grid Content Skeleton */}
      <div className="grid grid-cols-3 gap-1 px-1 mt-2">
        <div className="aspect-[3/4] bg-zinc-900" />
        <div className="aspect-[3/4] bg-zinc-900" />
        <div className="aspect-[3/4] bg-zinc-900" />
        <div className="aspect-[3/4] bg-zinc-900" />
        <div className="aspect-[3/4] bg-zinc-900" />
        <div className="aspect-[3/4] bg-zinc-900" />
      </div>
    </div>
  );`;

code = code.replace(profileLoadingTarget, profileLoadingReplacement);

// Replace UserPosts loading
const postsLoadingTarget = `  if (loading) return <div className="p-8 text-center text-zinc-500 font-medium">Loading...</div>;`;

const postsLoadingReplacement = `  if (loading) return (
    <div className="grid grid-cols-3 gap-1 px-1 mt-2 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="aspect-[3/4] bg-zinc-900" />
      ))}
    </div>
  );`;

code = code.replace(postsLoadingTarget, postsLoadingReplacement);

fs.writeFileSync('src/components/Profile.tsx', code);
