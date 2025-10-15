## Project Plan and Execution

### 1) Goals

- Build a client-side DICOM 2D viewer (axial, coronal, sagittal) with basic controls.
- Allow uploading a ZIP of DICOM files and group images into series.
- Provide clean React abstractions with a reusable parsing hook and modular components.

### 2) Architecture Overview

- UI: React + Tailwind CSS.
- Imaging Core: Cornerstone (core + WADO image loader), dicom-parser, JSZip.
- Modules:
  - `hooks/useDicomParser.ts`: ZIP parsing, progress reporting, plane classification, series output.
  - `utils/cornerstoneInit.ts`: Cornerstone setup, custom image loader bridging cached bytes to wadouri, viewport helpers.
  - Components: `FileUpload`, `DicomViewer`, `DicomViewport`, `WindowLevelControls`, `CrosshairOverlay`, `LoadingProgress`.
- Types: `types/dicom.ts` for images, series, and view types.

### 3) Phased Plan

1. Skeleton UI
   - App shell with `FileUpload` and placeholder viewer.
2. DICOM Parsing
   - Initially implemented a `DicomZipParser` class; later migrated to a React hook to simplify usage and state.
3. Cornerstone Integration
   - Initialize cornerstone, wire WADO loader externals, implement a custom `dicom:` image loader that feeds bytes via temporary blob URLs to `wadouri:`.
4. Viewports and Controls
   - Create three synchronized viewports, support slice navigation, and window/level controls.
5. Crosshair Overlay (UI scaffolding)
   - Draw crosshair, emit reference line and slab/rotation callbacks; keep rendering/interaction minimal while ready for future MIP/orientation.
6. Polish & Docs
   - Add progress UI, error handling, README, and in-code links to official Cornerstone docs.

### 4) Implementation Summary

- Parsing moved into `useDicomParser`:
  - Uses JSZip to enumerate ZIP entries.
  - Filters valid DICOMs by DICM preamble or early dicom-parser probe.
  - Stores bytes in cornerstone cache via `storeDicomData` for later loading.
  - Extracts tags for geometry and VOI; classifies planes using IOP normals; sorts stacks.
  - Exposes `parseZipFile`, `series`, `isLoading`, `error`, `hasLoaded`, `loadingProgress`, `loadingMessage`, `reset`.
- Cornerstone utilities:
  - Register custom `dicom:` loader; transform to `wadouri:` with blob URLs; load via `cornerstone.loadImage`.
  - Helpers: `createViewport`, `displayImage`, `getViewport`, `setViewport`, `resize`.
- UI wiring:
  - `App.tsx` now uses `useDicomParser` instead of manual class.
  - `DicomViewer` sets up three `DicomViewport` instances and synchronizes slice selection.
  - `WindowLevelControls` controls VOI; `LoadingProgress` shows parse progress; `FileUpload` triggers parsing.

### 5) Key Decisions

- Prefer a React hook over a class for parsing to co-locate async flow and progress state.
- Keep plane classification simple and deterministic with IOP-derived normals and sensible fallbacks.
- Use a minimal custom loader to keep data fully client-side without servers.

### 6) References (Official Docs)

- Cornerstone Getting Started: https://github.com/cornerstonejs/cornerstone/wiki/Getting-Started
- Cornerstone Viewport: https://github.com/cornerstonejs/cornerstone/wiki/Viewport
- Cornerstone Loading Images: https://github.com/cornerstonejs/cornerstone/wiki/Loading-Images
- Cornerstone Image Loaders: https://github.com/cornerstonejs/cornerstone/wiki/Image-Loaders
- WADO Image Loader README: https://github.com/cornerstonejs/cornerstoneWADOImageLoader
- WADOURI scheme: https://github.com/cornerstonejs/cornerstoneWADOImageLoader#wadouri
- WADO Loader externals: https://github.com/cornerstonejs/cornerstoneWADOImageLoader#externals

### 7) Future Work

- Add real tool integrations (pan/zoom bindings, window/level mouse tools) using cornerstone tools package.
- MIP and slab rendering, 3D reformat previews.
- Multi-series selection UI and metadata panels.
- Persist last session and recent files in IndexedDB.
