import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// VARIANTE SPERIMENTALE: forza la modalita' LITE (1 credito/min) ignorando LIVEAVATAR_MODE,
// cosi' la pagina /test-avatar-heygen-lite ottiene SEMPRE un token LITE anche se in Vercel
// LIVEAVATAR_MODE e' impostata su FULL (che altrimenti sovrascriverebbe e farebbe rifiutare
// repeatAudio). Identica per il resto a /api/heygen/token (reaping incluso).
const API = "https://api.liveavatar.com";

async function reapActiveSessions(key: string, avatarId: string) {
  try {
    const url = new URL(API + "/v1/sessions");
    url.searchParams.set("type", "active");
    if (avatarId) url.searchParams.set("avatar_id", avatarId);
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "X-API-KEY": key, accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json().catch(() => ({} as any));
    const results: any[] = data?.data?.results || data?.results || [];
    const ids: string[] = results.map((s) => s?.id).filter(Boolean);
    await Promise.all(
      ids.map((id) =>
        fetch(API + "/v1/sessions/stop", {
          method: "POST",
          headers: { "X-API-KEY": key, "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify({ session_id: id }),
        }).catch(() => {})
      )
    );
  } catch {}
}

export async function GET() {
  const key = process.env.LIVEAVATAR_API_KEY;
  if (!key) return NextResponse.json({ error: "LIVEAVATAR_API_KEY mancante (env)" }, { status: 500 });

  const avatarId = (process.env.LIVEAVATAR_AVATAR_ID || "").trim();
  if (!avatarId) return NextResponse.json({ error: "LIVEAVATAR_AVATAR_ID mancante (env)" }, { status: 500 });

  const voiceId = (process.env.LIVEAVATAR_VOICE_ID || "").trim();
  const language = (process.env.LIVEAVATAR_LANGUAGE || "it").trim();
  const mode = "LITE"; // <-- FORZATO
  const isSandbox = (process.env.LIVEAVATAR_SANDBOX || "").trim().toLowerCase() === "true";

  await reapActiveSessions(key, avatarId);

  const persona: Record<string, any> = { language };
  if (voiceId) persona.voice_id = voiceId;

  const body = { mode, avatar_id: avatarId, is_sandbox: isSandbox, avatar_persona: persona };

  try {
    const res = await fetch(API + "/v1/sessions/token", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      return NextResponse.json({ error: data?.message || data?.error || data || `HTTP ${res.status}` }, { status: 500 });
    }
    const sessionToken =
      data?.data?.session_token || data?.session_token || data?.data?.token || data?.token || null;
    if (!sessionToken) {
      return NextResponse.json({ error: "Risposta LiveAvatar priva di session_token", raw: data }, { status: 500 });
    }
    return NextResponse.json({ sessionToken, mode });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
