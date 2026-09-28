export default function ProjectsLoading() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
          <div className="h-4 w-96 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg"></div>
        </div>
        <div className="h-10 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
      </div>

      {/* Filters/Tabs Skeleton */}
      <div className="flex gap-2 mb-6">
        <div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
        <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
        <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
      </div>

      {/* Projects Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 h-[280px] flex flex-col justify-between overflow-hidden">
            <div className="h-32 bg-neutral-200 dark:bg-neutral-800"></div>
            <div className="p-4 space-y-3">
              <div className="h-5 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
              <div className="h-3 w-1/2 bg-neutral-100 dark:bg-neutral-800 rounded-md"></div>
              <div className="h-8 w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg mt-4"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
