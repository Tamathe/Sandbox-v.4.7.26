/**
 * Shared PDF text extraction helper.
 *
 * Uses pdf-parse v1 which has a simple Buffer-in / result-out API
 * and works reliably in Next.js server runtime.
 */

export interface PdfExtractResult {
  text: string
  pageCount: number
}

export async function extractPdfText(buffer: Buffer): Promise<PdfExtractResult> {
  // Require the inner lib file directly — the package root (index.js) tries
  // to read a test PDF when module.parent is falsy (which happens in Next.js).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse') as (
    buf: Buffer
  ) => Promise<{ text: string; numpages: number }>

  const result = await pdfParse(buffer)
  return { text: result.text || '', pageCount: result.numpages || 0 }
}
