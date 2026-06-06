import { useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface ImageViewerProps {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewer({ photos, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // If zoomed, don't handle swipe
    if (isZoomed) return;

    // Quick tap (less than 300ms, small movement) - handled by onClick
    if (deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;

    // Swipe detection - horizontal movement must be dominant
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right → previous image
        setCurrentIndex(currentIndex - 1);
      } else if (deltaX < 0 && currentIndex < photos.length - 1) {
        // Swipe left → next image
        setCurrentIndex(currentIndex + 1);
      }
    }
    touchStartRef.current = null;
  }, [currentIndex, photos.length, isZoomed]);

  const handleImageClick = useCallback(() => {
    if (isZoomed) {
      setIsZoomed(false);
    } else {
      setIsZoomed(true);
    }
  }, [isZoomed]);

  const handleBgClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onClick={handleBgClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center"
        style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}
      >
        <X size={18} className="text-white" />
      </button>

      {/* Image counter */}
      {photos.length > 1 && (
        <div
          className="absolute top-4 left-4 z-10 bg-black/40 rounded-full px-3 py-1"
          style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}
        >
          <span className="text-white text-xs">{currentIndex + 1} / {photos.length}</span>
        </div>
      )}

      {/* Image */}
      <img
        src={photos[currentIndex]}
        alt=""
        className={`max-w-full object-contain transition-transform duration-200 ${
          isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
        }`}
        style={{
          maxHeight: isZoomed ? 'none' : '85vh',
          transform: isZoomed ? 'scale(2)' : 'scale(1)',
          transformOrigin: 'center center',
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleImageClick();
        }}
        draggable={false}
      />

      {/* Swipe hint */}
      {!isZoomed && photos.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/40 rounded-full px-3 py-1">
          <span className="text-white/70 text-[10px]">左右滑动切换 · 点击放大</span>
        </div>
      )}

      {/* Zoomed hint */}
      {isZoomed && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/40 rounded-full px-3 py-1">
          <span className="text-white/70 text-[10px]">点击缩小</span>
        </div>
      )}
    </div>
  );
}
