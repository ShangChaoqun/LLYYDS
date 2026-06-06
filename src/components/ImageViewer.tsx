import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageViewerProps {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewer({ photos, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [translateX, setTranslateX] = useState(-initialIndex * 100);
  const [isDragging, setIsDragging] = useState(false);
  const lastTapRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync translateX with currentIndex when not dragging
  useEffect(() => {
    if (!isDragging) {
      setTranslateX(-currentIndex * 100);
    }
  }, [currentIndex, isDragging]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isZoomed) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  }, [isZoomed]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isZoomed) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const windowWidth = window.innerWidth;
    const offsetPercent = (deltaX / windowWidth) * 100;
    setTranslateX(-currentIndex * 100 + offsetPercent);
  }, [currentIndex, isZoomed]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isZoomed) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    setIsDragging(false);

    // Quick tap (less than 300ms, small movement) - let onClick handle it
    if (deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      touchStartRef.current = null;
      return;
    }

    // Swipe detection
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (deltaX < 0 && currentIndex < photos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Bounce back at edges
        setTranslateX(-currentIndex * 100);
      }
    } else {
      // Not enough swipe distance, bounce back
      setTranslateX(-currentIndex * 100);
    }
    touchStartRef.current = null;
  }, [currentIndex, photos.length, isZoomed]);

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

      {/* Sliding container */}
      <div
        className="flex h-full items-center"
        style={{
          width: `${photos.length * 100}%`,
          transform: `translateX(${translateX / photos.length}%)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {photos.map((photo, i) => (
          <div
            key={i}
            className="h-full flex items-center justify-center"
            style={{ width: `${100 / photos.length}%` }}
          >
            <img
              src={photo}
              alt=""
              className={`max-w-full object-contain ${
                isZoomed && i === currentIndex ? 'cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              style={{
                maxHeight: isZoomed && i === currentIndex ? 'none' : '85vh',
                transform: isZoomed && i === currentIndex ? 'scale(2)' : 'scale(1)',
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease-out',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (i === currentIndex) handleImageClick();
              }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Hint */}
      {!isZoomed && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/40 rounded-full px-3 py-1">
          <span className="text-white/70 text-[10px]">
            {photos.length > 1 ? '左右滑动切换 · 双击放大 · 单击退出' : '双击放大 · 单击退出'}
          </span>
        </div>
      )}

      {isZoomed && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/40 rounded-full px-3 py-1">
          <span className="text-white/70 text-[10px]">双击缩小</span>
        </div>
      )}
    </div>
  );
}
