export function ProductGridSkeleton({ cols = 4, count = 8 }: { cols?: number; count?: number }) {
  const gridClass =
    cols <= 2
      ? 'grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-14'
      : cols === 3
        ? 'grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12'
        : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-5 md:gap-y-12'

  return (
    <div className={gridClass} data-testid="product-grid-skeleton">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="animate-pulse flex flex-col">
          {/* Aspect ratio 3/4 box */}
          <div className="w-full aspect-[3/4] bg-surface-container-low rounded-xl mb-3 md:mb-4" />
          
          {/* Text lines */}
          <div className="h-4 bg-surface-container-low rounded w-3/4 mb-2" />
          <div className="h-3.5 bg-surface-container-low rounded w-1/2 mb-3" />
          
          {/* Pill placeholders */}
          <div className="flex gap-1.5 mt-auto">
            <div className="h-6 w-8 bg-surface-container-low rounded-md" />
            <div className="h-6 w-8 bg-surface-container-low rounded-md" />
            <div className="h-6 w-8 bg-surface-container-low rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}
