import { pdf } from '@react-pdf/renderer';

/**
 * Generate a PDF from a React-PDF Document component and trigger download.
 * @param {React.ReactElement} document - The React-PDF <Document> element
 * @param {string} filename - The output filename (without .pdf extension)
 */
export async function downloadPdf(document, filename) {
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download plain text content as a .txt file.
 * @param {string} content - The text content
 * @param {string} filename - The output filename (without .txt extension)
 */
export function downloadTxt(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `${filename}.txt`;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
