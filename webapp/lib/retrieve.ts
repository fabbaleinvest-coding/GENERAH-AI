import { userClient, serviceClient } from './supabaseServer';
import { embedTexts, toVectorLiteral } from './embeddings';

// Helper di retrieval condiviso dalle AI (qualifica lead, avatar video-consulto):
// embedda una query, recupera i chunk più simili dalla knowledge base dell'utente
// (RLS per-utente via access token) e li formatta come contesto citabile.
// Degrada con eleganza: se non c'è token o gli embeddings non sono disponibili,
// torna [] e il chiamante usa il fallback (nomi file / settore).

export type RetrievedChunk = { file_name: string; content: string; similarity: number | null };

export async function retrieveContext(
  accessToken: string,
  query: string,
  matchCount = 6
): Promise<RetrievedChunk[]> {
  if (!accessToken || !query.trim()) return [];

  let qvec: number[][];
  try {
    qvec = await embedTexts([query]);
  } catch {
    return [];
  }
  if (!qvec[0]) return [];

  try {
    const supa = userClient(accessToken);
    const { data, error } = await supa.rpc('match_kb_chunks', {
      query_embedding: toVectorLiteral(qvec[0]),
      match_count: matchCount,
    });
    if (error || !Array.isArray(data)) return [];
    return data.map((m: any) => ({
      file_name: String(m.file_name || ''),
      content: String(m.content || ''),
      similarity: typeof m.similarity === 'number' ? m.similarity : null,
    }));
  } catch {
    return [];
  }
}

// Variante lato server (service_role) per un utente ESPLICITO: usata quando non
// c'è un token utente (es. webhook delle chiamate vocali). Richiede la service
// role key; in sua assenza torna [] e il chiamante usa il fallback.
export async function retrieveContextForUser(
  userId: string,
  query: string,
  matchCount = 8
): Promise<RetrievedChunk[]> {
  if (!userId || !query.trim()) return [];
  const svc = serviceClient();
  if (!svc) return [];

  let qvec: number[][];
  try {
    qvec = await embedTexts([query]);
  } catch {
    return [];
  }
  if (!qvec[0]) return [];

  try {
    const { data, error } = await svc.rpc('match_kb_chunks_for', {
      p_user: userId,
      query_embedding: toVectorLiteral(qvec[0]),
      match_count: matchCount,
    });
    if (error || !Array.isArray(data)) return [];
    return data.map((m: any) => ({
      file_name: String(m.file_name || ''),
      content: String(m.content || ''),
      similarity: typeof m.similarity === 'number' ? m.similarity : null,
    }));
  } catch {
    return [];
  }
}

// Concatena i chunk in un blocco di contesto, con un tetto di caratteri per
// non gonfiare il prompt.
export function formatContext(chunks: RetrievedChunk[], maxChars = 6000): string {
  let out = '';
  for (let i = 0; i < chunks.length; i++) {
    const block = `[Fonte ${i + 1} · ${chunks[i].file_name}]\n${chunks[i].content}`;
    if (out.length + block.length > maxChars) break;
    out += (out ? '\n\n---\n\n' : '') + block;
  }
  return out;
}
