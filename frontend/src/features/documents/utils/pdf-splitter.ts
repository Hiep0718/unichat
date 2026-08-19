/**
 * Utility functions for browser-side PDF inspection and page-based splitting using pdf-lib.
 */

import { PDFDocument } from 'pdf-lib';

export interface SplitPdfProgress {
  currentPart: number;
  totalParts: number;
  message: string;
}

export interface SplitEstimate {
  pageCount: number;
  estimatedParts: number;
  targetPagesPerPart: number;
}

/**
 * Quick inspection to count total PDF pages in browser memory.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

/**
 * Calculates page chunk distribution to ensure each split PDF file stays under target size (default 15MB).
 */
export function calculateSplitEstimate(fileByteSize: number, pageCount: number, targetSizeMb = 15): SplitEstimate {
  const targetSizeBytes = targetSizeMb * 1024 * 1024;
  const estimatedParts = Math.max(2, Math.ceil(fileByteSize / targetSizeBytes));
  const targetPagesPerPart = Math.max(1, Math.ceil(pageCount / estimatedParts));

  return {
    pageCount,
    estimatedParts,
    targetPagesPerPart,
  };
}

/**
 * Splits a large PDF file into multiple smaller PDF File objects in the browser.
 */
export async function splitPdfFile(
  file: File,
  targetSizeMb = 15,
  onProgress?: (progress: SplitPdfProgress) => void
): Promise<File[]> {
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const { estimatedParts, targetPagesPerPart } = calculateSplitEstimate(file.size, totalPages, targetSizeMb);
  const resultFiles: File[] = [];

  const rawBaseName = file.name.replace(/\.[^/.]+$/, '');
  const sanitizeBaseName = rawBaseName.replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim() || 'Document';

  for (let partIndex = 0; partIndex < estimatedParts; partIndex++) {
    const startPage = partIndex * targetPagesPerPart;
    if (startPage >= totalPages) break;

    const endPage = Math.min(startPage + targetPagesPerPart, totalPages);
    const pageIndices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

    if (onProgress) {
      onProgress({
        currentPart: partIndex + 1,
        totalParts: estimatedParts,
        message: `Đang cắt phần ${partIndex + 1}/${estimatedParts} (Trang ${startPage + 1} – ${endPage})...`,
      });
    }

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const pdfBytes = await newDoc.save();
    const partFileName = `${sanitizeBaseName}_Part${partIndex + 1}.pdf`;

    const splitFile = new File([pdfBytes.buffer as ArrayBuffer], partFileName, {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    resultFiles.push(splitFile);
  }

  return resultFiles;
}
