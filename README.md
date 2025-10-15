## DICOM 2D Viewer (React + Cornerstone + Tailwind)

A modern web app for viewing DICOM series in three orthogonal 2D views (Axial, Coronal, Sagittal). Fully client-side using Cornerstone and dicom-parser. Styled with Tailwind CSS.

### Features

- **Upload ZIP of DICOM files** (drag & drop or browse)
- **3 synchronized viewports**: Axial, Coronal, Sagittal
- **Basic viewport controls** (pan/zoom/scroll)
- **Crosshair tool** with reference lines, slab thickness, and rotation handles (callbacks ready to wire to MIP/orientation)
- **Window/Level controls** (center and width sliders)
- **Automatic plane classification** using ImageOrientationPatient (IOP), with sensible fallbacks

### Requirements

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

Open the printed local URL (e.g., http://localhost:5173).

### Project Structure (key files)

```
src/
  App.tsx
  index.css                       # Tailwind directives
  components/
    DicomViewer/DicomViewer.tsx   # Header, tool toggle, 3 views grid
    DicomViewport/DicomViewport.tsx # One viewport (render, controls, input)
    CrosshairOverlay/CrosshairOverlay.tsx # Crosshair lines/handles (Tailwind only)
    WindowLevelControls/WindowLevelControls.tsx
    FileUpload/FileUpload.tsx
    LoadingProgress/LoadingProgress.tsx
  hooks/
    useDicomParser.ts             # ZIP parsing, plane classification, progress state
  utils/
    cornerstoneInit.ts            # Cornerstone init + loaders
  types/
    dicom.ts
```

### How to Use

1. Upload a ZIP containing `.dcm` files (nested folders OK). The app parses DICOM and groups by SeriesInstanceUID.
2. The first series loads into 3 viewports.
3. Click a viewport to activate it; controls target the active one.

The parsing flow is handled by the React hook `useDicomParser`, which provides:

- `parseZipFile(file)` to start parsing
- `series`, `isLoading`, `error`, `hasLoaded` and progress fields `loadingProgress`, `loadingMessage`
- `reset()` to clear state

### Controls

- **Basic (always on):**
  - **Left click**: reserved for selected tool (no-op by default)
  - **Middle click**: pan (drag)
  - **Right click**: zoom (drag up/down; context menu is suppressed)
  - **Mouse wheel**: stack scroll (slice up/down)
- **Window/Level**: use the sliders under the viewport

### Crosshair Tool

- Toggle the tool in the viewer header (button: “Crosshair Tool”).
- When enabled:
  - **Move center**: click/drag anywhere to reposition crosshair center
  - **Reference lines**: drag vertical/horizontal lines to scroll the other two viewports to matching slices
  - **Square handles (near center)**: drag to change slab thickness (emits callback; wire to MIP when ready)
  - **Circle handles (further)**: drag to rotate axes (emits callback; wire to orientation if needed)
- Overlay uses pointer-events only on the interactive parts; basic controls still work underneath.

### Plane Classification

- Uses IOP to compute the slice normal and classify:
  - **Axial**: normal ~ Z
  - **Coronal**: normal ~ Y
  - **Sagittal**: normal ~ X
- Falls back to sorting by geometric axes if a plane is empty (so views are never blank on single-plane series).

### Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview build
- `npm run lint` — run ESLint

### Acknowledgments

- Cornerstone, cornerstone-wado-image-loader
- dicom-parser
- JSZip
- Tailwind CSS
