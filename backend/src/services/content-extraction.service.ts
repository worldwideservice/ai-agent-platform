import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

export interface ExtractedContent {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    createdDate?: Date;
    pages?: number;
  };
}

/**
 * Extract text from PDF file
 */
export async function extractPDF(filePath: string): Promise<ExtractedContent> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);

    return {
      text: data.text,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        createdDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        pages: data.numpages,
      },
    };
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw new Error(`Failed to extract PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractDOCX(filePath: string): Promise<ExtractedContent> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });

    return {
      text: result.value,
      metadata: {},
    };
  } catch (error) {
    console.error('Error extracting DOCX:', error);
    throw new Error(`Failed to extract DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from TXT or MD file
 */
export async function extractText(filePath: string): Promise<ExtractedContent> {
  try {
    const text = fs.readFileSync(filePath, 'utf8');

    return {
      text,
      metadata: {},
    };
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from CSV file
 */
export async function extractCSV(filePath: string): Promise<ExtractedContent> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Convert CSV to readable text format
    const text = records
      .map((record: any) => {
        return Object.entries(record)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      })
      .join('\n');

    return {
      text,
      metadata: {},
    };
  } catch (error) {
    console.error('Error extracting CSV:', error);
    throw new Error(`Failed to extract CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from HTML file
 */
export async function extractHTML(filePath: string): Promise<ExtractedContent> {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);

    // Remove script and style tags
    $('script, style').remove();

    // Extract title
    const title = $('title').text() || $('h1').first().text();

    // Extract main text content
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      text,
      metadata: {
        title,
      },
    };
  } catch (error) {
    console.error('Error extracting HTML:', error);
    throw new Error(`Failed to extract HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from JSON file
 */
export async function extractJSON(filePath: string): Promise<ExtractedContent> {
  try {
    const jsonContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(jsonContent);

    // Convert JSON to readable text format
    const text = JSON.stringify(data, null, 2);

    return {
      text,
      metadata: {},
    };
  } catch (error) {
    console.error('Error extracting JSON:', error);
    throw new Error(`Failed to extract JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main extraction function that routes to appropriate extractor based on file type
 */
export async function extractContent(filePath: string, fileType: string): Promise<ExtractedContent> {
  const extension = fileType.toLowerCase();

  switch (extension) {
    case 'pdf':
      return extractPDF(filePath);
    case 'docx':
    case 'doc':
      return extractDOCX(filePath);
    case 'txt':
    case 'md':
      return extractText(filePath);
    case 'csv':
      return extractCSV(filePath);
    case 'html':
    case 'htm':
      return extractHTML(filePath);
    case 'json':
      return extractJSON(filePath);
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}
