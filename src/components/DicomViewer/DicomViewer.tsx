import React, { useState, useEffect, useCallback } from "react";
import DicomViewport from "../DicomViewport/DicomViewport";
import type { DicomSeries, ViewType, ViewportState } from "../../types/dicom";
import { initializeCornerstone } from "../../utils/cornerstoneInit";

interface DicomViewerProps {
  series: DicomSeries[];
  onError: (error: string) => void;
}

const DicomViewer: React.FC<DicomViewerProps> = ({ series, onError }) => {
  const [currentSeries, setCurrentSeries] = useState<DicomSeries | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("axial");
  const [viewportStates, setViewportStates] = useState<
    Record<ViewType, ViewportState>
  >({
    axial: { currentSlice: 0, totalSlices: 0, windowCenter: 0, windowWidth: 0 },
    coronal: {
      currentSlice: 0,
      totalSlices: 0,
      windowCenter: 0,
      windowWidth: 0,
    },
    sagittal: {
      currentSlice: 0,
      totalSlices: 0,
      windowCenter: 0,
      windowWidth: 0,
    },
  });
  const [crosshairPosition, setCrosshairPosition] = useState({ x: 50, y: 50 });
  const [selectedTool, setSelectedTool] = useState<"none" | "crosshair">(
    "none"
  );

  useEffect(() => {
    initializeCornerstone().catch((error) => {
      onError(`Failed to initialize DICOM viewer: ${error.message}`);
    });
  }, [onError]);

  useEffect(() => {
    if (series.length > 0 && !currentSeries) {
      setCurrentSeries(series[0]);
    }
  }, [series, currentSeries]);

  useEffect(() => {
    if (currentSeries) {
      setViewportStates({
        axial: {
          currentSlice: 0,
          totalSlices: currentSeries.axialImages.length,
          windowCenter: currentSeries.axialImages[0]?.windowCenter || 0,
          windowWidth: currentSeries.axialImages[0]?.windowWidth || 0,
        },
        coronal: {
          currentSlice: 0,
          totalSlices: currentSeries.coronalImages.length,
          windowCenter: currentSeries.coronalImages[0]?.windowCenter || 0,
          windowWidth: currentSeries.coronalImages[0]?.windowWidth || 0,
        },
        sagittal: {
          currentSlice: 0,
          totalSlices: currentSeries.sagittalImages.length,
          windowCenter: currentSeries.sagittalImages[0]?.windowCenter || 0,
          windowWidth: currentSeries.sagittalImages[0]?.windowWidth || 0,
        },
      });
    }
  }, [currentSeries]);

  const handleSliceChange = useCallback((viewType: ViewType, slice: number) => {
    setViewportStates((prev) => ({
      ...prev,
      [viewType]: {
        ...prev[viewType],
        currentSlice: slice,
      },
    }));
  }, []);

  const handleWindowLevelChange = useCallback(
    (viewType: ViewType, center: number, width: number) => {
      setViewportStates((prev) => ({
        ...prev,
        [viewType]: {
          ...prev[viewType],
          windowCenter: center,
          windowWidth: width,
        },
      }));
    },
    []
  );

  const handleViewClick = useCallback((viewType: ViewType) => {
    setActiveView(viewType);
  }, []);

  const handleCrosshairChange = useCallback((x: number, y: number) => {
    setCrosshairPosition({ x, y });
  }, []);

  const handleMouseEnter = useCallback(() => {}, []);
  const handleMouseLeave = useCallback(() => {}, []);

  const handleReferenceLineDrag = useCallback(
    (source: ViewType, axis: "x" | "y", percent: number) => {
      const clampPercent = Math.max(0, Math.min(100, percent));
      const pickIndex = (total: number) =>
        Math.round((clampPercent / 100) * Math.max(0, total - 1));

      setViewportStates((prev) => {
        const next = { ...prev } as typeof prev;
        const setSlice = (vt: ViewType) => {
          const total = prev[vt].totalSlices || 0;
          next[vt] = { ...prev[vt], currentSlice: pickIndex(total) };
        };

        if (source === "axial") {
          if (axis === "x") setSlice("sagittal");
          else setSlice("coronal");
        } else if (source === "coronal") {
          if (axis === "x") setSlice("sagittal");
          else setSlice("axial");
        } else if (source === "sagittal") {
          if (axis === "x") setSlice("coronal");
          else setSlice("axial");
        }
        return next;
      });
    },
    []
  );

  const handleSlabThicknessChange = useCallback((delta: number) => {
    console.log("Slab thickness delta", delta);
  }, []);

  const handleAxesRotate = useCallback((deltaDegrees: number) => {
    console.log("Axes rotate delta", deltaDegrees);
  }, []);

  if (!currentSeries) {
    return (
      <div className="w-full min-h-[50vh] flex items-center justify-center text-gray-600">
        <div className="text-center">
          <p className="text-base">No DICOM series available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between rounded-md bg-white border border-gray-200 shadow-sm p-4 mb-4">
        <h2 className="text-xl font-semibold">DICOM Viewer</h2>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="px-2 py-1 rounded border bg-gray-50">
            Images: {currentSeries.images.length}
          </span>
          <div className="ml-4 flex items-center gap-2">
            <button
              className={`px-2 py-1 rounded border ${
                selectedTool === "crosshair"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
              onClick={() =>
                setSelectedTool(
                  selectedTool === "crosshair" ? "none" : "crosshair"
                )
              }
            >
              Crosshair Tool
            </button>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div
            className={`rounded-lg overflow-hidden border ${
              activeView === "axial" ? "ring-2 ring-blue-400" : ""
            }`}
            onClick={() => handleViewClick("axial")}
          >
            <DicomViewport
              images={currentSeries.axialImages}
              viewType="axial"
              currentSlice={viewportStates.axial.currentSlice}
              onSliceChange={(slice) => handleSliceChange("axial", slice)}
              windowCenter={viewportStates.axial.windowCenter}
              windowWidth={viewportStates.axial.windowWidth}
              onWindowLevelChange={(center, width) =>
                handleWindowLevelChange("axial", center, width)
              }
              isActive={activeView === "axial"}
              crosshairPosition={crosshairPosition}
              showCrosshair={selectedTool === "crosshair"}
              onCrosshairChange={handleCrosshairChange}
              onReferenceLineDrag={(axis, percent) =>
                handleReferenceLineDrag("axial", axis, percent)
              }
              onSlabThicknessChange={handleSlabThicknessChange}
              onAxesRotate={handleAxesRotate}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          </div>

          <div
            className={`rounded-lg overflow-hidden border ${
              activeView === "coronal" ? "ring-2 ring-blue-400" : ""
            }`}
            onClick={() => handleViewClick("coronal")}
          >
            <DicomViewport
              images={currentSeries.coronalImages}
              viewType="coronal"
              currentSlice={viewportStates.coronal.currentSlice}
              onSliceChange={(slice) => handleSliceChange("coronal", slice)}
              windowCenter={viewportStates.coronal.windowCenter}
              windowWidth={viewportStates.coronal.windowWidth}
              onWindowLevelChange={(center, width) =>
                handleWindowLevelChange("coronal", center, width)
              }
              isActive={activeView === "coronal"}
              crosshairPosition={crosshairPosition}
              showCrosshair={selectedTool === "crosshair"}
              onCrosshairChange={handleCrosshairChange}
              onReferenceLineDrag={(axis, percent) =>
                handleReferenceLineDrag("coronal", axis, percent)
              }
              onSlabThicknessChange={handleSlabThicknessChange}
              onAxesRotate={handleAxesRotate}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          </div>

          <div
            className={`rounded-lg overflow-hidden border ${
              activeView === "sagittal" ? "ring-2 ring-blue-400" : ""
            }`}
            onClick={() => handleViewClick("sagittal")}
          >
            <DicomViewport
              images={currentSeries.sagittalImages}
              viewType="sagittal"
              currentSlice={viewportStates.sagittal.currentSlice}
              onSliceChange={(slice) => handleSliceChange("sagittal", slice)}
              windowCenter={viewportStates.sagittal.windowCenter}
              windowWidth={viewportStates.sagittal.windowWidth}
              onWindowLevelChange={(center, width) =>
                handleWindowLevelChange("sagittal", center, width)
              }
              isActive={activeView === "sagittal"}
              crosshairPosition={crosshairPosition}
              showCrosshair={selectedTool === "crosshair"}
              onCrosshairChange={handleCrosshairChange}
              onReferenceLineDrag={(axis, percent) =>
                handleReferenceLineDrag("sagittal", axis, percent)
              }
              onSlabThicknessChange={handleSlabThicknessChange}
              onAxesRotate={handleAxesRotate}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DicomViewer;
