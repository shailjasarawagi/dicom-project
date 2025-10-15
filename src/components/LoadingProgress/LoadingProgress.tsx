import React from "react";

interface LoadingProgressProps {
  progress: number;
  message: string;
  isVisible: boolean;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({
  progress,
  message,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-md rounded-lg bg-white shadow p-4">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-800">
            Processing DICOM Files
          </h3>
        </div>

        <div className="mb-3">
          <div className="w-full h-3 rounded bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-700">
          <span className="font-semibold">{Math.round(progress)}%</span>
          <span className="truncate ml-2">{message}</span>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
};

export default LoadingProgress;
