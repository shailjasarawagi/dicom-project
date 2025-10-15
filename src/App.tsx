import { useCallback } from "react";
import FileUpload from "./components/FileUpload/FileUpload";
import DicomViewer from "./components/DicomViewer/DicomViewer";
import LoadingProgress from "./components/LoadingProgress/LoadingProgress";
import { useDicomParser } from "./hooks/useDicomParser";

function App() {
  const {
    series,
    isLoading,
    error,
    hasLoaded,
    loadingProgress,
    loadingMessage,
    parseZipFile,
    reset,
  } = useDicomParser();

  const handleFileSelect = useCallback(
    async (file: File) => {
      await parseZipFile(file);
    },
    [parseZipFile]
  );

  const handleError = useCallback((errorMessage: string) => {
    console.error(errorMessage);
  }, []);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-800">
      <header className="w-full bg-white border-b border-gray-200 shadow-sm p-4 md:p-6 flex flex-col items-center gap-2">
        <h1 className="text-2xl font-semibold">DICOM 2D Viewer</h1>
        <p className="text-sm text-gray-600">
          Upload a ZIP file containing DICOM files to view them in three
          orthogonal views
        </p>
      </header>

      <main className="flex-1 w-full p-4 md:p-6">
        {!hasLoaded ? (
          <div className="max-w-5xl mx-auto">
            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <h3 className="font-semibold text-red-700 mb-1">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={handleReset}
                  className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleReset}
                className="inline-flex items-center rounded-md bg-gray-800 px-3 py-2 text-white hover:bg-gray-700"
              >
                Load New File
              </button>
            </div>
            <DicomViewer series={series} onError={handleError} />
          </div>
        )}
      </main>

      <LoadingProgress
        progress={loadingProgress}
        message={loadingMessage}
        isVisible={isLoading}
      />
    </div>
  );
}

export default App;
