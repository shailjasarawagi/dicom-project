declare module "cornerstone-core" {
  interface Image {
    imageId: string;
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number;
    windowWidth: number;
    getPixelData(): Uint8Array | Uint16Array;
    getWidth(): number;
    getHeight(): number;
    getPixelSpacing(): number[];
    getImageOrientationPatient(): number[];
    getImagePositionPatient(): number[];
  }

  interface Viewport {
    scale: number;
    translation: {
      x: number;
      y: number;
    };
    voi: {
      windowWidth: number;
      windowCenter: number;
    };
    invert: boolean;
    pixelReplication: boolean;
    rotation: number;
    hflip: boolean;
    vflip: boolean;
  }

  interface Element extends HTMLElement {
    cornerstone?: {
      enabled: boolean;
      image?: Image;
      viewport?: Viewport;
    };
  }

  function enable(element: Element): void;
  function disable(element: Element): void;
  function loadImage(imageId: string): Promise<Image>;
  function displayImage(element: Element, image: Image): Promise<void>;
  function setViewport(element: Element, viewport: Viewport): void;
  function getViewport(element: Element): Viewport;
  function resize(element: Element): void;
  function registerImageLoader(
    scheme: string,
    imageLoader: (imageId: string) => Promise<Image>
  ): void;
  function getEnabledElements(): Element[];

  const external: {
    cornerstone: typeof cornerstone;
    dicomParser: any;
  };

  export = cornerstone;
}

declare module "cornerstone-wado-image-loader" {
  interface WebWorkerManager {
    initialize(config: any): void;
  }

  interface WADOImageLoader {
    loadImage(imageId: string): Promise<any>;
  }

  interface CornerstoneWADOImageLoader {
    external: {
      cornerstone: any;
      dicomParser: any;
    };
    webWorkerManager: WebWorkerManager;
    wadouri: WADOImageLoader;
  }

  const cornerstoneWADOImageLoader: CornerstoneWADOImageLoader;
  export = cornerstoneWADOImageLoader;
}
