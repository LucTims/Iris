export default function CoverStudioLoading() {
  return (
    <div className="flex h-screen w-full bg-neutral-100 dark:bg-neutral-950 animate-pulse">
      {/* Sidebar Controls Skeleton */}
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 flex flex-col h-full overflow-hidden">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-8"></div>
        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
            <div className="h-24 w-full bg-neutral-100 dark:bg-neutral-800/50 rounded-xl"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
            <div className="h-10 w-full bg-neutral-100 dark:bg-neutral-800/50 rounded-xl"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg"></div>
              <div className="h-12 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg"></div>
              <div className="h-12 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg"></div>
            </div>
          </div>
        </div>
        <div className="h-12 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl mt-6"></div>
      </div>

      {/* Main Canvas Skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-[400px] aspect-[2/3] bg-neutral-200 dark:bg-neutral-800 rounded-2xl shadow-xl"></div>
        <div className="mt-8 flex gap-4">
          <div className="h-10 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
          <div className="h-10 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}
