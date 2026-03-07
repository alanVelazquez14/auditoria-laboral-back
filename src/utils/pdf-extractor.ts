export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // convertir Buffer → Uint8Array real
  const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const loadingTask = pdfjs.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const strings = content.items.map((item: any) => item.str);
    text += strings.join(" ") + "\n";
  }

  return text;
}