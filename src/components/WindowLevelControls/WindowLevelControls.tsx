import React, { useState, useEffect } from "react";

interface WindowLevelControlsProps {
  windowCenter: number;
  windowWidth: number;
  onWindowLevelChange: (center: number, width: number) => void;
  disabled?: boolean;
}

const WindowLevelControls: React.FC<WindowLevelControlsProps> = ({
  windowCenter,
  windowWidth,
  onWindowLevelChange,
  disabled = false,
}) => {
  const [center, setCenter] = useState(windowCenter);
  const [width, setWidth] = useState(windowWidth);

  useEffect(() => {
    setCenter(windowCenter);
    setWidth(windowWidth);
  }, [windowCenter, windowWidth]);

  const handleCenterChange = (value: number) => {
    setCenter(value);
    onWindowLevelChange(value, width);
  };

  const handleWidthChange = (value: number) => {
    setWidth(value);
    onWindowLevelChange(center, value);
  };

  const resetToDefault = () => {
    const defaultCenter = 0;
    const defaultWidth = 0;
    setCenter(defaultCenter);
    setWidth(defaultWidth);
    onWindowLevelChange(defaultCenter, defaultWidth);
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="m-0 text-gray-800 font-semibold">Window/Level</h4>
        <button
          onClick={resetToDefault}
          disabled={disabled}
          className="rounded bg-gray-600 text-white px-3 py-1 text-sm disabled:bg-gray-300"
        >
          Reset
        </button>
      </div>

      <div className="mb-4">
        <label
          htmlFor="window-center"
          className="block mb-2 text-sm text-gray-700 font-medium"
        >
          Center:{" "}
          <span className="text-blue-600 font-semibold font-mono">
            {Math.round(center)}
          </span>
        </label>
        <input
          id="window-center"
          type="range"
          min="-2000"
          max="2000"
          step="1"
          value={center}
          onChange={(e) => handleCenterChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-2 rounded bg-gray-300 disabled:bg-gray-200"
        />
      </div>

      <div className="mb-2">
        <label
          htmlFor="window-width"
          className="block mb-2 text-sm text-gray-700 font-medium"
        >
          Width:{" "}
          <span className="text-blue-600 font-semibold font-mono">
            {Math.round(width)}
          </span>
        </label>
        <input
          id="window-width"
          type="range"
          min="1"
          max="4000"
          step="1"
          value={width}
          onChange={(e) => handleWidthChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-2 rounded bg-gray-300 disabled:bg-gray-200"
        />
      </div>
    </div>
  );
};

export default WindowLevelControls;
