export interface DicomImage {
  imageId: string;
  instanceNumber: number;
  sliceLocation: number;
  imagePositionPatient: number[];
  imageOrientationPatient: number[];
  pixelSpacing: number[];
  rows: number;
  columns: number;
  bitsAllocated: number;
  samplesPerPixel: number;
  photometricInterpretation: string;
  windowCenter: number;
  windowWidth: number;
  rescaleIntercept: number;
  rescaleSlope: number;
}

export interface DicomSeries {
  seriesInstanceUID: string;
  seriesDescription: string;
  modality: string;
  images: DicomImage[];
  axialImages: DicomImage[];
  coronalImages: DicomImage[];
  sagittalImages: DicomImage[];
}

export interface ViewportState {
  currentSlice: number;
  totalSlices: number;
  windowCenter: number;
  windowWidth: number;
}

export type ViewType = "axial" | "coronal" | "sagittal";
