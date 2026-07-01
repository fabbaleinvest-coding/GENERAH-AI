// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Voiceover ADS via OpenAI Text-to-Speech — SOLO SERVER.
//  Higgsfield Platform API non espone TTS: il voiceover è generato da OpenAI
//  (riusa OPENAI_API_KEY già presente nello stack), voce di default "onyx"
//  (maschile, profonda, persuasiva — adatta alla pubblicità).
//  È SINCRONO: ritorna direttamente un data URL mp3, pronto sia per l'anteprima
//  <audio> sia per il montaggio in-browser (ffmpeg.wasm), senza job da pollare.
//    Config (env):
//      OPENAI_API_KEY    (obbligatoria; già usata da embeddings/voice)
//      OPENAI_TTS_MODEL  (opzionale, default 'tts-1'; alt: 'tts-1-hd')
//      OPENAI_TTS_VOICE  (opzionale, default 'onyx')
// ─────────────────────────────────────────────────────────────────────────

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

// Limite input dell'endpoint OpenAI TTS.
const MAX_INPUT = 4000;

export function ttsConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Sintetizza il voiceover e ritorna un data URL mp3 (`data:audio/mpeg;base64,…`).
 * Ritorna null se manca la chiave o il testo è vuoto (pipeline procede senza voce).
 * Solleva errore solo su fallimento reale dell'API (gestito a monte).
 */
export async function synthesizeVoiceover(text: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  const input = (text || '').trim();
  if (!key || !input) return null;

  const model = process.env.OPENAI_TTS_MODEL || 'tts-1';
  const voice = process.env.OPENAI_TTS_VOICE || 'onyx';

  const res = await fetch(OPENAI_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: input.slice(0, MAX_INPUT),
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI TTS ${res.status}: ${detail.slice(0, 200)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return `data:audio/mpeg;base64,${buf.toString('base64')}`;
}
