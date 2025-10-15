import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createViewport,
  displayImage,
  setViewport,
  getViewport,
  resize,
} from "../../utils/cornerstoneInit";
import type { DicomImage, ViewType } from "../../types/dicom";
import WindowLevelControls from "../WindowLevelControls/WindowLevelControls";
import CrosshairOverlay from "../CrosshairOverlay/CrosshairOverlay";

// Cornerstone docs used in this component:
// - enable/displayImage/getViewport/setViewport/resize: https://github.com/cornerstonejs/cornerstone
// - Viewport VOI (window/level) basics: https://github.com/cornerstonejs/cornerstone/wiki/Viewport

interface DicomViewportProps {
  images: DicomImage[];
  viewType: ViewType;
  currentSlice: number;
  onSliceChange: (slice: number) => void;
  windowCenter: number;
  windowWidth: number;
  onWindowLevelChange: (center: number, width: number) => void;
  isActive: boolean;
  crosshairPosition: { x: number; y: number };
  showCrosshair: boolean;
  onCrosshairChange: (x: number, y: number) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onError?: (error: string) => void;
  onReferenceLineDrag?: (axis: "x" | "y", percent: number) => void;
  onSlabThicknessChange?: (delta: number) => void;
  onAxesRotate?: (deltaDegrees: number) => void;
}

