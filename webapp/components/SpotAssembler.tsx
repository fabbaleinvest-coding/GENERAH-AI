'use client';

import { useState } from 'react';
import { Button, Spinner } from '@/components/ui';
import { assembleSpot, type AssembleResult } from '@/lib/assemble';

type Phase = 'idle' | 'running' | 'done' | 'error';

export default function SpotAssembler({
  clips,
  audioUrl,
  srt,
  fileName = 'generah-spot.mp4',
}: {
  clips: string[];
  audioUrl: string | null;
  srt: string;
  fileName?: string;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState('');
  const [ratio, setRatio] = useState<number | null>(null);
  const [result, setResult] = useState<AssembleResult | null>(null);
  const [error, setError] = useState('');

  async function run() {
    setPhase('running');
    setError('');
    setResult(null);
    setRatio(null);
    setMsg('Avvio del montaggio…');
    try {
      const r = await assembleSpot({
        clips,
        audioUrl,
        srt,
        onProgress: (m, p) => {
          setMsg(m);
          setRatio(typeof p === 'number' ? p : null);
        },
      });
      setResult(r);
      setPhase('done');
    } catch (e) {
      setError((e as Error).message || 'Montaggio non riuscito');
      setPhase('error');
    }
  }

  if (phase === 'done' && result) {
    return (
      <div className="space-y-3">
        <video
          src={result.url}
          controls
          playsInline
          className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900"
        />
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <a
            href={result.url}
            download={fileName}
            className="rounded-lg bg-teal-400 px-4 py-2 text-[0.82rem] font-semibold text-ink-900"
          >
            Scarica lo spot (.mp4)
          </a>
          {!result.subtitlesBurned && result.srtUrl && (
            <a
              href={result.srtUrl}
              download="generah-spot.srt"
              className="rounded-lg border border-white/15 px-4 py-2 text-[0.82rem] font-medium text-bone"
            >
              Scarica i sottotitoli (.srt)
            </a>
          )}
        </div>
        <p className="text-center text-[0.72rem] leading-relaxed text-mist/55">
          {result.subtitlesBurned
            ? 'Spot 9:16 pronto · sottotitoli inclusi nel video.'
            : 'Spot 9:16 pronto. I sottotitoli sono nel file .srt: caricalo su Meta insieme al video.'}
        </p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="space-y-3 rounded-xl border border-coral/30 bg-coral/[0.06] p-4">
        <p className="text-[0.85rem] text-coral">Montaggio non riuscito: {error}</p>
        <Button variant="outline" onClick={run}>
          Riprova il montaggio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {phase === 'running' ? (
        <div className="rounded-xl border border-white/8 bg-ink/40 p-4">
          <div className="flex items-center gap-3">
            <Spinner className="h-4 w-4 text-teal-300" />
            <span className="text-[0.85rem] text-mist">{msg || 'Montaggio in corso…'}</span>
          </div>
          {ratio !== null && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-teal-400 transition-[width] duration-300"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
          )}
          <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-mist/45">
            Montaggio nel browser · ffmpeg.wasm
          </p>
        </div>
      ) : (
        <>
          <Button size="lg" onClick={run}>
            Monta lo spot 9:16
          </Button>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-mist/45">
            Unisce le 2 scene + voce + sottotitoli in un unico video · nel tuo browser
          </p>
        </>
      )}
    </div>
  );
}
