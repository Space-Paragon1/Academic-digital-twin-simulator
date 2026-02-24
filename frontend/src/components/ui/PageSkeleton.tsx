/**
 * Shown by Next.js loading.tsx while a page's JavaScript bundle is being
 * compiled / downloaded on first visit in development, or while a Suspense
 * boundary is waiting.  Keeps the Navbar + Sidebar visible so navigation
 * never looks broken.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading page…">
      {/* Page title placeholder */}
      <div className="h-7 w-48 rounded-lg bg-gray-200" />

      {/* Summary card row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-2">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-7 w-16 rounded bg-gray-300" />
            <div className="h-3 w-28 rounded bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-56 rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
