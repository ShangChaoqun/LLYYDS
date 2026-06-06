import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageViewerProps {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewer({ photos, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const lastTapRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset offset when index changes
  useEffect(() => {
    setOffset(0);
  }, [currentIndex]);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= photos.length) return;
    setIsAnimating(true);
    setOffset((index - currentIndex) * 100);
    setTimeout(() => {
      setCurrentIndex(index);
      setOffset(0);
      setIsAnimating(false);
    }, 300);
  }, [currentIndex, photos.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isZoomed || isAnimating) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }, [isZoomed, isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isZoomed || isAnimating) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const windowWidth = window.innerWidth;
    const percent = (deltaX / windowWidth) * 100;
    setOffset(percent);
  }, [isZoomed, isAnimating]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isZoomed || isAnimating) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Quick tap - let onClick handle it
    if (deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      setOffset(0);
      touchStartRef.current = null;
      return;
    }

    // Swipe detection
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0 && currentIndex > 0) {
        goTo(currentIndex - 1);
      } else if (deltaX < 0 && currentIndex < photos.length - 1) {
        goTo(currentIndex + 1);
      } else {
        setOffset(0);
      }
    } else {
      setOffset(0);
    }
    touchStartRef.current = null;
  }, [currentIndex, photos.length, isZoomed, isAnimating, goTo]);

  const handleImageClick = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      setIsZoomed((prev) => !prev);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      if (!isZoomed) {
        onClose();
      }
    }
  }, [isZoomed, onClose]);

  const handleBgClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  }, [onClose]);

  // Determine which images to render (current + adjacent)
  const visibleIndices = [currentIndex - 1, currentIndex, currentIndex + 1].filter(
    (i) => i >= 0 && i < photos.length
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden"
      onClick={handleBgClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image counter */}
      {photos.length > 1 && (
        <div
          className="absolute top-4 left-4 z-10 bg-black/40 rounded-full px-3 py-1"
          style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}
        >
          <span className="text-white text-xs">{currentIndex + 1} / {photos.length}</span>
        </div>
      )}

      {/* Images */}
      {visibleIndices.map((i) => {
        const positionOffset = (i - currentIndex) * 100 + offset;
        return (
          <img
            key={i}
            src={photos[i]}
            alt=""
            className="max-w-full object-contain absolute"
            style={{
              maxHeight: isZoomed && i === currentIndex ? 'none' : '85vh',
              transform: `translateX(${positionOffset}vw)`,
              transition: isAnimating ? 'transform 0.3s ease-out' : offset === 0 ? 'transform 0.3s ease-out' : 'none',
              cursor: isZoomed && i === currentIndex ? 'zoom-out' : 'zoom-in',
              ...(isZoomed && i === currentIndex
                ? { transform: `translateX(${positionOffset}vw) scale(2)`, transition: 'transform 0.2s ease-out' }
                : {}),
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (i === currentIndex) handleImageClick();
            }}
            draggable={false}
          />
        );
      })}

      {/* Hint */}
      {!isZoomed && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/40 rounded-full px-3 py-1 z-10">
          <span className="text-white/70 text-[10px]">
            {photos.length > 1 ? '左右滑动切换 · 双击放大 · 单击退出' : '双击放大 · 单击退出'}
          </span>
        </div>
      )}

      {isZoomed && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/40 rounded-full px-3 py-1 z-10">
          <span className="text-white/70 text-[10px]">双击缩小</span>
        </div>
      )}
    </div>
  );
}
