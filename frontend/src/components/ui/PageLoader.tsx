export function PageLoader() {
  return (
    <div role="status" aria-label="Loading page" className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-xl border border-line bg-surface" />
        ))}
      </div>
      <div className="h-72 rounded-xl border border-line bg-surface" />
    </div>
  );
}
