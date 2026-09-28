import AppLayout from "@/components/AppLayout";

export default function DashboardLoading() {
  return (
    <div className="w-full h-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-pulse">
      {/* Header */}
      <div className="mb-6 sm:mb-8 space-y-2">
        <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
        <div className="h-4 w-96 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg"></div>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 h-32 flex flex-col justify-between">
          <div className="flex justify-between items-center"><div className="w-9 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div><div className="w-12 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div></div>
          <div className="space-y-2"><div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div><div className="h-3 w-32 bg-neutral-100 dark:bg-neutral-800 rounded-md"></div></div>
        </div>
        <div className="col-span-1 bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 h-32 flex flex-col justify-between">
          <div className="flex justify-between items-center"><div className="w-9 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div><div className="w-12 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div></div>
          <div className="space-y-2"><div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div><div className="h-3 w-32 bg-neutral-100 dark:bg-neutral-800 rounded-md"></div></div>
        </div>
        <div className="col-span-1 bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 h-32 flex flex-col justify-between">
          <div className="flex justify-between items-center"><div className="w-9 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div><div className="w-12 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div></div>
          <div className="space-y-2"><div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div><div className="h-3 w-32 bg-neutral-100 dark:bg-neutral-800 rounded-md"></div></div>
        </div>
      </div>

      {/* Projects List Skeleton */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div><div className="h-3 w-64 bg-neutral-100 dark:bg-neutral-800 rounded-md"></div></div>
          <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 h-24 sm:h-28 flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-11 h-14 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
                  <div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
