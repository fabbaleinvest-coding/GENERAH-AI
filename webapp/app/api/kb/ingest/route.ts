import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { embedTexts, toVectorLiteral } from '@/lib/embeddings';
import { chunkText } from '@/lib/chunk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · RAG — indicizzazione di un documento della knowledge base.
//  Riceve il testo già estratto (lato browser), lo divide in chunk, calcola
//  gli embeddings (OpenAI) e li salva in kb_chunks per l'utente autenticato.
//  L'autenticazione passa via header Authorization: Bearer <access_token>,
//  così l'inserimento rispetta la RLS (ogni utente solo i propri frammenti).
// ─────────────────────────────────────────────────────────────────────────

type Body = { fileId?: string; fileName?: string; text?: string };

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const fileId = (body.fileId || '').trim();
  const fileName = (body.fileName || '').trim() || 'documento';
  const text = (body.text || '').trim();
  if (!fileId) return NextResponse.json({ error: 'fileId mancante' }, { status: 400 });
  if (!text) return NextResponse.json({ chunks: 0, note: 'Nessun testo estraibile' });

  const supa = userClient(token);
  const { data: ures, error: uerr } = await supa.auth.getUser(token);
  if (uerr || !ures?.user) return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  const userId = ures.user.id;

  const chunks = chunkText(text);
  if (chunks.length === 0) return NextResponse.json({ chunks: 0 });

  let vectors: number[][];
  try {
    vectors = await embedTexts(chunks);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  // Re-index pulito: rimuove eventuali frammenti già presenti per questo file.
  await supa.from('kb_chunks').delete().eq('kb_file_id', fileId).eq('user_id', userId);

  const rows = chunks.map((content, i) => ({
    user_id: userId,
    kb_file_id: fileId,
    file_name: fileName,
    chunk_index: i,
    content,
    embedding: toVectorLiteral(vectors[i]),
  }));

  const { error: ierr } = await supa.from('kb_chunks').insert(rows);
  if (ierr) return NextResponse.json({ error: ierr.message }, { status: 500 });

  return NextResponse.json({ chunks: rows.length });
}
