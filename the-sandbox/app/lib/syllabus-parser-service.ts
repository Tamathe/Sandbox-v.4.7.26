/**
 * Syllabus Parser Service — Phase 1: Text Extraction
 *
 * Extracts plain text from PDF and DOCX files for downstream LLM parsing.
 */

import JSZip from 'jszip';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Extract plain text from a PDF or DOCX buffer.
 *
 * @throws Error if file exceeds 10 MB, is an unsupported type,
 *         or PDF text extraction yields < 100 characters (likely scanned/image-based).
 */
export async function extractText(file: Buffer, mimeType: string): Promise<string> {
  if (file.length > MAX_FILE_SIZE) {
    throw new Error(`File size ${(file.length / 1024 / 1024).toFixed(1)} MB exceeds the 10 MB limit.`);
  }

  switch (mimeType) {
    case 'application/pdf':
      return extractPdfTextLocal(file);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDocxText(file);
    default:
      throw new Error(
        `Unsupported file type: ${mimeType}. Only PDF and DOCX files are supported.`
      );
  }
}

async function extractPdfTextLocal(file: Buffer): Promise<string> {
  const { extractPdfText } = await import('./pdf-extract')
  const result = await extractPdfText(file);
  const text = result.text.trim();

  if (text.length < 100) {
    throw new Error(
      'This PDF appears to be scanned or image-based — we could only extract ' +
      text.length + ' characters of text. To fix this: (1) re-save the PDF using "Print to PDF" ' +
      'from your browser or Adobe Acrobat\'s OCR feature, (2) upload the original DOCX file instead, ' +
      'or (3) ask your institution\'s IT department for a text-searchable version.'
    );
  }

  return text;
}

async function extractDocxText(file: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const docXml = zip.file('word/document.xml');

  if (!docXml) {
    throw new Error('Invalid DOCX file: word/document.xml not found.');
  }

  const xmlContent = await docXml.async('string');
  return parseWordXml(xmlContent);
}

/**
 * Walk <w:p> (paragraph) and <w:r> (run) nodes to extract plain text.
 * Uses simple regex-based parsing — no external XML library needed.
 */
function parseWordXml(xml: string): string {
  const paragraphs: string[] = [];

  // Match each <w:p ...>...</w:p> block (including self-closing)
  const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = paragraphRegex.exec(xml)) !== null) {
    const paragraphContent = pMatch[1];
    const runs: string[] = [];

    // Extract text from <w:t ...>...</w:t> nodes within runs
    const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let tMatch: RegExpExecArray | null;

    while ((tMatch = textRegex.exec(paragraphContent)) !== null) {
      runs.push(tMatch[1]);
    }

    if (runs.length > 0) {
      paragraphs.push(runs.join(''));
    }
  }

  return paragraphs.join('\n');
}
