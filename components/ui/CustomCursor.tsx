import React, { useEffect, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const targetPositionRef = useRef({ x: 0, y: 0 });
  const isPointerRef = useRef(false);

  useEffect(() => {
    // Hide cursor on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) return;

    let animationFrameId: number;

    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    const updateCursor = () => {
      positionRef.current.x = lerp(positionRef.current.x, targetPositionRef.current.x, 0.15);
      positionRef.current.y = lerp(positionRef.current.y, targetPositionRef.current.y, 0.15);

      if (outerRef.current && innerRef.current) {
        const scale = isPointerRef.current ? 1.5 : 1;
        const innerScale = isPointerRef.current ? 0.5 : 1;

        outerRef.current.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0) translate(-50%, -50%) scale(${scale})`;
        innerRef.current.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0) translate(-50%, -50%) scale(${innerScale})`;
      }

      animationFrameId = requestAnimationFrame(updateCursor);
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetPositionRef.current = { x: e.clientX, y: e.clientY };

      const target = e.target as HTMLElement;
      isPointerRef.current =
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') !== null ||
        target.closest('a') !== null;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    animationFrameId = requestAnimationFrame(updateCursor);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Don't render on mobile
  if (typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return null;
  }

  return (
    <>
      <div
        ref={outerRef}
        className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference will-change-transform hidden md:block"
        style={{ contain: 'layout style paint' }}
      >
        <div className="h-5 w-5 rounded-full border-2 border-white transition-transform duration-150" />
      </div>
      <div
        ref={innerRef}
        className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference will-change-transform hidden md:block"
        style={{ contain: 'layout style paint' }}
      >
        <div className="h-2 w-2 rounded-full bg-white transition-transform duration-150" />
      </div>
      <style>{`
        @media (min-width: 768px) {
          body { cursor: none !important; }
          a, button, [role="button"] { cursor: none !important; }
        }
      `}</style>
    </>
  );
};

export default CustomCursor;
