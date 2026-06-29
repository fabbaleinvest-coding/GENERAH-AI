// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Generazione sottotitoli automatici per la creatività video.
//  Dal voiceover per-scena del brief produce cue temporizzati e una stringa
//  SRT, pronti per essere "bruciati" nel video finale (assemblaggio lato
//  browser con ffmpeg.wasm). Logica pura, senza dipendenze.
// ─────────────────────────────────────────────────────────────────────────

export interface SubScene {
  durationSec: number;
  voiceover: string;
}

export interface SubCue {
  index: number;
  start: number; // secondi
  end: number; // secondi
  text: string;
}

/** Spezza un testo in frammenti leggibili (~max parole per cue). */
function splitIntoChunks(text: string, maxWords = 9): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  // prima per frase, poi le frasi lunghe in blocchi da maxWords parole
  const sentences = clean.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (const s of sentences) {
    const words = s.split(' ');
    if (words.length <= maxWords) {
      chunks.push(s);
    } else {
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(' '));
      }
    }
  }
  return chunks.length ? chunks : [clean];
}

/**
 * Costruisce i cue temporizzati distribuendo il voiceover di ogni scena
 * uniformemente lungo la sua durata, in sequenza tra le scene.
 */
export function buildCues(scenes: SubScene[]): SubCue[] {
  const cues: SubCue[] = [];
  let offset = 0;
  let index = 1;
  for (const scene of scenes) {
    const dur = Math.max(1, Number(scene.durationSec) || 15);
    const chunks = splitIntoChunks(scene.voiceover);
    if (chunks.length === 0) {
      offset += dur;
      continue;
    }
    // pesa la durata di ogni cue in base al numero di parole
    const weights = chunks.map((c) => Math.max(1, c.split(' ').length));
    const totalW = weights.reduce((a, b) => a + b, 0);
    let local = 0;
    chunks.forEach((c, i) => {
      const slice = (weights[i] / totalW) * dur;
      const start = offset + local;
      const end = i === chunks.length - 1 ? offset + dur : start + slice;
      cues.push({ index: index++, start, end, text: c });
      local += slice;
    });
    offset += dur;
  }
  return cues;
}

function fmtTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(millis, 3)}`;
}

/** Converte i cue in formato SRT standard. */
export function toSrt(cues: SubCue[]): string {
  return cues
    .map((c) => `${c.index}\n${fmtTime(c.start)} --> ${fmtTime(c.end)}\n${c.text}\n`)
    .join('\n');
}

/** Helper diretto: scene del brief → SRT. */
export function scenesToSrt(scenes: SubScene[]): string {
  return toSrt(buildCues(scenes));
}
