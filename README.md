# GENERAH AI — Sales Never Sleep

Sito full-stack di **GENERAH AI**, l'ecosistema di vendita autonomo guidato dall'intelligenza artificiale. Costruito con Next.js (App Router), TypeScript e Tailwind CSS, con design cinematografico ispirato ai migliori siti verticali (Apple e oltre).

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** — palette derivata dal logo (teal petrolio + navy)
- **Font**: Fraunces (display), Inter (testo), JetBrains Mono (dati)
- API route per il form contatti (`/api/contact`)

## Struttura

```
app/
  page.tsx              Home (manifesto, funzionalità, loop chiuso, il calcolo)
  piattaforma/          Le 7 funzionalità in dettaglio
  acquisizione/         Motore di media buying e direzione creativa autonomo
  settori/              B2B, B2C, cliniche mediche, dentistici, veterinari
  prezzi/               4 pacchetti + listino capacità aggiuntive (overage)
  contatti/             Form di richiesta demo
  api/contact/          Handler POST del form
components/             Nav, Footer, hero, sezioni, form, primitive UI
lib/
  i18n.tsx              Selettore lingua IT/EN con persistenza
  content.ts            Navigazione, footer, common
  content/*.ts          Contenuti bilingue per pagina
  images.ts             Manifest immagini (CDN)
public/                 Logo (monogramma, wordmark) e asset
```

## Lingue

Sito bilingue **Italiano / Inglese** con selettore nella navigazione. La preferenza è salvata nel browser.

## Immagini

Le 17 immagini sono fotografie cinematografiche generate con **Higgsfield · Nano Banana Pro**, con grading sui colori del brand. Sono servite dal CDN CloudFront di Higgsfield (URL persistenti in `lib/images.ts`).

> Per un repository totalmente self-contained, scaricare le immagini in `public/images/` e aggiornare i percorsi in `lib/images.ts`. Il CDN funziona out-of-the-box in produzione.

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build di produzione
npm start        # server di produzione
```

## Deploy su Vercel

Il progetto è pronto per Vercel: importa il repository e premi Deploy, nessuna configurazione necessaria.

Per ricevere i lead via email, configura su Vercel le variabili d'ambiente `RESEND_API_KEY` e `LEAD_TO` e decommenta il blocco di inoltro in `app/api/contact/route.ts`. Senza configurazione, i lead vengono registrati nei Runtime Logs.

## Note

Le proiezioni economiche e i prezzi sono stime di partenza per il mercato italiano e non costituiscono garanzia di risultato.

---

© GENERAH AI · *Acquisisci. Coltiva. Converti. Senza limiti. Senza sosta. Senza pari.*
