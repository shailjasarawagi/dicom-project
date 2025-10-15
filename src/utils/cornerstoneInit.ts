import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";

// Official Cornerstone documentation:
// - Getting Started (enable/displayImage): https://github.com/cornerstonejs/cornerstone/wiki/Getting-Started
// - Viewport (getViewport/setViewport/resize/VOI): https://github.com/cornerstonejs/cornerstone/wiki/Viewport
// - Loading Images (loadImage and imageIds): https://github.com/cornerstonejs/cornerstone/wiki/Loading-Images
// - Image Loaders (registerImageLoader): https://github.com/cornerstonejs/cornerstone/wiki/Image-Loaders
// - WADO Image Loader README: https://github.com/cornerstonejs/cornerstoneWADOImageLoader
// - WADOURI scheme: https://github.com/cornerstonejs/cornerstoneWADOImageLoader#wadouri
// - WADO Loader externals: https://github.com/cornerstonejs/cornerstoneWADOImageLoader#externals

const dicomDataCache = new Map<string, ArrayBuffer>();

// Wire external dependencies for the WADO image loader
// Docs: WADO Loader externals
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

// Custom loader for our cached DICOM bytes, exposed via the "dicom:" scheme
// Docs: Image Loaders (custom loaders)
const customDicomLoader = (imageId: string) => {
  return new Promise((resolve, reject) => {
    try {
      const filename = imageId.replace("dicom:", "");
      let arrayBuffer = dicomDataCache.get(filename);
      if (!arrayBuffer) {
        for (const [key, value] of dicomDataCache.entries()) {
          if (key.includes(filename) || filename.includes(key)) {
            arrayBuffer = value;
            break;
          }
        }
      }

      if (!arrayBuffer) {
        return reject(new Error(`No cached DICOM for ${filename}`));
      }
      const blob = new Blob([arrayBuffer], { type: "application/dicom" });
      const blobUrl = URL.createObjectURL(blob);
      const wadoImageId = `wadouri:${blobUrl}`; // Docs: WADOURI scheme

      // Docs: Loading Images → cornerstone.loadImage
      cornerstone
        .loadImage(wadoImageId)
        .then((image: any) => {
          resolve(image);
        })
        .catch((error: any) => {
          console.error(`WADO load failed for ${wadoImageId}:`, error);
          reject(error);
        })
        .finally(() => URL.revokeObjectURL(blobUrl));
    } catch (error) {
      console.error(`Error in custom DICOM loader for ${imageId}:`, error);
      reject(error);
    }
  });
};

// Docs: Image Loaders → cornerstone.registerImageLoader
cornerstone.registerImageLoader("dicom", customDicomLoader);
cornerstone.registerImageLoader(
  "wadouri",
  cornerstoneWADOImageLoader.wadouri.loadImage
);

export const storeDicomData = (
  filename: string,
  arrayBuffer: ArrayBuffer
): void => {
  dicomDataCache.set(filename, arrayBuffer);
};

export const clearDicomData = (): void => {
  dicomDataCache.clear();
};

export const initializeCornerstone = async (): Promise<void> => {
  try {
    console.log("Cornerstone initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Cornerstone:", error);
    throw error;
  }
};

export const createViewport = (element: HTMLDivElement): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      // Docs: Getting Started → cornerstone.enable
      cornerstone.enable(element);
      resolve(element);
    } catch (error) {
      reject(error);
    }
  });
};

export const loadDicomImage = async (imageId: string): Promise<any> => {
  try {
    if (imageId.startsWith("dicom:")) {
      return await customDicomLoader(imageId);
    }
    // Docs: Loading Images → cornerstone.loadImage
    const image = await cornerstone.loadImage(imageId);
    return image;
  } catch (error) {
    console.error("Failed to load DICOM image:", error);
    throw error;
  }
};

export const displayImage = async (
  element: HTMLDivElement,
  imageId: string
): Promise<void> => {
  try {
    const image = await loadDicomImage(imageId);
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      element.style.width = "512px";
      element.style.height = "512px";
    }

    // Docs: Getting Started → cornerstone.displayImage
    await cornerstone.displayImage(element, image);
    const canvas = element.querySelector("canvas");

    if (canvas) {
      console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
    }

    // Docs: Viewport → getViewport / setViewport
    const viewport = cornerstone.getViewport(element);
    if (viewport) {
      viewport.voi.windowCenter = image.windowCenter || 2048;
      viewport.voi.windowWidth = image.windowWidth || 4095;
      viewport.scale = 1.0;
      viewport.translation = { x: 0, y: 0 };

      viewport.rotation = 0;
      viewport.hflip = false;
      viewport.vflip = false;
      cornerstone.setViewport(element, viewport);
      // Docs: Viewport → resize
      cornerstone.resize(element);
    }
  } catch (error) {
    console.error("Failed to display image:", error);
    throw error;
  }
};

export const setViewport = (element: HTMLDivElement, viewport: any): void => {
  try {
    // Docs: Viewport → setViewport
    cornerstone.setViewport(element, viewport);
  } catch (error) {
    console.error("Failed to set viewport:", error);
    throw error;
  }
};

export const getViewport = (element: HTMLDivElement): any => {
  try {
    // Docs: Viewport → getViewport
    return cornerstone.getViewport(element);
  } catch (error) {
    console.error("Failed to get viewport:", error);
    throw error;
  }
};

export const resize = (element: HTMLDivElement): void => {
  try {
    // Docs: Viewport → resize
    cornerstone.resize(element);
  } catch (error) {
    console.error("Failed to resize viewport:", error);
    throw error;
  }
};