const DicomViewport: React.FC<DicomViewportProps> = ({
  images,
  viewType,
  currentSlice,
  onSliceChange,
  windowCenter,
  windowWidth,
  onWindowLevelChange,
  isActive,
  crosshairPosition,
  showCrosshair,
  onCrosshairChange,
  onMouseEnter,
  onMouseLeave,
  onError,
  onReferenceLineDrag,
  onSlabThicknessChange,
  onAxesRotate,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const interactionsEnabled = true;
  const lastImageIdRef = useRef<string | null>(null);

  const initializeViewport = useCallback(async () => {
    if (!viewportRef.current || isInitialized) return;
    try {
      await createViewport(viewportRef.current);
      setIsInitialized(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to initialize viewport";
      console.error(`Failed to initialize ${viewType} viewport:`, error);
      onError?.(errorMessage);
    }
  }, [viewType, isInitialized, onError]);

  const loadCurrentImage = useCallback(async () => {
    if (!viewportRef.current || !isInitialized || images.length === 0) return;
    const image = images[currentSlice];
    if (!image) {
      return;
    }

    try {
      const isSameImage = lastImageIdRef.current === image.imageId;
      if (!isSameImage) {
        setIsLoading(true);
        await displayImage(viewportRef.current, image.imageId);
        lastImageIdRef.current = image.imageId;
      }

      const viewport = getViewport(viewportRef.current);
      if (!viewport) throw new Error("Viewport not found");
      const currentVoi = viewport.voi || {
        windowCenter: undefined,
        windowWidth: undefined,
      };
      const hasProvidedCenter =
        typeof windowCenter === "number" && windowCenter > 0;
      const hasProvidedWidth =
        typeof windowWidth === "number" && windowWidth > 0;
      const effectiveCenter = hasProvidedCenter
        ? windowCenter
        : image.windowCenter || currentVoi.windowCenter || 2048;
      const effectiveWidth = hasProvidedWidth
        ? windowWidth
        : image.windowWidth || currentVoi.windowWidth || 4095;

      if (
        typeof effectiveCenter === "number" &&
        typeof effectiveWidth === "number" &&
        isFinite(effectiveCenter) &&
        isFinite(effectiveWidth)
      ) {
        viewport.voi.windowCenter = effectiveCenter;
        viewport.voi.windowWidth = effectiveWidth;
      }

      const iop = image.imageOrientationPatient || [1, 0, 0, 0, 1, 0];
      const rowCosines = [iop[0], iop[1], iop[2]];
      const colCosines = [iop[3], iop[4], iop[5]];
      let hflip = false;
      let vflip = false;
      let rotation = 0;

      if (viewType === "axial") {
        if (Math.abs(rowCosines[0]) > 0.7) hflip = rowCosines[0] < 0;
        if (Math.abs(colCosines[1]) > 0.7) vflip = colCosines[1] < 0;
      } else if (viewType === "coronal") {
        if (Math.abs(rowCosines[0]) > 0.7) hflip = rowCosines[0] < 0;
        if (Math.abs(colCosines[2]) > 0.7) vflip = colCosines[2] > 0;
      } else if (viewType === "sagittal") {
        if (Math.abs(rowCosines[1]) > 0.7) hflip = rowCosines[1] > 0;
        if (Math.abs(colCosines[2]) > 0.7) vflip = colCosines[2] > 0;
      }

      viewport.hflip = hflip;
      viewport.vflip = vflip;
      viewport.rotation = rotation;
      setViewport(viewportRef.current, viewport);

      if (!hasProvidedCenter || !hasProvidedWidth) {
        onWindowLevelChange(effectiveCenter, effectiveWidth);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to load image ${image.imageId}`;
      console.error(`Failed to load image in ${viewType} viewport:`, error);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    viewportRef,
    isInitialized,
    images,
    currentSlice,
    windowCenter,
    windowWidth,
    viewType,
    onWindowLevelChange,
    onError,
  ]);

  const handleWheelStack = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (!interactionsEnabled) return;
      if (!isActive) return;
      const delta = e.deltaY > 0 ? 1 : -1;
      const newSlice = Math.max(
        0,
        Math.min(images.length - 1, currentSlice + delta)
      );
      if (newSlice !== currentSlice) onSliceChange(newSlice);
    },
    [interactionsEnabled, isActive, images.length, currentSlice, onSliceChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!interactionsEnabled) return;
      if (!isActive || !viewportRef.current) return;

      const element = viewportRef.current;
      const startX = e.clientX;
      const startY = e.clientY;

      // Left click: reserved for selected tool (no-op here)
      if (e.button === 0) {
        return;
      }

      // Middle click: pan
      if (e.button === 1) {
        const viewport = getViewport(element);
        if (!viewport) return;
        let tx = viewport.translation?.x || 0;
        let ty = viewport.translation?.y || 0;
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          const vp = getViewport(element);
          if (!vp) return;
          vp.translation = { x: tx + dx, y: ty + dy };
          setViewport(element, vp);
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return;
      }

      // Right click: drag to zoom
      if (e.button === 2) {
        const viewport = getViewport(element);
        if (!viewport) return;
        let scale = viewport.scale || 1;
        let lastY = startY;
        const onMove = (ev: MouseEvent) => {
          const dy = ev.clientY - lastY;
          lastY = ev.clientY;
          const vp = getViewport(element);
          if (!vp) return;
          const factor = Math.pow(1.0015, -dy);
          vp.scale = Math.min(8, Math.max(0.1, (vp.scale || scale) * factor));
          setViewport(element, vp);
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        return;
      }
    },
    [
      interactionsEnabled,
      isActive,
      viewportRef,
      onCrosshairChange,
      getViewport,
      setViewport,
    ]
  );

  const handleMouseMove = useCallback(() => {}, []);

  useEffect(() => {
    initializeViewport();
  }, [initializeViewport]);

  useEffect(() => {
    if (isInitialized && images.length > 0) {
      const timer = setTimeout(() => {
        loadCurrentImage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    isInitialized,
    currentSlice,
    windowCenter,
    windowWidth,
    images.length,
    loadCurrentImage,
  ]);

  useEffect(() => {
    if (viewportRef.current) {
      resize(viewportRef.current);
    }
  }, [images.length]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    element.addEventListener("wheel", handleWheelStack, { passive: false });
    return () => {
      element.removeEventListener("wheel", handleWheelStack);
    };
  }, [handleWheelStack]);

  const getViewTypeLabel = () => {
    switch (viewType) {
      case "axial":
        return "Axial View";
      case "coronal":
        return "Coronal View";
      case "sagittal":
        return "Sagittal View";
      default:
        return "Unknown View";
    }
  };

  return (
    <div
      className={`rounded-md bg-gray-50 border ${
        isActive ? "border-blue-400" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
        <h3 className="m-0 text-sm font-semibold text-gray-800">
          {getViewTypeLabel()}
        </h3>
        <div className="text-xs text-gray-600 font-medium">
          {images.length > 0 && (
            <span>
              {currentSlice + 1} / {images.length}
            </span>
          )}
        </div>
      </div>

      <div className="relative min-h-[300px] bg-black flex items-center justify-center">
        <div
          ref={viewportRef}
          className={`${
            isLoading ? "opacity-70" : ""
          } w-full h-full cursor-crosshair relative`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onContextMenu={(ev) => ev.preventDefault()}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          style={{ width: "512px", height: "512px" }}
        />
        {showCrosshair && isActive && (
          <CrosshairOverlay
            isActive={isActive}
            crosshairPosition={crosshairPosition}
            viewType={viewType}
            onPositionChange={onCrosshairChange}
            onReferenceLineDrag={onReferenceLineDrag}
            onSlabThicknessChange={onSlabThicknessChange}
            onAxesRotate={onAxesRotate}
          />
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="w-8 h-8 border-2 border-white border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSliceChange(Math.max(0, currentSlice - 1))}
            disabled={currentSlice === 0 || isLoading}
            className="min-w-10 rounded bg-blue-600 text-white px-3 py-1 disabled:bg-gray-400"
          >
            ←
          </button>
          <input
            type="range"
            min="0"
            max={Math.max(0, images.length - 1)}
            value={currentSlice}
            onChange={(e) => onSliceChange(parseInt(e.target.value))}
            disabled={isLoading}
            className="flex-1 h-2 rounded bg-gray-300"
          />
          <button
            onClick={() =>
              onSliceChange(Math.min(images.length - 1, currentSlice + 1))
            }
            disabled={currentSlice === images.length - 1 || isLoading}
            className="min-w-10 rounded bg-blue-600 text-white px-3 py-1 disabled:bg-gray-400"
          >
            →
          </button>
        </div>

        <div className="mt-3">
          <WindowLevelControls
            windowCenter={windowCenter}
            windowWidth={windowWidth}
            onWindowLevelChange={onWindowLevelChange}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default DicomViewport;
