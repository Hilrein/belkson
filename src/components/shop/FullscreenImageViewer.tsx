import { useEffect, useState, type TouchEvent } from 'react'

interface FullscreenImageViewerProps {
  isOpen: boolean
  images: string[]
  initialIndex?: number
  title?: string
  colors?: string[]
  selectedColorIndex?: number
  onSelectColor?: (index: number) => void
  onClose: () => void
}

export function FullscreenImageViewer({
  isOpen,
  images,
  initialIndex = 0,
  title,
  colors = [],
  selectedColorIndex = 0,
  onSelectColor,
  onClose,
}: FullscreenImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Touch swipe handling
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex, isOpen])

  // Keyboard navigation & lock scroll
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, images.length, currentIndex])

  if (!isOpen || images.length === 0) return null

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  // Swipe gesture for mobile
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return
    const distance = touchStartX - touchEndX
    const minSwipeDistance = 50

    if (distance > minSwipeDistance) {
      handleNext()
    } else if (distance < -minSwipeDistance) {
      handlePrev()
    }

    setTouchStartX(null)
    setTouchEndX(null)
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-between bg-black/92 backdrop-blur-lg text-white select-none transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between px-4 sm:px-8 py-4 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col min-w-0 pr-4">
          {title && (
            <h3 className="text-sm sm:text-base font-semibold truncate text-white/95">
              {title}
            </h3>
          )}
          <span className="text-xs text-white/60 tabular-nums">
            {currentIndex + 1} из {images.length}
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
          aria-label="Закрыть полноэкранный просмотр"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      {/* Main Image Container with Side-by-Side Thumbnails */}
      <div
        className="relative flex-1 flex flex-col sm:flex-row items-center justify-center p-3 sm:p-6 overflow-hidden gap-4 sm:gap-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Arrow */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/75 border border-white/20 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
            aria-label="Предыдущее фото"
          >
            <span className="material-symbols-outlined text-2xl sm:text-3xl">chevron_left</span>
          </button>
        )}

        {/* Side-by-side Thumbnails (Рядом с изображением) */}
        {images.length > 1 && (
          <div className="hidden sm:flex flex-col gap-2 shrink-0 max-h-[75vh] overflow-y-auto scrollbar-none z-20 pr-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-14 h-18 md:w-16 md:h-22 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'border-white ring-2 ring-white/30 scale-105 shadow-xl opacity-100'
                    : 'border-transparent opacity-45 hover:opacity-90'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Display Main Image Frame */}
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          <img
            key={currentIndex}
            src={images[currentIndex]}
            alt={title || `Фото ${currentIndex + 1}`}
            className="max-h-[72vh] sm:max-h-[82vh] max-w-[88vw] sm:max-w-[78vw] object-contain rounded-2xl shadow-2xl transition-all duration-300 animate-fade-in border border-white/10"
          />
        </div>

        {/* Next Arrow */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-6 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/75 border border-white/20 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
            aria-label="Следующее фото"
          >
            <span className="material-symbols-outlined text-2xl sm:text-3xl">
              chevron_right
            </span>
          </button>
        )}
      </div>

      {/* Bottom Control Bar for Mobile & Color Selector */}
      <div
        className="flex flex-col items-center gap-3 px-4 py-3 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color / Variant Selector Pills */}
        {colors.length > 1 && onSelectColor && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full px-2 py-1 scrollbar-none">
            {colors.map((color, idx) => {
              const isActive = selectedColorIndex === idx
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onSelectColor(idx)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-black border-white font-semibold shadow-md'
                      : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                  }`}
                >
                  {color}
                </button>
              )
            })}
          </div>
        )}

        {/* Mobile Horizontal Thumbnail Ribbon */}
        {images.length > 1 && (
          <div className="flex sm:hidden gap-2 overflow-x-auto max-w-full px-2 py-1 scrollbar-none">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  currentIndex === idx
                    ? 'border-white scale-105 shadow-md opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-90'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
