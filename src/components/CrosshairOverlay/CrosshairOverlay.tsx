import React, { useRef, useCallback } from "react";

interface CrosshairOverlayProps {
  isActive: boolean;
  onPositionChange: (x: number, y: number) => void;
  crosshairPosition: { x: number; y: number };
  viewType: "axial" | "coronal" | "sagittal";
  onReferenceLineDrag?: (axis: "x" | "y", percent: number) => void;
  onSlabThicknessChange?: (delta: number) => void;
  onAxesRotate?: (deltaDegrees: number) => void;
}

const CrosshairOverlay: React.FC<CrosshairOverlayProps> = ({
  isActive,
  crosshairPosition,
  onPositionChange,
  // viewType,
  onReferenceLineDrag,
  onSlabThicknessChange,
  onAxesRotate,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { x, y } = crosshairPosition;

  if (!isActive) return null;

  const getPercentFromEvent = (e: React.MouseEvent | MouseEvent) => {
    const el = rootRef.current;
    if (!el) return { px: x, py: y };
    const rect = el.getBoundingClientRect();
    const px =
      ((("clientX" in e ? e.clientX : 0) - rect.left) / rect.width) * 100;
    const py =
      ((("clientY" in e ? e.clientY : 0) - rect.top) / rect.height) * 100;
    return {
      px: Math.max(0, Math.min(100, px)),
      py: Math.max(0, Math.min(100, py)),
    };
  };

  const startDragCenter = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const onMove = (ev: MouseEvent) => {
        const { px, py } = getPercentFromEvent(ev);
        onPositionChange(px, py);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onPositionChange]
  );

  const startDragReference = useCallback(
    (axis: "x" | "y") => (e: React.MouseEvent) => {
      e.preventDefault();
      if (!onReferenceLineDrag) return;
      const onMove = (ev: MouseEvent) => {
        const { px, py } = getPercentFromEvent(ev);
        onReferenceLineDrag(axis, axis === "x" ? px : py);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onReferenceLineDrag]
  );

  const startDragSlab = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!onSlabThicknessChange) return;
      let lastY = e.clientY;
      const onMove = (ev: MouseEvent) => {
        const delta = lastY - ev.clientY;
        lastY = ev.clientY;
        onSlabThicknessChange(delta);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onSlabThicknessChange]
  );

  const startRotateAxes = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!onAxesRotate || !rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width * (x / 100);
      const cy = rect.top + rect.height * (y / 100);
      let lastAngle = Math.atan2(e.clientY - cy, e.clientX - cx);

      const onMove = (ev: MouseEvent) => {
        const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
        const deltaDeg = ((angle - lastAngle) * 180) / Math.PI;
        lastAngle = angle;
        onAxesRotate(deltaDeg);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onAxesRotate, x, y]
  );

  return (
    <div ref={rootRef} className="absolute inset-0 z-10 pointer-events-none">
      {/* reference lines (draggable) */}
      <div
        className="absolute top-0 bottom-0 w-px bg-green-400/70 cursor-col-resize pointer-events-auto"
        style={{ left: `${x}%` }}
        onMouseDown={startDragReference("x")}
      />
      <div
        className="absolute left-0 right-0 h-px bg-green-400/70 cursor-row-resize pointer-events-auto"
        style={{ top: `${y}%` }}
        onMouseDown={startDragReference("y")}
      />

      {/* center draggable handle */}
      <div
        className="absolute w-3 h-3 rounded-full border-2 border-green-400 bg-green-400/20 -translate-x-1/2 -translate-y-1/2 cursor-move pointer-events-auto"
        style={{ left: `${x}%`, top: `${y}%` }}
        onMouseDown={startDragCenter}
      />

      {/* slab thickness square handles near center */}
      <div
        className="absolute w-3 h-3 bg-yellow-400 border border-yellow-600 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize pointer-events-auto"
        style={{ left: `${x}%`, top: `${y - 6}%` }}
        onMouseDown={startDragSlab}
      />
      <div
        className="absolute w-3 h-3 bg-yellow-400 border border-yellow-600 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize pointer-events-auto"
        style={{ left: `${x}%`, top: `${y + 6}%` }}
        onMouseDown={startDragSlab}
      />

      {/* rotation circle handles further from center */}
      <div
        className="absolute w-3 h-3 rounded-full bg-blue-400 border border-blue-600 -translate-x-1/2 -translate-y-1/2 cursor-alias pointer-events-auto"
        style={{ left: `${x}%`, top: `${y - 16}%` }}
        onMouseDown={startRotateAxes}
      />
      <div
        className="absolute w-3 h-3 rounded-full bg-blue-400 border border-blue-600 -translate-x-1/2 -translate-y-1/2 cursor-alias pointer-events-auto"
        style={{ left: `${x}%`, top: `${y + 16}%` }}
        onMouseDown={startRotateAxes}
      />
    </div>
  );
};

export default CrosshairOverlay;
