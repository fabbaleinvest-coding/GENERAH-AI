# GENERAH AI — Console (webapp dinamica)

> **Sales never sleep.** Console operativa di GENERAH AI: registrazione, dashboard
> personalizzata, scelta del piano con codici sconto, contatori di utilizzo e un
> flusso di onboarding AI in 3 fasi (knowledge base → campagne ADS → video‑consulto).

Questa è la **webapp di test/demo**, separata dal sito vetrina. È volutamente
*standalone*: non è ancora collegata alla pagina vetrina e gira come progetto
Next.js indipendente, pronto per un secondo deploy su Vercel.

---

## Cosa fa

| Area | Descrizione |
| --- | --- |
| **Registrazione** | Nome, cognome, email, cellulare, settore + password. I dati confluiscono nel "database GENERAH IT" (vedi *Persistenza*). Ogni utente ha credenziali e dashboard personalizzata. |
| **Piani & prezzi** | 4 piani (Starter, Growth, Premium, Enterprise) con canone mensile + setup una‑tantum, presi dal modello commerciale. |
| **Codici sconto** | `EXTRASPECIAL10` (−10%), `!EXTRA20SPECIAL#` (−20%), `#PLANUPGRADE!` (prezzo del piano scelto ma feature del piano superiore), `!PLAN50%UPGRADE#` (feature superiori + −50% sul setup). Validazione live, case‑insensitive. |
| **Demo gratuita** | In fase demo si attiva qualsiasi piano **senza pagamento** (PayPal in una fase successiva). |
| **Contatori di utilizzo** | Ogni feature a consumo (chiamate AI, minuti video‑consulto, messaggi WhatsApp, campagne ADS) ha un contatore alla rovescia che decresce con l'uso. Al raggiungimento del **10% residuo** l'admin riceve un alert con la proposta dei pacchetti aggiuntivi. |
| **Onboarding AI — Fase 1** | Caricamento guidato della **knowledge base** (materiale marketing dell'admin). |
| **Onboarding AI — Fase 2** | Collegamento account **Meta Ads** → regia AI (Opus 4.8) che scrive il prompt più persuasivo dalla KB, genera **2 video da 15s consecutivi** (Kling 3.0 Turbo 9:16 720p) + **voiceover ElevenLabs voce "Roman"** + subtitle automatici, chiede foto da caricare o generarle (nano banana pro), mostra il post assemblato + caption, configura il target e chiede una lista Excel ≥100 contatti per il lookalike. Campagna lead‑gen con form di cattura → i lead finiscono nel **CRM**. *Fase saltabile.* |
| **Onboarding AI — Fase 3** | **Video‑consulto gratuito una‑tantum (5 min)**: l'avatar usa come knowledge base i documenti caricati in Fase 1. |
| **Dashboard** | Panoramica, **Lead · CRM** (filtri, scoring, stati, azioni chiamata/WhatsApp che consumano i contatori), Campagne, Video‑consulto, Knowledge base, Account. |

---

## Stack tecnico

- **Next.js 14** (App Router) · **React 18** · **TypeScript** (strict)
- **Tailwind CSS** con design‑token del brand GENERAH (palette *ink / navy / teal / bone / amber / coral*, font *Fraunces · Inter · JetBrains Mono*)
- Nessuna dipendenza UI esterna pesante: componenti su misura in `components/`

### Struttura

```
app/
  layout.tsx          # font, metadata (noindex), StoreProvider
  page.tsx            # landing console → redirect a /dashboard se loggato
  registrati/         # form di registrazione
  accedi/             # login
  piani/              # scelta piano + codici sconto (prezzi live)
  onboarding/         # macchina a stati del flusso AI in 3 fasi
  dashboard/          # console: panoramica, CRM, campagne, video, KB, account
components/
  ui.tsx              # Logo, Button, Field, Photo, Badge, Spinner, ...
  AppShell.tsx        # top bar, campanella alert, menu utente, strip contatori
  Guard.tsx           # gate di rotta (auth / piano attivo)
  Meters.tsx          # barre dei contatori con stati ok/warn/crit
  TopUpModal.tsx      # upsell pacchetti aggiuntivi
  AuthScreen.tsx      # layout split per login/registrazione
lib/
  plans.ts            # piani, prezzi, codici sconto, pacchetti overage
  store.tsx           # "database GENERAH IT" (Context + localStorage)
  images.ts           # manifest immagini (CDN)
  logo.ts             # riferimento al logo
```

---

## Persistenza — il "database GENERAH IT"

Per questa fase demo lo stato (utenti, piano attivo, contatori, lead, campagne,
knowledge base, alert) è gestito da un **React Context con persistenza su
`localStorage`** (chiave `generah_db_v1`), incapsulato in `lib/store.tsx`.

L'API dello store (`register`, `login`, `activatePlan`, `consume`, `topUp`,
`launchCampaign`, `addLead`, …) è già modellata come un backend: per passare a un
database reale (es. **Postgres/Supabase + Auth**) basta reimplementare le funzioni
di `store.tsx` mantenendone le firme. I punti di integrazione AI (Meta Ads, Kling,
ElevenLabs, HeyGen, nano banana pro) sono **simulati** con UI fedele e segnaposto
chiaramente indicati, pronti per il collegamento a MCP/API.

