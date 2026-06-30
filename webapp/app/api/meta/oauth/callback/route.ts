export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint di ritorno del dialog Facebook (pubblico: il browser ci arriva da
// facebook.com, senza sessione Supabase). Non scambia nulla: rimanda solo il
// `code` alla finestra che ha aperto il popup (stessa origine) e si chiude.
// Lo scambio token avviene in /api/meta/oauth/exchange, autenticato.

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code') || '';
  const state = u.searchParams.get('state') || '';
  const error = u.searchParams.get('error_description') || u.searchParams.get('error') || '';

  const payload = JSON.stringify({ source: 'generah-meta-oauth', code, state, error });

  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>GENERAH AI · Meta</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#0B1622;color:#EDE6D8;display:flex;align-items:center;justify-content:center;height:100vh}div{text-align:center;padding:0 24px}p{opacity:.7;font-size:14px}</style></head>
<body><div><p>Connessione a Meta completata. Puoi chiudere questa finestra.</p></div>
<script>
(function(){
  var msg = ${payload};
  try { if (window.opener) { window.opener.postMessage(msg, window.location.origin); } } catch (e) {}
  setTimeout(function(){ try { window.close(); } catch (e) {} }, 400);
})();
</script></body></html>`;

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
