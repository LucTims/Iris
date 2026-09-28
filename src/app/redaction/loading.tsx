export default function RedactionLoading() {
  return (
    <div className="flex h-screen w-full bg-white dark:bg-neutral-950 animate-pulse">
      {/* Left Sidebar Skeleton (Chapters) */}
      <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4">
          <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 w-full bg-neutral-100 dark:bg-neutral-800/50 rounded-lg"></div>
          ))}
        </div>
      </div>

      {/* Main Editor Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Editor Toolbar Skeleton */}
        <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 gap-2">
          <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
          <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
          <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
          <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-2"></div>
          <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
        </div>

        {/* Editor Canvas Skeleton */}
        <div className="flex-1 p-8 sm:p-12 lg:p-24 max-w-4xl mx-auto w-full space-y-6">
          <div className="h-12 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-8"></div>
          <div className="space-y-3">
            <div className="h-4 w-full bg-neutral-100 dark:bg-neutral-800/50 rounded-md"></div>
            <div className="h-4 w-full bg-neutral-100 dark:bg-neutral-800/50 rounded-md"></div>
            <div className="h-4 w-5/6 bg-neutral-100 dark:bg-neutral-800/50 rounded-md"></div>
          </div>
          <div className="space-y-3 pt-6">
            <div className="h-4 w-full bg-neutral-100 dark:bg-neutral-800/50 rounded-md"></div>
            <div className="h-4 w-11/12 bg-neutral-100 dark:bg-neutral-800/50 rounded-md"></div>
            <div className="h-4 w-4/5 bg-neutral-100 dark:bg-neutral-800/50 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