---

## Avvio in locale

```bash
npm install
npm run dev          # http://localhost:3000
```

Build di produzione:

```bash
npm run build
npm start
```

> In fase di build, `next/font/google` scarica i font da Google Fonts: serve
> accesso di rete (su Vercel è disponibile di default).

---

## Deploy su Vercel (secondo progetto)

La webapp vive nella sottocartella **`webapp/`** dello stesso repo della vetrina.
Per pubblicarla come progetto separato senza toccare la vetrina:

1. Su Vercel: **New Project** → importa il repo `fabbaleinvest-coding/GENERAH-AI`.
2. **Root Directory** → imposta `webapp`.
3. Framework preset: **Next.js** (auto). Deploy.

La vetrina resta invariata sul suo progetto Vercel (root del repo).

---

## Codici sconto (riepilogo logica)

| Codice | Effetto |
| --- | --- |
| `EXTRASPECIAL10` | −10% su canone e setup |
| `!EXTRA20SPECIAL#` | −20% su canone e setup |
| `#PLANUPGRADE!` | Paghi il piano scelto, ottieni le **feature del piano superiore** |
| `!PLAN50%UPGRADE#` | Feature del piano superiore **+ −50% sul setup** |

---

## Note

- L'app è marcata **`noindex`**: è un ambiente di test, non destinato all'indicizzazione.
- Le fotografie sono servite da CDN; il logo è referenziato dal repo (vedi `lib/logo.ts`,
  con TODO per la versione self‑hosted in produzione).
- I pagamenti (PayPal) e le integrazioni AI live saranno aggiunti in una fase successiva.

© GENERAH IT — *Sales never sleep.*

## Integrazione Meta Ads (OAuth per-utente)

Pipeline reale di pubblicazione campagne lead-gen su Meta (Facebook/Instagram).

**Connessione per-utente (OAuth).** Ogni admin collega il proprio account Meta dal
passo "Campagne Meta" dell'onboarding. Il flusso usa un popup: la callback rimanda
il `code` all'app via `postMessage` e lo scambio token avviene lato server
(`/api/meta/oauth/exchange`). I token (utente long-lived + pagina) vengono cifrati
(AES-256-GCM) e salvati in `meta_connections` (RLS per-utente). In assenza di
connessione, le chiamate ricadono sulla configurazione via env.

**Prerequisiti (lato Meta, una tantum):**

1. Creare una **Meta App** (tipo Business) con Facebook Login e i permessi:
   `ads_management`, `ads_read`, `leads_retrieval`, `pages_show_list`,
   `pages_manage_ads`, `pages_read_engagement`, `business_management`,
   `pages_manage_metadata`. Per l'uso con account di terzi serve l'App Review;
   in modalità sviluppo funziona già con l'account del team dell'app.
2. In *Facebook Login → Settings*, aggiungere come **Valid OAuth Redirect URI**:
   `https://<dominio>/api/meta/oauth/callback`
   (es. `https://generah-ai-jeyv.vercel.app/api/meta/oauth/callback`).
3. Eseguire la migrazione `supabase/migrations/0001_meta_connections.sql` nel SQL
   editor di Supabase.

**Variabili d'ambiente (Vercel):**

