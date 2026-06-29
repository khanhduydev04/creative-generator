export function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background-subtle p-4 md:flex">
        <div className="mb-6 h-8 w-32 animate-pulse rounded-lg bg-background-elevated" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-lg bg-background-elevated"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
        <div className="mt-auto space-y-2">
          <div className="h-9 animate-pulse rounded-lg bg-background-elevated" />
          <div className="h-9 animate-pulse rounded-lg bg-background-elevated" />
        </div>
      </aside>

      {/* Main area skeleton */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 items-center justify-between border-b border-border px-6">
          <div className="h-5 w-40 animate-pulse rounded bg-background-elevated" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-background-elevated" />
        </div>

        {/* Content skeleton */}
        <div className="flex flex-1 gap-6 overflow-auto p-6">
          {/* Left panel */}
          <div className="hidden w-80 shrink-0 space-y-4 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-background-elevated" />
                <div
                  className="h-9 animate-pulse rounded-lg bg-background-elevated"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              </div>
            ))}
            <div className="h-10 animate-pulse rounded-xl bg-primary/20" />
          </div>

          {/* Right panel */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] animate-pulse rounded-xl bg-background-elevated"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
