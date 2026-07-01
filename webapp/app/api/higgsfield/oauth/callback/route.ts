import { completeAuthorization } from '@/lib/higgsfieldOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Ritorno del dialog OAuth di Higgsfield. Il browser arriva qui da Higgsfield
// (senza sessione GENERAH): lo scambio code→token è fatto QUI lato server usando
// il "pending" cifrato salvato all'avvio (match sullo `state`, single-use). Non
// serve la sessione utente perché la connessione è di PIATTAFORMA (service_role).
// L'admin gate è già applicato in /start (solo un admin può creare il pending).

function page(ok: boolean, message: string): Response {
  const payload = JSON.stringify({ source: 'generah-higgsfield-oauth', ok, message });
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>GENERAH AI · Higgsfield</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#0B1622;color:#F6F5F1;display:flex;align-items:center;justify-content:center;height:100vh}div{text-align:center;padding:0 24px;max-width:32rem}h1{font-size:18px;margin:0 0 8px}p{opacity:.72;font-size:14px;line-height:1.5}.ok{color:#5FD0B8}.err{color:#E0654B}</style></head>
<body><div>
<h1 class="${ok ? 'ok' : 'err'}">${ok ? 'Higgsfield collegato' : 'Connessione non riuscita'}</h1>
<p>${message}</p>
<p style="opacity:.5;margin-top:14px">Puoi chiudere questa finestra.</p>
</div>
<script>(function(){try{if(window.opener){window.opener.postMessage(${payload}, window.location.origin);}}catch(e){}setTimeout(function(){try{window.close();}catch(e){}},600);})();</script>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code') || '';
  const state = u.searchParams.get('state') || '';
  const err = u.searchParams.get('error_description') || u.searchParams.get('error') || '';

  if (err) return page(false, err);
  if (!code || !state) return page(false, 'Parametri OAuth mancanti (code/state).');

  try {
    await completeAuthorization(code, state);
    return page(true, 'Il motore creativo di piattaforma (Nano Banana Pro · Kling 3.0 Turbo · ElevenLabs Roman) è ora attivo per tutti i piani.');
  } catch (e) {
    return page(false, (e as Error).message || 'Scambio del token non riuscito.');
  }
}