- `META_APP_ID`, `META_APP_SECRET` — credenziali della Meta App (obbligatorie per OAuth).
- `META_OAUTH_REDIRECT` — opzionale; forza l'URI di callback (altrimenti dedotto dall'host).
- `META_TOKEN_SECRET` — opzionale; chiave di cifratura dei token (default: derivata da `META_APP_SECRET`).
- `META_GRAPH_VERSION` — opzionale; versione Graph API (default `v23.0`).
- `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_PAGE_ID` — fallback "single account"
  via env (opzionali: `META_PAGE_ACCESS_TOKEN`, `META_IG_ACTOR_ID`); usati solo se
  l'utente non ha una connessione OAuth.

Le campagne vengono create in **PAUSA**: rivedi in Gestione Inserzioni prima di attivare.

### Creatività: spot montato come video della campagna

Lo spot finale (2 scene + voiceover + sottotitoli) viene assemblato nel browser
(ffmpeg.wasm) e caricato sul bucket pubblico `ad-spots`; il suo URL pubblico è
passato a Meta come `file_url` della creatività. Se il montaggio non è stato
eseguito, la pubblicazione ricade sulla prima clip generata.

Setup una tantum: esegui `supabase/migrations/0002_ad_spots_bucket.sql` nel SQL
editor di Supabase (crea il bucket pubblico `ad-spots` con upload nella cartella
del singolo utente).

### Lookalike dalla lista contatti

Nello step "Budget e pubblico" l'admin carica una lista (.csv o .xlsx) di
contatti. Il file viene parsato e **hashato (SHA-256) nel browser**: la PII in
chiaro non lascia mai il client. Al server (`/api/ads/meta/lookalike`) arrivano
solo gli hash, da cui si crea una Custom Audience (lista clienti) e poi una
Lookalike; l'id della lookalike viene aggiunto al targeting della campagna.

Prerequisito Meta: i **Custom Audience Terms** vanno accettati una volta in
Gestione Inserzioni (Audiences → crea una custom audience) — altrimenti l'API
risponde con errore. Il lookalike richiede un seed con abbastanza utenti
corrisposti (idealmente 100+); con liste piccole Meta può rifiutarlo o tenerlo
in elaborazione: in tal caso la campagna parte comunque, senza il lookalike.

### Lead Ads: i lead reali nel CRM (webhook)

I lead compilati nel modulo della campagna entrano nel CRM tramite il webhook
Meta Lead Ads, al posto dei lead demo (che ora si generano solo in modalità
dimostrativa, non sulle campagne Meta reali).

Flusso: Meta invia l'evento `leadgen` (solo ID) a un'unica callback →
`/api/meta/leads/webhook`. Da `page_id` si risale all'utente proprietario della
pagina (tabella `meta_connections`, lettura con service_role), con il suo token
si leggono i dati del lead e si salva nella sua tabella `leads`. La firma
`X-Hub-Signature-256` è verificata con l'app secret; l'inserimento è idempotente.

