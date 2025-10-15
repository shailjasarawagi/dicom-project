import { useCallback, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import dicomParser from "dicom-parser";
import { storeDicomData } from "../utils/cornerstoneInit";
import type { DicomImage, DicomSeries } from "../types/dicom";

export function useDicomParser() {
  const [series, setSeries] = useState<DicomSeries[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");

  const zipRef = useRef<JSZip | null>(null);

  const ensureZip = useCallback(() => {
    if (!zipRef.current) {
      zipRef.current = new JSZip();
    }
    return zipRef.current;
  }, []);

  const getImagePositionPatient = (dataSet: any): number[] => {
    const element = dataSet.elements["x00200032"];
    if (element && element.length >= 3) {
      return [
        dataSet.float("x00200032", 0) || 0,
        dataSet.float("x00200032", 1) || 0,
        dataSet.float("x00200032", 2) || 0,
      ];
    }
    return [0, 0, 0];
  };

  const getImageOrientationPatient = (dataSet: any): number[] => {
    const element = dataSet.elements["x00200037"];
    if (element && element.length >= 6) {
      return [
        dataSet.float("x00200037", 0) || 0,
        dataSet.float("x00200037", 1) || 0,
        dataSet.float("x00200037", 2) || 0,
        dataSet.float("x00200037", 3) || 0,
        dataSet.float("x00200037", 4) || 0,
        dataSet.float("x00200037", 5) || 0,
      ];
    }
    return [1, 0, 0, 0, 1, 0];
  };

  const getPixelSpacing = (dataSet: any): number[] => {
    const element = dataSet.elements["x00280030"];
    if (element && element.length >= 2) {
      return [
        dataSet.float("x00280030", 0) || 1,
        dataSet.float("x00280030", 1) || 1,
      ];
    }
    return [1, 1];
  };

  const parseDicomFile = (
    arrayBuffer: ArrayBuffer,
    filename: string
  ): DicomImage | null => {
    try {
      const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));
      return {
        imageId: `dicom:${filename}`,
        instanceNumber: dataSet.uint16("x00200013") || 0,
        sliceLocation: dataSet.float("x00201041") || 0,
        imagePositionPatient: getImagePositionPatient(dataSet),
        imageOrientationPatient: getImageOrientationPatient(dataSet),
        pixelSpacing: getPixelSpacing(dataSet),
        rows: dataSet.uint16("x00280010") || 0,
        columns: dataSet.uint16("x00280011") || 0,
        bitsAllocated: dataSet.uint16("x00280100") || 16,
        samplesPerPixel: dataSet.uint16("x00280002") || 1,
        photometricInterpretation: dataSet.string("x00280004") || "MONOCHROME2",
        windowCenter: dataSet.float("x00281050") || 0,
        windowWidth: dataSet.float("x00281051") || 0,
        rescaleIntercept: dataSet.float("x00281052") || 0,
        rescaleSlope: dataSet.float("x00281053") || 1,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to parse DICOM file ${filename}:`, error);
      return null;
    }
  };

  const getSeriesInstanceUID = (arrayBuffer: ArrayBuffer): string | null => {
    try {
      const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));
      return dataSet.string("x0020000e") || null;
    } catch {
      return null;
    }
  };

  const sortImagesByPosition = (images: DicomImage[]): DicomImage[] =>
    images.sort((a, b) => a.sliceLocation - b.sliceLocation);

  const classifyPlanes = (
    images: DicomImage[]
  ): {
    axialImages: DicomImage[];
    coronalImages: DicomImage[];
    sagittalImages: DicomImage[];
  } => {
    const axial: DicomImage[] = [];
    const coronal: DicomImage[] = [];
    const sagittal: DicomImage[] = [];

    const isClose = (a: number, b: number, eps = 0.1) => Math.abs(a - b) < eps;

    for (const img of images) {
      const iop = img.imageOrientationPatient || [1, 0, 0, 0, 1, 0];
      const row = [iop[0], iop[1], iop[2]];
      const col = [iop[3], iop[4], iop[5]];

      const normal = [
        row[1] * col[2] - row[2] * col[1],
        row[2] * col[0] - row[0] * col[2],
        row[0] * col[1] - row[1] * col[0],
      ];

      const magnitude = Math.sqrt(
        normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2
      );
      const normalized =
        magnitude > 0 ? normal.map((v) => v / magnitude) : [0, 0, 1];

      if (isClose(Math.abs(normalized[2]), 1)) {
        axial.push(img);
      } else if (isClose(Math.abs(normalized[1]), 1)) {
        coronal.push(img);
      } else if (isClose(Math.abs(normalized[0]), 1)) {
        sagittal.push(img);
      } else {
        const maxComponent = Math.max(
          Math.abs(normalized[0]),
          Math.abs(normalized[1]),
          Math.abs(normalized[2])
        );
        if (maxComponent === Math.abs(normalized[2])) {
          axial.push(img);
        } else if (maxComponent === Math.abs(normalized[1])) {
          coronal.push(img);
        } else {
          sagittal.push(img);
        }
      }
    }

    const orderBy = (arr: DicomImage[], axisIndex: 0 | 1 | 2) =>
      arr.sort(
        (a, b) =>
          (a.imagePositionPatient[axisIndex] || 0) -
          (b.imagePositionPatient[axisIndex] || 0)
      );

    if (axial.length === 0 && (coronal.length > 0 || sagittal.length > 0))
      axial.push(...images.slice());
    if (coronal.length === 0 && (axial.length > 0 || sagittal.length > 0))
      coronal.push(...images.slice());
    if (sagittal.length === 0 && (axial.length > 0 || coronal.length > 0))
      sagittal.push(...images.slice());

    orderBy(axial, 2);
    orderBy(coronal, 1);
    orderBy(sagittal, 0);

    return {
      axialImages: axial,
      coronalImages: coronal,
      sagittalImages: sagittal,
    };
  };

  const parseZipFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      setHasLoaded(false);
      setLoadingProgress(0);
      setLoadingMessage("");

      try {
        const zip = ensureZip();
        setLoadingProgress(10);
        setLoadingMessage("Loading ZIP file...");
        const zipData = await zip.loadAsync(file);

        const dicomFiles: DicomImage[] = [];
        const seriesMap = new Map<string, DicomImage[]>();

        const fileEntries = Object.entries(zipData.files).filter(
          ([, f]) => !f.dir
        );
        setLoadingProgress(20);
        setLoadingMessage(`Found ${fileEntries.length} files in ZIP`);

        let processedCount = 0;
        for (let i = 0; i < fileEntries.length; i++) {
          const [filename, zipEntry] = fileEntries[i];
          const progress = 20 + (i / fileEntries.length) * 60;
          setLoadingProgress(progress);
          setLoadingMessage(`Processing ${filename}...`);
          try {
            const arrayBuffer = await zipEntry.async("arraybuffer");

            const bytes = new Uint8Array(arrayBuffer);
            const hasDICM =
              bytes.length > 132 &&
              bytes[128] === 0x44 &&
              bytes[129] === 0x49 &&
              bytes[130] === 0x43 &&
              bytes[131] === 0x4d;

            let parsedOk = false;
            try {
              const dataSet = dicomParser.parseDicom(bytes, {
                untilTag: "x00020010",
              });
              parsedOk = !!dataSet;
            } catch {}

            if (!hasDICM && !parsedOk) {
              continue;
            }

            storeDicomData(filename, arrayBuffer);

            const justFilename = filename.split("/").pop() || filename;
            if (justFilename !== filename) {
              storeDicomData(justFilename, arrayBuffer);
            }

            const dicomImage = parseDicomFile(arrayBuffer, justFilename);
            if (dicomImage) {
              processedCount += 1;
              dicomFiles.push(dicomImage);

              const seriesUID = getSeriesInstanceUID(arrayBuffer);
              if (seriesUID) {
                if (!seriesMap.has(seriesUID)) seriesMap.set(seriesUID, []);
                seriesMap.get(seriesUID)!.push(dicomImage);
              }
            }
          } catch (innerError) {
            // eslint-disable-next-line no-console
            console.warn(`Failed to parse DICOM file ${filename}:`, innerError);
          }
        }

        setLoadingProgress(85);
        setLoadingMessage(
          `Organizing series... (${processedCount} DICOM files)`
        );

        const out: DicomSeries[] = [];
        for (const [seriesUID, images] of seriesMap.entries()) {
          if (images.length > 0) {
            const sortedImages = sortImagesByPosition(images);
            const { axialImages, coronalImages, sagittalImages } =
              classifyPlanes(sortedImages);
            out.push({
              seriesInstanceUID: seriesUID,
              seriesDescription: "DICOM Series",
              modality: "CT",
              images: sortedImages,
              axialImages,
              coronalImages,
              sagittalImages,
            });
          }
        }

        setLoadingProgress(100);
        setLoadingMessage(`Successfully processed ${out.length} series`);

        if (out.length === 0)
          throw new Error("No valid DICOM files found in the ZIP archive");

        setSeries(out);
        setHasLoaded(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to process DICOM files";
        setError(errorMessage);
        // eslint-disable-next-line no-console
        console.error("Error processing DICOM files:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [ensureZip]
  );

  const reset = useCallback(() => {
    setSeries([]);
    setError(null);
    setHasLoaded(false);
    setLoadingProgress(0);
    setLoadingMessage("");
  }, []);

  return useMemo(
    () => ({
      series,
      isLoading,
      error,
      hasLoaded,
      loadingProgress,
      loadingMessage,
      parseZipFile,
      reset,
    }),
    [
      series,
      isLoading,
      error,
      hasLoaded,
      loadingProgress,
      loadingMessage,
      parseZipFile,
      reset,
    ]
  );
}

export type UseDicomParserReturn = ReturnType<typeof useDicomParser>;
