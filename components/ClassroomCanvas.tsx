"use client";

import type { CSSProperties, PointerEventHandler, ReactNode, Ref } from "react";
import { useEffect, useRef, useState } from "react";

type ClassroomCanvasProps = {
  children: ReactNode;
  overlay?: ReactNode;
  className?: string;
  canvasClassName?: string;
  canvasStyle?: CSSProperties;
  canvasRef?: Ref<HTMLDivElement>;
  logicalWidth?: number;
  logicalHeight?: number;
  minPhoneScale?: number;
  maxScale?: number;
  onScaleChange?: (scale: number) => void;
  onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
};

export default function ClassroomCanvas({
  children,
  overlay,
  className = "",
  canvasClassName = "",
  canvasStyle,
  canvasRef,
  logicalWidth = 1040,
  logicalHeight = 528,
  minPhoneScale = 0.62,
  maxScale = 1,
  onScaleChange,
  onPointerMove,
  onPointerUp,
  onPointerLeave
}: ClassroomCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      const availableWidth = viewport.clientWidth;
      const availableHeight = viewport.clientHeight;
      const fitScale = Math.min(maxScale, availableWidth / logicalWidth, availableHeight / logicalHeight);
      const nextScale = window.innerWidth < 640 ? Math.max(minPhoneScale, fitScale) : fitScale;
      setScale(nextScale);
      onScaleChange?.(nextScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [logicalHeight, logicalWidth, maxScale, minPhoneScale, onScaleChange]);

  return (
    <div className={`classroom-canvas hero-card relative overflow-hidden ${className}`}>
      {overlay}
      <div ref={viewportRef} className="classroom-canvas-viewport h-full w-full overflow-x-auto overflow-y-hidden">
        <div
          className="relative mx-auto"
          style={{
            width: logicalWidth * scale,
            height: logicalHeight * scale,
            minWidth: logicalWidth * scale
          }}
        >
          <div
            ref={canvasRef}
            className={`absolute left-0 top-0 origin-top-left ${canvasClassName}`}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            style={{
              ...canvasStyle,
              width: logicalWidth,
              height: logicalHeight,
              transform: `scale(${scale})`
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
