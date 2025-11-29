import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import pdf from 'pdf-parse';
import logger from '../utils/logger';

// Interface for PDF preview options
interface PdfPreviewOptions {
  width?: number;
  height?: number;
  quality?: number;
  pageNumber?: number;
  format?: 'png' | 'jpeg' | 'webp';
}

// Default options
const DEFAULT_OPTIONS: PdfPreviewOptions = {
  width: 200,
  height: 280,
  quality: 80,
  pageNumber: 1,
  format: 'png',
};

/**
 * Generate a preview thumbnail for PDF file
 * Uses a fallback approach since pdf2pic requires external dependencies (ghostscript/graphicsmagick)
 *
 * This implementation creates a styled placeholder with PDF metadata
 * For full PDF rendering, you would need to install graphicsmagick or use a cloud service
 */
export async function generatePdfPreview(
  pdfPath: string,
  outputPath: string,
  options: PdfPreviewOptions = {}
): Promise<string | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Read PDF to get metadata
    const pdfBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdf(pdfBuffer);

    // Extract metadata
    const pageCount = pdfData.numpages;
    const title = pdfData.info?.Title || path.basename(pdfPath, '.pdf');

    // Create a styled preview using Sharp
    // This creates a placeholder image with PDF icon and metadata
    const svgTemplate = `
    <svg width="${opts.width}" height="${opts.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="icon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)" rx="8" ry="8"/>

      <!-- Border -->
      <rect width="100%" height="100%" fill="none" stroke="#d1d5db" stroke-width="1" rx="8" ry="8"/>

      <!-- PDF Icon -->
      <g transform="translate(${opts.width! / 2 - 30}, ${opts.height! / 2 - 50})">
        <!-- Document shape -->
        <path d="M0 8 C0 3.58 3.58 0 8 0 L38 0 L60 22 L60 72 C60 76.42 56.42 80 52 80 L8 80 C3.58 80 0 76.42 0 72 Z" fill="white" stroke="#d1d5db" stroke-width="1"/>
        <!-- Fold corner -->
        <path d="M38 0 L38 14 C38 18.42 41.58 22 46 22 L60 22" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
        <!-- PDF text -->
        <rect x="8" y="35" width="44" height="20" rx="3" fill="url(#icon)"/>
        <text x="30" y="50" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">PDF</text>
      </g>

      <!-- Page count -->
      <text x="${opts.width! / 2}" y="${opts.height! - 30}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280" text-anchor="middle">${pageCount} стр.</text>

      <!-- Title (truncated) -->
      <text x="${opts.width! / 2}" y="${opts.height! - 12}" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af" text-anchor="middle">
        ${truncateText(title, 25)}
      </text>
    </svg>
    `;

    // Convert SVG to image using Sharp
    const buffer = Buffer.from(svgTemplate);
    const outputFormat = opts.format || 'png';

    let sharpInstance = sharp(buffer);

    if (outputFormat === 'jpeg') {
      await sharpInstance.jpeg({ quality: opts.quality }).toFile(outputPath);
    } else if (outputFormat === 'webp') {
      await sharpInstance.webp({ quality: opts.quality }).toFile(outputPath);
    } else {
      await sharpInstance.png({ quality: opts.quality }).toFile(outputPath);
    }

    logger.info('PDF preview generated', {
      input: pdfPath,
      output: outputPath,
      pages: pageCount,
    });

    return outputPath;
  } catch (error: any) {
    logger.error('Failed to generate PDF preview', {
      error: error.message,
      pdfPath,
    });
    return null;
  }
}

/**
 * Generate preview for any document type
 */
export async function generateDocumentPreview(
  filePath: string,
  outputDir: string,
  options: PdfPreviewOptions = {}
): Promise<string | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const outputPath = path.join(outputDir, `${baseName}_preview.${opts.format}`);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  switch (ext) {
    case '.pdf':
      return generatePdfPreview(filePath, outputPath, opts);

    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.gif':
    case '.webp':
      // For images, just resize
      try {
        await sharp(filePath)
          .resize(opts.width, opts.height, { fit: 'cover', position: 'center' })
          .toFormat(opts.format || 'png')
          .toFile(outputPath);
        return outputPath;
      } catch (error: any) {
        logger.error('Failed to generate image preview', { error: error.message });
        return null;
      }

    case '.doc':
    case '.docx':
      return generateDocPreview(filePath, outputPath, opts, 'Word');

    case '.xls':
    case '.xlsx':
      return generateDocPreview(filePath, outputPath, opts, 'Excel');

    case '.ppt':
    case '.pptx':
      return generateDocPreview(filePath, outputPath, opts, 'PowerPoint');

    case '.txt':
    case '.csv':
      return generateDocPreview(filePath, outputPath, opts, 'Text');

    default:
      return generateDocPreview(filePath, outputPath, opts, 'File');
  }
}

/**
 * Generate generic document preview placeholder
 */
async function generateDocPreview(
  filePath: string,
  outputPath: string,
  options: PdfPreviewOptions,
  docType: string
): Promise<string | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toUpperCase().replace('.', '');

  // Color mapping for different document types
  const colors: Record<string, { start: string; end: string }> = {
    Word: { start: '#2563eb', end: '#1d4ed8' },
    Excel: { start: '#16a34a', end: '#15803d' },
    PowerPoint: { start: '#ea580c', end: '#c2410c' },
    Text: { start: '#6b7280', end: '#4b5563' },
    File: { start: '#8b5cf6', end: '#7c3aed' },
  };

  const color = colors[docType] || colors.File;

  const svgTemplate = `
  <svg width="${opts.width}" height="${opts.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="icon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color.start};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${color.end};stop-opacity:1" />
      </linearGradient>
    </defs>

    <rect width="100%" height="100%" fill="url(#bg)" rx="8" ry="8"/>
    <rect width="100%" height="100%" fill="none" stroke="#d1d5db" stroke-width="1" rx="8" ry="8"/>

    <g transform="translate(${opts.width! / 2 - 30}, ${opts.height! / 2 - 50})">
      <path d="M0 8 C0 3.58 3.58 0 8 0 L38 0 L60 22 L60 72 C60 76.42 56.42 80 52 80 L8 80 C3.58 80 0 76.42 0 72 Z" fill="white" stroke="#d1d5db" stroke-width="1"/>
      <path d="M38 0 L38 14 C38 18.42 41.58 22 46 22 L60 22" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
      <rect x="8" y="35" width="44" height="20" rx="3" fill="url(#icon)"/>
      <text x="30" y="50" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle">${ext}</text>
    </g>

    <text x="${opts.width! / 2}" y="${opts.height! - 30}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280" text-anchor="middle">${docType}</text>
    <text x="${opts.width! / 2}" y="${opts.height! - 12}" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af" text-anchor="middle">
      ${truncateText(fileName, 25)}
    </text>
  </svg>
  `;

  try {
    const buffer = Buffer.from(svgTemplate);
    await sharp(buffer)
      .toFormat(opts.format || 'png')
      .toFile(outputPath);

    return outputPath;
  } catch (error: any) {
    logger.error('Failed to generate document preview', {
      error: error.message,
      filePath,
    });
    return null;
  }
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export default {
  generatePdfPreview,
  generateDocumentPreview,
};
