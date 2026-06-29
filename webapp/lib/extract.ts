'use client';

// Estrazione del testo lato browser per l'indicizzazione RAG.
// Supporta: testo semplice (txt/md/csv/json...), PDF (pdfjs-dist), DOCX (mammoth).
// Le librerie pesanti vengono importate dinamicamente solo quando servono.

export type ExtractResult = { text: string; supported: boolean };

const TEXT_EXT = ['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'log', 'rtf', 'html', 'htm'];

function ext(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export async function extractText(file: File): Promise<ExtractResult> {
  const e = ext(file.name);
  const type = file.type || '';

  // Testo semplice
  if (TEXT_EXT.includes(e) || type.startsWith('text/') || type === 'application/json') {
    try {
      return { text: await file.text(), supported: true };
    } catch {
      return { text: '', supported: true };
    }
  }

  // PDF
  if (e === 'pdf' || type === 'application/pdf') {
    try {
      const pdfjs: any = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      let out = '';
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const tc = await page.getTextContent();
        out += tc.items.map((it: any) => ('str' in it ? it.str : '')).join(' ') + '\n\n';
      }
      return { text: out, supported: true };
    } catch {
      return { text: '', supported: true };
    }
  }

  // DOCX
  if (
    e === 'docx' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const mammoth: any = await import('mammoth/mammoth.browser');
      const buf = await file.arrayBuffer();
      const r = await mammoth.extractRawText({ arrayBuffer: buf });
      return { text: String(r?.value || ''), supported: true };
    } catch {
      return { text: '', supported: true };
    }
  }

  // Non estraibile come testo (es. immagini): resta su storage ma non indicizzato.
  return { text: '', supported: false };
}
