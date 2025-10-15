import React, { useCallback, useState, useRef } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const zipFile = files.find((file) =>
        file.name.toLowerCase().endsWith(".zip")
      );

      if (zipFile) {
        onFileSelect(zipFile);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.name.toLowerCase().endsWith(".zip")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition ${
          isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
        } ${isLoading ? "opacity-70 pointer-events-none" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Processing DICOM files...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">📁</div>
            <h3 className="text-lg font-semibold">Upload DICOM ZIP File</h3>
            <p className="text-sm text-gray-600">
              Drag and drop a ZIP file containing DICOM files here, or click to
              browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileInput}
              className="hidden"
              disabled={isLoading}
            />
            <button
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
              onClick={handleBrowseClick}
              disabled={isLoading}
            >
              Browse Files
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