Setup:
1. Esegui `supabase/migrations/0003_leads.sql` (crea la tabella `leads` con RLS).
2. Env su Vercel: `SUPABASE_SERVICE_ROLE_KEY` (scrittura lead lato server),
   `META_WEBHOOK_VERIFY_TOKEN` (una stringa a tua scelta), `META_APP_SECRET`
   (già usato per l'OAuth).
3. Nell'App Dashboard di Meta → Webhooks → oggetto **Page**: imposta la Callback
   URL `https://<dominio>/api/meta/leads/webhook`, il Verify Token uguale a
   `META_WEBHOOK_VERIFY_TOKEN`, e sottoscrivi il campo `leadgen`.

La singola pagina viene iscritta automaticamente agli eventi `leadgen` al momento
del collegamento OAuth. Nel CRM il pulsante **Aggiorna** ricarica i lead arrivati.

### Social: infografiche (Nano Banana Pro) + programmazione Metricool

La Fase 2 genera un piano editoriale reale (Opus 4.8 + RAG dalla knowledge base),
crea per ogni post un'**infografica** con Higgsfield (Nano Banana Pro) e la
**programma** su Instagram/Facebook tramite **Metricool**.

Flusso: `/api/social/plan` (Opus → post settimanali con bullet/caption/imagePrompt)
→ `/api/social/infographic` (Higgsfield, immagine 4:5 con i punti chiave come testo)
→ `/api/social/metricool/schedule` (un post a settimana, con l'infografica allegata).

Infografiche (env, opzionali — senza, l'app resta in dimostrativo con i placeholder):
- credenziali Higgsfield (`HIGGSFIELD_KEY_ID` + `HIGGSFIELD_KEY_SECRET`, oppure
  `HIGGSFIELD_CREDENTIALS=id:secret`);
- per usare Nano Banana Pro imposta `HIGGSFIELD_IMAGE_ENDPOINT` allo slug del modello
  (il default è Soul); il formato è forzato a 4:5 per il social.

Metricool (per-utente, niente env obbligatorie):
1. esegui `supabase/migrations/0004_metricool_connections.sql`;
2. in onboarding l'admin incolla **Token API** + **User ID** Metricool (Impostazioni
   account → API, richiede piano **Advanced**) e sceglie il **brand** (blogId);
   il token è cifrato a riposo (`METRICOOL_TOKEN_SECRET`, consigliata);
3. Instagram/Facebook si collegano **dentro** il brand Metricool: l'app programma solo
   sulle reti già connesse a quel brand.

Note: le immagini passano per l'endpoint `normalize` di Metricool (così sono ospitate
e non scadono); `publicationDate` usa la timezone `Europe/Rome` (override
`METRICOOL_TIMEZONE`). Senza connessione Metricool la programmazione resta una bozza
locale dimostrativa.

### Pubblicazione organica diretta (Facebook/Instagram via Graph)

Alternativa a Metricool, **dentro la webapp**: riusa la connessione Meta dell'admin
(lo stesso OAuth delle campagne) per pubblicare i post sulla sua Pagina Facebook e
sull'account Instagram business collegato, senza account/terze parti.

Flusso: i post programmati entrano in coda (`social_posts_queue`) tramite
`/api/social/publish`; un cron (`/api/social/cron`) li pubblica all'orario previsto
— Facebook via `/{page}/feed`|`/photos`, Instagram in due passi
(`/{ig}/media` → `/{ig}/media_publish`). Instagram non ha scheduling nativo lato
server: ci pensa il cron. Se Meta è collegato la webapp usa questo canale; altrimenti
ricade su Metricool e infine su demo.

Setup:
1. Esegui `supabase/migrations/0005_social_posts_queue.sql`.
2. Env: `CRON_SECRET` (protegge il cron), `SUPABASE_SERVICE_ROLE_KEY` (il cron scrive
   lato server). `META_GRAPH_VERSION` opzionale.
3. Cron: `vercel.json` pianifica `/api/social/cron` ogni 15 min. **Su Vercel Hobby i
   cron sono limitati**: in tal caso usa un cron esterno (es. cron-job.org) che chiama
   `https://<dominio>/api/social/cron` con header `Authorization: Bearer <CRON_SECRET>`
   (o `?key=<CRON_SECRET>`).
4. Permessi Meta: la pubblicazione richiede gli scope `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish` (aggiunti all'OAuth). Gli admin già
   collegati devono **ricollegare** Meta per concederli, e serve l'**app review** Meta
   per questi permessi (come per Ads/Lead).

Note: le immagini (infografiche Nano Banana Pro) devono essere a URL pubblico
(quelle Higgsfield lo sono). La pubblicazione è "una volta sola" per post: in caso di
errore non si ritenta in automatico, per evitare doppie pubblicazioni.

### Metering lato server (registro consumi autorevole)

I contatori (phone, video, whatsapp, ads) non sono più gestiti solo dal client.
Il consumo passa dalla funzione DB `consume_meter(meter, amount)` (SECURITY
DEFINER, scoped a `auth.uid()`), che con un **lock di riga** incrementa `used`
in modo **atomico**, fa il cap a `total` (mai negativo) e rileva
l'attraversamento della **soglia del 10%** — tutto nel database, quindi
autorevole e a prova di chiamate concorrenti.

Flusso: il client fa un aggiornamento ottimistico (UI reattiva) e chiama
`/api/meter/consume`, poi **riconcilia** lo stato locale con il valore del
server e mostra l'alert 10% se restituito. Anche il consumo del meter `ads`
(lancio campagna) passa di qui.

Setup: esegui `supabase/migrations/0006_consume_meter.sql` (crea la funzione).
Nessuna nuova env.

Nota (hardening successivo, consigliato): la colonna `profiles.meters` è ancora
scrivibile dal client via upsert del profilo (provisioning del piano e top-up).
Per renderla totalmente a prova di manomissione si può aggiungere un trigger che
consenta la modifica di `meters` solo alla funzione `consume_meter` (e a una
funzione di provisioning/top-up dedicata), così il client non può azzerare i
contatori.
