import mammoth from 'mammoth';

export interface DocxParseResult {
  title: string;
  html: string;
  messages: string[];
}

/**
 * Parses a Microsoft Word (.docx) file into semantic HTML compatible with TipTap.
 * Configures custom style mapping for French and English heading styles.
 * Converts embedded images into Base64 data URLs.
 */
export async function parseDocxFile(file: File | Blob): Promise<DocxParseResult> {
  const fileName = (file as File).name || 'Manuscrit.docx';
  const title = fileName.replace(/\.[^/.]+$/, '') || 'Sans titre';

  const arrayBuffer =
    file instanceof ArrayBuffer
      ? file
      : (file as any).buffer instanceof ArrayBuffer
      ? (file as any).buffer
      : typeof (file as Blob).arrayBuffer === 'function'
      ? await (file as Blob).arrayBuffer()
      : (file as unknown as ArrayBuffer);

  const buffer = Buffer.isBuffer(arrayBuffer)
    ? arrayBuffer
    : Buffer.from(arrayBuffer as ArrayBuffer);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Titre 1'] => h1:fresh",
      "p[style-name='Titre 2'] => h2:fresh",
      "p[style-name='Titre 3'] => h3:fresh",
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2:fresh"
    ],
    convertImage: mammoth.images.imgElement(async (image) => {
      const base64 = await image.readAsBase64String();
      return {
        src: `data:${image.contentType};base64,${base64}`
      };
    })
  };

  const result = await mammoth.convertToHtml({ buffer }, options);

  return {
    title,
    html: result.value,
    messages: result.messages.map((m) => m.message)
  };
}
