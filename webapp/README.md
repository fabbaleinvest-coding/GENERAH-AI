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
