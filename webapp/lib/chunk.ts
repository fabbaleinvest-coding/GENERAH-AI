// Chunking robusto per il RAG: blocchi di ~3500 caratteri con sovrapposizione,
// tagliati dove possibile su confini naturali (paragrafo / frase).

export function chunkText(text: string, opts?: { size?: number; overlap?: number }): string[] {
  const size = opts?.size ?? 3500;
  const overlap = opts?.overlap ?? 400;

  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const lastBreak = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('. '),
        window.lastIndexOf('\n')
      );
      if (lastBreak > size - 800) end = start + lastBreak + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
