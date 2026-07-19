export function SkeletonLine({ className = '' }) {
  return <div className={`skeleton h-4 ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="skeleton mb-4 h-10 w-10 rounded-xl" />
      <div className="skeleton mb-2 h-6 w-2/3 rounded-lg" />
      <div className="skeleton h-4 w-1/2 rounded-lg" />
    </div>
  )
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
