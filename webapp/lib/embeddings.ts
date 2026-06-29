// Embeddings per il RAG. Usa OpenAI text-embedding-3-small (1536 dim),
// riusando la OPENAI_API_KEY già presente nello stack. Sovrascrivibile via
// OPENAI_EMBED_MODEL. Lancia un errore chiaro se la chiave manca.

const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const BATCH = 96;

export async function embedTexts(inputs: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY mancante (env)');
  if (inputs.length === 0) return [];

  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += BATCH) {
    const batch = inputs.slice(i, i + BATCH);
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `OpenAI HTTP ${res.status}`;
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    for (const d of data.data) out.push(d.embedding as number[]);
  }
  return out;
}

// pgvector accetta in input la forma testuale "[1,2,3]".
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}
