'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import type { SocialPostDraft, CampaignBrief } from '@/lib/store';
import { IMG } from '@/lib/images';
import { Guard } from '@/components/Guard';
import { AppShell } from '@/components/AppShell';
import { Container, Button, Badge, Photo, Spinner, cx } from '@/components/ui';
import VideoConsult from '@/components/VideoConsult';

type Step = 'kb' | 'social' | 'meta' | 'director' | 'video' | 'photos' | 'preview' | 'targeting' | 'launch' | 'consult';

const ORDER: Step[] = ['kb', 'social', 'meta', 'director', 'video', 'photos', 'preview', 'targeting', 'launch', 'consult'];
const PHASE2: Step[] = ['meta', 'director', 'video', 'photos', 'preview', 'targeting', 'launch'];

function phaseOf(s: Step): 1 | 2 | 3 | 4 {
  if (s === 'kb') return 1;
  if (s === 'social') return 2;
  if (s === 'consult') return 4;
  return 3;
}

const fmtBytes = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

// ── Generatore creativo simulato (regista AI) ───────────────────────────────
function buildCreative(settore: string, nome: string) {
  const s = settore.toLowerCase();
  let pain = 'i clienti giusti non ti trovano al momento giusto';
  let promise = 'la prima risposta arriva in pochi secondi, ogni volta';
  let interests = ['Imprenditori', 'PMI', 'Decision maker', 'Local business'];
  if (s.includes('clinica') || s.includes('odonto') || s.includes('veterinario')) {
    pain = 'le agende restano mezze vuote e le chiamate perse diventano pazienti persi';
    promise = 'ogni richiesta riceve risposta e prenota da sola, anche di notte';
    interests = ['Salute e benessere', 'Famiglie', 'Cura della persona', 'Prevenzione'];
  } else if (s.includes('immobiliare')) {
    pain = 'i lead immobiliari si raffreddano prima ancora che tu li richiami';
    promise = 'ogni contatto viene qualificato e fissato in visita mentre dormi';
    interests = ['Acquisto casa', 'Investimenti', 'Mutui', 'Ristrutturazione'];
  } else if (s.includes('e-commerce') || s.includes('ecommerce')) {
    pain = 'i carrelli si abbandonano e i messaggi restano senza risposta';
    promise = 'ogni dubbio del cliente trova risposta e si trasforma in ordine';
    interests = ['Shopping online', 'Offerte', 'Brand lover', 'Mobile shopper'];
  } else if (s.includes('automotive')) {
    pain = 'i preventivi auto si perdono tra mille richieste e nessuno richiama';
    promise = 'ogni richiesta di prova o preventivo viene gestita all istante';
    interests = ['Auto', 'Motori', 'Acquisto veicolo', 'Noleggio lungo termine'];
  }
  const concept = `Apertura sul problema reale: ${pain}. Tre inquadrature serrate sul volto di chi tira un respiro di sollievo quando GENERAH AI risponde. Chiusura sulla promessa: ${promise}. Tono caldo, ritmo crescente, palette oro e verde acqua.`;
  const caption = `Smetti di perdere clienti mentre fai altro. ${nome ? nome + ', ' : ''}con GENERAH AI ${promise}. 👉 Scopri come in 30 secondi.`;
  return { concept, caption, interests, audience: `Pubblico freddo nel raggio scelto, interessi: ${interests.join(', ')}. Esclusi clienti esistenti. Ottimizzazione su lead di qualità.` };
}

// ── Piano editoriale social simulato (Opus 4.8) ─────────────────────────────
export interface PlanPost {
  week: string;
  format: string;
  title: string;
  bullets: string[];
}

function buildSocialPlan(settore: string, nome: string): PlanPost[] {
  const s = settore.toLowerCase();
  // Default trasversale (B2B/B2C/servizi)
  let educa = {
    title: '5 errori che ti fanno perdere clienti',
    bullets: [
      'Rispondi troppo tardi alle richieste',
      'Non ricontatti chi non compra subito',
      'Nessun follow-up dopo il primo contatto',
      'Stesso messaggio per tutti, senza ascolto',
    ],
  };
  let dietro = {
    title: 'Come lavoriamo davvero per te',
    bullets: [
      'Ogni richiesta presa in carico in pochi secondi',
      'Un percorso su misura per ogni cliente',
      'Trasparenza totale in ogni fase',
      'La qualità prima di tutto',
    ],
  };
  let prova = {
    title: 'I risultati parlano per noi',
    bullets: [
      'Nessun contatto lasciato senza risposta',
      'Presenza attiva 24 ore su 24',
      'Clienti seguiti dal primo "ciao" alla firma',
      'Soddisfazione che si vede e si misura',
    ],
  };
  let offerta = {
    title: 'Questa settimana è il momento giusto',
    bullets: [
      'Una prima consulenza dedicata a te',
      'Risposte chiare, zero impegno',
      'Un piano costruito sul tuo obiettivo',
      'Posti limitati: scrivici ora',
    ],
  };

  if (s.includes('clinica') || s.includes('odonto') || s.includes('dent') || s.includes('veterinar') || s.includes('medic')) {
    educa = {
      title: '3 segnali da non sottovalutare',
      bullets: [
        'Rimandi i controlli da troppo tempo',
        'Fastidi che ritornano e non passano',
        'Dubbi a cui nessuno ti ha mai risposto',
        'Prevenire costa meno che curare',
      ],
    };
    dietro = {
      title: 'Cosa trovi nel nostro studio',
      bullets: [
        'Accoglienza e ascolto, senza fretta',
        'Tecnologie e protocolli aggiornati',
        'Un piano di cura spiegato con chiarezza',
        'Promemoria e richiami gestiti per te',
      ],
    };
    prova = {
      title: 'Perché i pazienti si fidano di noi',
      bullets: [
        'Risposte e prenotazioni anche fuori orario',
        'Nessuna richiesta lasciata in attesa',
        'Percorsi seguiti passo dopo passo',
        'Recensioni che parlano da sole',
      ],
    };
    offerta = {
      title: 'Prima visita: prenota questa settimana',
      bullets: [
        'Valutazione iniziale dedicata',
        'Preventivo chiaro e trasparente',
        'Agenda flessibile, anche la sera',
        'Posti limitati per la settimana',
      ],
    };
  } else if (s.includes('e-commerce') || s.includes('ecommerce') || s.includes('negozio') || s.includes('retail') || s.includes('shop')) {
    educa = {
      title: 'Come scegliere senza sbagliare',
      bullets: [
        'I 3 dettagli che fanno la differenza',
        'Gli errori più comuni da evitare',
        'Come capire la qualità reale',
        'Quando conviene davvero acquistare',
      ],
    };
    offerta = {
      title: 'Offerta della settimana',
      bullets: [
        'Selezione speciale a tempo limitato',
        'Spedizione e reso senza pensieri',
        'Assistenza che risponde subito',
        'Fino a esaurimento scorte',
      ],
    };
  } else if (s.includes('immobiliare') || s.includes('real estate')) {
    educa = {
      title: 'Vendere casa: 4 cose da sapere',
      bullets: [
        'Il prezzo giusto fin dal primo giorno',
        'Le foto contano più di quanto pensi',
        'Come filtrare i contatti seri',
        'I tempi reali di una trattativa',
      ],
    };
    offerta = {
      title: 'Valutazione gratuita del tuo immobile',
      bullets: [
        'Stima di mercato aggiornata',
        'Strategia di vendita su misura',
        'Contatti qualificati, non curiosi',
        'Prenotala questa settimana',
      ],
    };
  }

  return [
    { week: 'Settimana 1', format: 'Educativo', ...educa },
    { week: 'Settimana 2', format: 'Dietro le quinte', ...dietro },
    { week: 'Settimana 3', format: 'Riprova sociale', ...prova },
    { week: 'Settimana 4', format: 'Offerta', ...offerta },
  ];
}

function StepRail({ current }: { current: Step }) {
  const ph = phaseOf(current);
  const items = [
    { n: 1, label: 'Knowledge base' },
    { n: 2, label: 'Contenuti social' },
    { n: 3, label: 'Campagne Meta' },
    { n: 4, label: 'Video-consulto' },
  ];
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {items.map((it, i) => {
        const state = ph > it.n ? 'done' : ph === it.n ? 'active' : 'todo';
        return (
          <div key={it.n} className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2.5">
              <span
                className={cx(
                  'flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[0.78rem] font-bold transition',
                  state === 'done' && 'border-teal-300/50 bg-teal-400 text-ink-900',
                  state === 'active' && 'border-teal-300 bg-teal-400/15 text-teal-200',
                  state === 'todo' && 'border-white/15 text-mist/60'
                )}
              >
                {state === 'done' ? '✓' : it.n}
              </span>
              <span className={cx('hidden text-[0.84rem] font-medium sm:block', state === 'todo' ? 'text-mist/60' : 'text-bone')}>
                {it.label}
              </span>
            </div>
            {i < items.length - 1 && <span className={cx('h-px w-6 sm:w-12', ph > it.n ? 'bg-teal-300/50' : 'bg-white/12')} />}
          </div>
        );
      })}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-10 max-w-3xl animate-fade-up rounded-3xl border border-white/10 bg-ink-900/40 p-6 sm:p-9">{children}</div>
  );
}

function IntegrationTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-teal-300/20 bg-teal-400/5 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-teal-200/90">
      {children}
    </span>
  );
}

function OnboardingInner() {
  const { user, addKb, removeKb, connectSocial, scheduleSocialPosts, generateSocialPlan, skipSocial, connectMeta, skipPhase2, launchCampaign, generateCampaignBrief, generateAdVideo, useVideoConsult, finishOnboarding } = useStore();
  const router = useRouter();
  const [step, setStep] = useState<Step>('kb');
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const xlsRef = useRef<HTMLInputElement>(null);

  // stato simulazioni
  const [running, setRunning] = useState(false);
  const [directorDone, setDirectorDone] = useState(false);
  const [videoDone, setVideoDone] = useState(false);
  const [videoProgress, setVideoProgress] = useState('');
  const [adClips, setAdClips] = useState<string[]>([]);
  const [adAudio, setAdAudio] = useState<string | null>(null);
  const [photoChoice, setPhotoChoice] = useState<'upload' | 'generate' | null>(null);
  const [photoReady, setPhotoReady] = useState(false);

  // stato fase 2 · contenuti social
  const socialPlan = useMemo(() => buildSocialPlan(user?.settore ?? '', user?.nome ?? ''), [user?.settore, user?.nome]);
  const [socialGenerating, setSocialGenerating] = useState(false);
  const [socialPlanReady, setSocialPlanReady] = useState(false);
  const [socialScheduling, setSocialScheduling] = useState(false);
  const [socialScheduled, setSocialScheduled] = useState(false);
  const [aiPlan, setAiPlan] = useState<SocialPostDraft[] | null>(null);
  const plan: PlanPost[] = aiPlan ?? socialPlan;

  // config campagna
  const creative = useMemo(() => buildCreative(user?.settore ?? '', user?.nome ?? ''), [user?.settore, user?.nome]);
  const [aiBrief, setAiBrief] = useState<CampaignBrief | null>(null);
  const effConcept = aiBrief?.videoConcept || creative.concept;
  const effCaption = aiBrief?.postText || creative.caption;
  const effInterests = aiBrief?.interests?.length ? aiBrief.interests : creative.interests;
  const effAudience = aiBrief?.audienceDescription || creative.audience;
  const [budget, setBudget] = useState(30);
  const [geo, setGeo] = useState('Milano + 25 km');
  const [ageRange, setAgeRange] = useState('25-54');
  const [contacts, setContacts] = useState<number>(0);
  const [launched, setLaunched] = useState(false);
  const [consultDone, setConsultDone] = useState(false);

  if (!user) return null;

  function goNext() {
    const i = ORDER.indexOf(step);
    if (i < ORDER.length - 1) setStep(ORDER[i + 1]);
  }
  function skipToConsult() {
    skipPhase2();
    setStep('consult');
  }
  function skipSocialPhase() {
    skipSocial();
    setStep('meta');
  }
  async function genSocialPlan() {
    setSocialGenerating(true);
    const r = await generateSocialPlan();
    if (r.ok && r.posts && r.posts.length) setAiPlan(r.posts);
    // se l'AI non è disponibile (es. chiave mancante), si usa il piano di fallback
    setSocialGenerating(false);
    setSocialPlanReady(true);
  }
  function scheduleSocial() {
    setSocialScheduling(true);
    setTimeout(() => {
      scheduleSocialPosts(
        plan.map((p) => ({
          week: p.week,
          format: p.format,
          title: p.title,
          bullets: p.bullets,
          caption: (p as SocialPostDraft).caption,
          imagePrompt: (p as SocialPostDraft).imagePrompt,
        }))
      );
      setSocialScheduling(false);
      setSocialScheduled(true);
    }, 1800);
  }

  function onPickKb(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addKb(files);
    e.target.value = '';
  }

  async function runDirector() {
    setRunning(true);
    const r = await generateCampaignBrief({ objective: 'Lead generation', budgetDaily: budget, geo, ageRange });
    if (r.ok && r.brief) setAiBrief(r.brief);
    // fallback: se l'AI non è disponibile (chiave mancante), resta il concept integrato
    setRunning(false);
    setDirectorDone(true);
  }
  async function runVideo() {
    // Senza brief AI (chiave Anthropic assente) non ci sono scene da generare:
    // resta il rendering simulato come prima.
    if (!aiBrief || !aiBrief.scenes.length) {
      setRunning(true);
      setTimeout(() => {
        setRunning(false);
        setVideoDone(true);
      }, 2600);
      return;
    }
    setRunning(true);
    setVideoProgress('Avvio della pipeline…');
    const r = await generateAdVideo(aiBrief, (m) => setVideoProgress(m));
    setRunning(false);
    if (r.ok && r.clips.length) {
      setAdClips(r.clips);
      setAdAudio(r.audioUrl);
      setVideoProgress('');
      setVideoDone(true);
    } else {
      const msg = r.error || 'Generazione non riuscita';
      setVideoProgress(msg);
      // Se la pipeline non è configurata (env Higgsfield assente), completa
      // comunque l'onboarding in modalità dimostrativa.
      if (/configur/i.test(msg)) setVideoDone(true);
    }
  }
  function choosePhotos(choice: 'upload' | 'generate') {
    setPhotoChoice(choice);
    if (choice === 'generate') {
      setPhotoReady(false);
      setRunning(true);
      setTimeout(() => {
        setRunning(false);
        setPhotoReady(true);
      }, 2200);
    }
  }
  function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    if ((e.target.files?.length ?? 0) > 0) setPhotoReady(true);
    e.target.value = '';
  }
  function onPickXls(e: React.ChangeEvent<HTMLInputElement>) {
    if ((e.target.files?.length ?? 0) > 0) setContacts(100 + Math.floor(Math.random() * 380));
    e.target.value = '';
  }

  function doLaunch() {
    setRunning(true);
    setTimeout(() => {
      launchCampaign({
        name: aiBrief?.campaignName || `Lead-gen ${user!.settore.split('·')[0].trim()} · ${geo}`,
        objective: 'Lead generation',
        dailyBudget: budget,
        geo,
        audience: effAudience,
        ageRange,
        interests: effInterests,
        postText: effCaption,
        videoConcept: effConcept,
        lookalike: contacts >= 100,
        brief: aiBrief ?? undefined,
      });
      setRunning(false);
      setLaunched(true);
    }, 1800);
  }

  function finish() {
    finishOnboarding();
    router.replace('/dashboard');
  }

  return (
    <Container wide className="py-10 sm:py-12">
      <StepRail current={step} />

      {/* ════════ FASE 1 · KNOWLEDGE BASE ════════ */}
      {step === 'kb' && (
        <Panel>
          <Badge tone="teal">Fase 1 di 4</Badge>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-bone">Dai un cervello alla tua AI</h1>
          <p className="mt-3 leading-relaxed text-mist">
            Carica tutto il materiale del tuo business: brochure, listini, presentazioni, script di
            vendita, FAQ, casi studio. Diventerà la memoria con cui GENERAH AI parla ai tuoi clienti,
            scrive le campagne e conduce i video-consulti.
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              if (files.length) addKb(files);
            }}
            className="mt-6 cursor-pointer rounded-2xl border border-dashed border-white/20 bg-ink/40 px-6 py-10 text-center transition hover:border-teal-300/50 hover:bg-teal-400/[0.03]"
          >
            <svg viewBox="0 0 24 24" className="mx-auto h-9 w-9 text-teal-300" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
            </svg>
            <p className="mt-3 text-[0.95rem] font-medium text-bone">Trascina qui i file o clicca per selezionare</p>
            <p className="mt-1 text-[0.8rem] text-mist/70">PDF, DOCX, PPTX, XLSX, immagini · fino a 50 file</p>
          </div>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onPickKb} />

          {user.kb.length > 0 && (
            <ul className="mt-5 space-y-2">
              {user.kb.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-ink/50 px-3.5 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-400/15 font-mono text-[0.6rem] uppercase text-teal-200">
                    {(f.name.split('.').pop() ?? 'doc').slice(0, 4)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.86rem] text-bone">{f.name}</span>
                    <span className="block text-[0.72rem] text-mist/60">{fmtBytes(f.size)}</span>
                    {f.indexStatus === 'pending' && <span className="mt-0.5 block text-[0.7rem] text-amber-soft">Indicizzazione…</span>}
                    {f.indexStatus === 'indexed' && <span className="mt-0.5 block text-[0.7rem] text-teal-200">Indicizzato · {f.chunks ?? 0} frammenti</span>}
                    {f.indexStatus === 'unsupported' && <span className="mt-0.5 block text-[0.7rem] text-mist/50">Non indicizzabile</span>}
                    {f.indexStatus === 'error' && <span className="mt-0.5 block text-[0.7rem] text-coral">Errore indicizzazione</span>}
                  </span>
                  <button onClick={() => removeKb(f.id)} className="rounded-lg p-1.5 text-mist transition hover:bg-coral/10 hover:text-coral" aria-label="Rimuovi">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-7 flex items-center justify-between">
            <span className="text-[0.8rem] text-mist/70">
              {user.kb.length === 0 ? 'Nessun file caricato' : `${user.kb.length} file in memoria`}
            </span>
            <Button onClick={goNext} disabled={user.kb.length === 0}>
              Continua ai contenuti social
            </Button>
          </div>
        </Panel>
      )}

      {/* ════════ FASE 2 · CONTENUTI SOCIAL ════════ */}
      {step === 'social' && (
        <Panel>
          <div className="flex items-center justify-between">
            <Badge tone="teal">Fase 2 di 4 · Contenuti social</Badge>
            <button onClick={skipSocialPhase} className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mist/60 transition hover:text-mist">
              Salta questa fase →
            </button>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-bone">Pubblica ogni settimana, in automatico</h1>
          <p className="mt-3 leading-relaxed text-mist">
            Collega Instagram e Facebook: Opus 4.8 legge la tua knowledge base e crea un post a
            settimana — testo persuasivo e infografica con bullet point generata con Nano Banana Pro —
            programmandolo in automatico tramite Metricool. Tu approvi, l intelligenza pubblica.
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <Photo src={IMG.socialFeed} alt="Feed social brandizzato creato dall AI" overlay="bottom" ratio="aspect-[16/9]" rounded="">
              <div className="flex h-full items-end p-5">
                <div className="flex flex-wrap gap-2">
                  <IntegrationTag>Opus 4.8 · copy</IntegrationTag>
                  <IntegrationTag>Nano Banana Pro · infografiche</IntegrationTag>
                  <IntegrationTag>Metricool · scheduling</IntegrationTag>
                  <IntegrationTag>1 post / settimana</IntegrationTag>
                </div>
              </div>
            </Photo>
          </div>

          {/* connessione account */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                net: 'ig' as const,
                name: 'Instagram',
                sub: 'Profilo business',
                connected: user.igConnected,
                icon: (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                    <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3zm6.8-11.2a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5z" />
                  </svg>
                ),
                tint: 'bg-[#E1306C]/15 text-[#ff5b95]',
              },
              {
                net: 'fb' as const,
                name: 'Facebook',
                sub: 'Pagina aziendale',
                connected: user.fbConnected,
                icon: (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                    <path d="M24 12c0-6.6-5.4-12-12-12S0 5.4 0 12c0 6 4.4 11 10.1 11.9v-8.4H7v-3.5h3.1V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.4l-.5 3.5h-2.9V24C19.6 23 24 18 24 12z" />
                  </svg>
                ),
                tint: 'bg-[#1877F2]/15 text-[#4596ff]',
              },
              {
                net: 'metricool' as const,
                name: 'Metricool',
                sub: 'Programmazione',
                connected: user.metricoolConnected,
                icon: (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M3 9h18M8 2v4M16 2v4M8 14h2m4 0h2M8 18h2m4 0h2" />
                  </svg>
                ),
                tint: 'bg-teal-400/15 text-teal-200',
              },
            ].map((c) => (
              <div key={c.net} className="rounded-2xl border border-white/8 bg-ink/40 p-4">
                <div className={cx('flex h-10 w-10 items-center justify-center rounded-xl', c.tint)}>{c.icon}</div>
                <p className="mt-3 text-[0.92rem] font-medium text-bone">{c.name}</p>
                <p className="text-[0.76rem] text-mist/70">{c.sub}</p>
                {c.connected ? (
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-teal-200">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 13l4 4L19 7" /></svg>
                    Collegato
                  </span>
                ) : (
                  <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => connectSocial(c.net)}>
                    Connetti
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-mist/45">
            Punto di integrazione · in demo le connessioni sono simulate
          </p>

          {/* generazione piano editoriale */}
          {(() => {
            const allConnected = user.igConnected && user.fbConnected && user.metricoolConnected;
            if (!socialPlanReady) {
              return (
                <div className="mt-7">
                  {socialGenerating ? (
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-ink/40 py-12">
                      <Spinner className="h-7 w-7 text-teal-300" />
                      <p className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-teal-200/80 animate-pulse">
                        Opus 4.8 · stesura piano editoriale + infografiche…
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Button size="lg" onClick={genSocialPlan} disabled={!allConnected}>
                        Genera il piano editoriale del mese
                      </Button>
                      {!allConnected && (
                        <p className="mt-3 text-[0.78rem] text-mist/60">Collega Instagram, Facebook e Metricool per procedere.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div className="mt-7">
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-teal-300/80">
                  Piano editoriale · 4 post · 1 a settimana
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {plan.map((p) => (
                    <div key={p.week} className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900">
                      <Photo src={IMG.socialPost} alt={`Infografica · ${p.title}`} overlay="none" ratio="aspect-[4/5]" rounded="">
                        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/45" />
                        <div className="relative flex h-full flex-col p-4">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-teal-400/90 px-2 py-0.5 font-mono text-[0.58rem] font-bold uppercase tracking-wider text-ink-900">{p.week}</span>
                            <span className="rounded-md border border-white/20 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-wider text-bone/80">{p.format}</span>
                          </div>
                          <div className="mt-auto">
                            <p className="font-display text-[1.15rem] font-semibold leading-tight text-bone">{p.title}</p>
                            <ul className="mt-2.5 space-y-1.5">
                              {p.bullets.map((b) => (
                                <li key={b} className="flex items-start gap-2 text-[0.8rem] leading-snug text-bone/90">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" />
                                  {b}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </Photo>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <IntegrationTag>Testo: Opus 4.8</IntegrationTag>
                  <IntegrationTag>Infografica: Nano Banana Pro</IntegrationTag>
                  <IntegrationTag>Programmazione: Metricool</IntegrationTag>
                </div>

                {!socialScheduled ? (
                  <div className="mt-6 flex items-center justify-between">
                    <button onClick={skipSocialPhase} className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mist/60 transition hover:text-mist">
                      Salta questa fase →
                    </button>
                    <Button size="lg" onClick={scheduleSocial} disabled={socialScheduling}>
                      {socialScheduling ? (
                        <>
                          <Spinner className="h-4 w-4" /> Programmazione…
                        </>
                      ) : (
                        'Programma i 4 post su Metricool'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-teal-300/30 bg-teal-400/[0.05] p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-400 text-ink-900">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="mt-3 font-display text-xl font-semibold text-bone">4 post programmati!</p>
                    <p className="mt-1.5 text-[0.9rem] text-mist">
                      Un post a settimana è in coda su Metricool. Da qui in poi GENERAH AI pubblica da solo.
                    </p>
                    <Button className="mt-5" onClick={() => setStep('meta')}>
                      Continua alle campagne
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </Panel>
      )}

      {/* ════════ FASE 2 · META ADS ════════ */}
      {step === 'meta' && (
        <Panel>
          <div className="flex items-center justify-between">
            <Badge tone="teal">Fase 3 di 4 · Campagne Meta</Badge>
            <button onClick={skipToConsult} className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mist/60 transition hover:text-mist">
              Salta questa fase →
            </button>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-bone">Collega Meta e lascia fare all AI</h1>
          <p className="mt-3 leading-relaxed text-mist">
            Connetti il tuo account Meta Business: GENERAH AI userà la tua knowledge base per
            progettare la creatività, scrivere il copy, costruire il pubblico e lanciare la campagna
            lead-gen. Tu autorizzi, l intelligenza esegue.
          </p>

          <div className="mt-6 rounded-2xl border border-white/8 bg-ink/40 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1877F2]/15 text-[#4596ff]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M24 12c0-6.6-5.4-12-12-12S0 5.4 0 12c0 6 4.4 11 10.1 11.9v-8.4H7v-3.5h3.1V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.4l-.5 3.5h-2.9V24C19.6 23 24 18 24 12z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[0.95rem] font-medium text-bone">Meta Business Suite</p>
                <p className="text-[0.8rem] text-mist/70">Facebook & Instagram Ads</p>
              </div>
              {user.metaConnected ? (
                <Badge tone="teal">Collegato</Badge>
              ) : (
                <Button size="sm" onClick={connectMeta}>
                  Connetti account
                </Button>
              )}
            </div>
            <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-mist/45">
              Punto di integrazione · in demo la connessione è simulata
            </p>
          </div>

          <div className="mt-7 flex justify-end">
            <Button onClick={goNext} disabled={!user.metaConnected}>
              Avvia il regista AI
            </Button>
          </div>
        </Panel>
      )}

      {step === 'director' && (
        <Panel>
          <Badge tone="amber">Regista AI · Opus 4.8</Badge>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-bone">Scrivo la tua creatività</h1>
          <p className="mt-3 leading-relaxed text-mist">
            Opus 4.8 analizza la knowledge base e il tuo settore ({user.settore}) e si comporta come un
            regista pubblicitario: definisce il concept, il ritmo e le parole che convertono.
          </p>

          {!directorDone ? (
            <div className="mt-7">
              {running ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-ink/40 py-12">
                  <Spinner className="h-7 w-7 text-teal-300" />
                  <p className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-teal-200/80 animate-pulse">
                    Analisi materiali · stesura sceneggiatura…
                  </p>
                </div>
              ) : (
                <div className="flex justify-center">
                  <Button size="lg" variant="amber" onClick={runDirector}>
                    Genera il concept video
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-teal-300/25 bg-teal-400/[0.04] p-5">
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-teal-300/80">Concept · 2 scene da 15s consecutive</p>
                <p className="mt-2 leading-relaxed text-bone/90">{effConcept}</p>
              </div>
              {aiBrief && aiBrief.scenes.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {aiBrief.scenes.map((sc) => (
                    <div key={sc.n} className="rounded-2xl border border-white/8 bg-ink/40 p-4">
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-teal-200/80">Scena {sc.n} · {sc.durationSec}s</p>
                      <p className="mt-2 text-[0.84rem] leading-relaxed text-bone/90">{sc.visual}</p>
                      <p className="mt-2 text-[0.78rem] text-mist"><span className="text-mist/55">Voce (Roman):</span> {sc.voiceover}</p>
                      {sc.onScreenText && (
                        <p className="mt-1 text-[0.78rem] text-mist"><span className="text-mist/55">Testo a schermo:</span> {sc.onScreenText}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {aiBrief?.music && (
                <div className="rounded-2xl border border-white/8 bg-ink/40 p-4">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mist/70">Musica</p>
                  <p className="mt-1.5 text-[0.84rem] leading-relaxed text-bone/90">{aiBrief.music}</p>
                </div>
              )}
              <div className="rounded-2xl border border-white/8 bg-ink/40 p-5">
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-mist/70">Caption proposta</p>
                <p className="mt-2 leading-relaxed text-bone/90">{effCaption}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <IntegrationTag>Higgsfield · Kling 3.0 Turbo</IntegrationTag>
                <IntegrationTag>9:16 · 720p</IntegrationTag>
                <IntegrationTag>2 × 15s consecutivi</IntegrationTag>
                <IntegrationTag>Voce: Roman · ElevenLabs</IntegrationTag>
              </div>
              <div className="flex justify-end pt-1">
                <Button onClick={goNext}>Genera i video</Button>
              </div>
            </div>
          )}
        </Panel>
      )}

      {step === 'video' && (
        <Panel>
          <Badge tone="teal">Generazione video</Badge>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-bone">Due clip, un unico spot</h1>
          <p className="mt-3 leading-relaxed text-mist">
            GENERAH AI genera due video consecutivi da 15 secondi con voce narrante e testo a schermo,
            poi li unisce in un unico spot con sottotitoli automatici e musica continua.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-[0.8fr_1fr]">
            <Photo src={IMG.adVertical} alt="Anteprima dello spot verticale generato dall AI" overlay="bottom" ratio="aspect-[9/16]" rounded="rounded-2xl">
              <div className="flex h-full flex-col items-center justify-center">
                {videoDone ? (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-bone/40 bg-ink/40 backdrop-blur">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-0.5 text-bone" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                ) : running ? (
                  <Spinner className="h-8 w-8 text-bone" />
                ) : null}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-bone/80">{videoDone ? 'Spot pronto · 0:30' : 'Rendering…'}</p>
              </div>
            </Photo>

            <div>
              {!videoDone ? (
                running ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-teal-300/25 bg-teal-400/[0.04] px-3.5 py-3">
                      <Spinner className="h-4 w-4 text-teal-300" />
                      <span className="text-[0.85rem] text-mist">{videoProgress || 'Generazione in corso…'}</span>
                    </div>
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-mist/45">
                      Pipeline reale Higgsfield · immagine → clip per scena → voiceover
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full flex-col justify-center">
                    <Button size="lg" onClick={runVideo}>
                      Avvia la generazione
                    </Button>
                    <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-mist/45">
                      Pipeline reale · richiede HIGGSFIELD_CREDENTIALS (env)
                    </p>
                    {videoProgress && (
                      <p className="mt-2 text-[0.78rem] text-amber-300/80">{videoProgress}</p>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {adClips.length > 0 ? (
                    <>
                      {adClips.map((u, i) => (
                        <video
                          key={i}
                          src={u}
                          controls
                          playsInline
                          className="w-full rounded-xl border border-white/8 bg-ink/40"
                        />
                      ))}
                      {adAudio && (
                        <div className="rounded-xl border border-teal-300/20 bg-teal-400/[0.04] p-3">
                          <p className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-teal-300/80">
                            Voiceover · Roman
                          </p>
                          <audio src={adAudio} controls className="w-full" />
                        </div>
                      )}
                      <p className="text-[0.74rem] leading-relaxed text-mist/60">
                        Clip generati con la pipeline Higgsfield. Il montaggio in un unico spot 0:30 con
                        sottotitoli automatici avviene nel passo successivo.
                      </p>
                    </>
                  ) : (
                    [
                      ['Scena 1', 'Il problema, volti reali'],
                      ['Scena 2', 'La promessa, sollievo e CTA'],
                      ['Voce', 'Roman · calda, italiana'],
                      ['Montaggio', 'Sottotitoli + musica continua'],
                    ].map(([a, b]) => (
                      <div key={a} className="flex items-center gap-3 rounded-xl border border-teal-300/20 bg-teal-400/[0.04] px-3.5 py-3">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-teal-300" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[0.85rem] text-bone">
                          <span className="font-medium">{a}</span> · <span className="text-mist">{b}</span>
                        </span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-end pt-2">
                    <Button onClick={goNext}>Aggiungi le immagini</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Panel>
      )}

      {step === 'photos' && (
        <Panel>
          <Badge tone="teal">Immagini dello spot</Badge>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-bone">Le tue foto o generate da zero?</h1>
          <p className="mt-3 leading-relaxed text-mist">
            Puoi caricare foto della tua attività, dei prodotti o del team, oppure lasciare che
            GENERAH AI le generi su misura con Nano Banana Pro, coerenti con il concept.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => {
                setPhotoChoice('upload');
                photoRef.current?.click();
              }}
              className={cx(
                'rounded-2xl border p-5 text-left transition',
                photoChoice === 'upload' ? 'border-teal-300/50 bg-teal-400/[0.05]' : 'border-white/10 bg-ink/40 hover:border-teal-300/30'
              )}
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-teal-300" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
              </svg>
              <p className="mt-3 font-display text-lg font-semibold text-bone">Carico le mie foto</p>
              <p className="mt-1 text-[0.82rem] text-mist/80">Usa materiale reale della tua attività.</p>
            </button>
            <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickPhotos} />

            <button
              onClick={() => choosePhotos('generate')}
              className={cx(
                'rounded-2xl border p-5 text-left transition',
                photoChoice === 'generate' ? 'border-teal-300/50 bg-teal-400/[0.05]' : 'border-white/10 bg-ink/40 hover:border-teal-300/30'
              )}
            >
              <div className="flex items-center justify-between">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 3l2.1 4.9L19 10l-4.9 2.1L12 17l-2.1-4.9L5 10l4.9-2.1z" />
                </svg>
                <IntegrationTag>Nano Banana Pro</IntegrationTag>
              </div>
              <p className="mt-3 font-display text-lg font-semibold text-bone">Genera da zero</p>
              <p className="mt-1 text-[0.82rem] text-mist/80">Immagini su misura create dall AI.</p>
            </button>
          </div>

          {running && photoChoice === 'generate' && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/8 bg-ink/40 px-4 py-3">
              <Spinner className="h-4 w-4 text-amber" />
              <span className="text-[0.85rem] text-mist animate-pulse">Generazione immagini con Nano Banana Pro…</span>
            </div>
          )}
          {photoReady && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-teal-300/25 bg-teal-400/[0.05] px-4 py-3 text-[0.86rem] text-teal-200">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Immagini pronte e integrate nello spot.
            </div>
          )}

          <div className="mt-7 flex justify-end">
            <Button onClick={goNext} disabled={!photoReady}>
              Vedi il post finale
            </Button>
          </div>
        </Panel>
      )}

      {step === 'preview' && (
        <Panel>
          <Badge tone="teal">Anteprima del post</Badge>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-bone">Ecco come apparirà</h1>
          <p className="mt-3 leading-relaxed text-mist">Controlla lo spot assemblato e la caption prima del lancio. Tutto modificabile, niente è ancora pubblicato.</p>

          <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-ink-900">
            <div className="flex items-center gap-2.5 p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-400 font-mono text-[0.66rem] font-bold uppercase text-ink-900">
                {(user.nome[0] ?? '') + (user.cognome[0] ?? '')}
              </span>
              <div className="leading-tight">
                <p className="text-[0.82rem] font-semibold text-bone">{user.nome} {user.cognome}</p>
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-mist/60">Sponsorizzato</p>
              </div>
            </div>
            <Photo src={IMG.adVertical} alt="Spot finale" overlay="none" ratio="aspect-[4/5]" rounded="">
              <div className="flex h-full items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-bone/40 bg-ink/30 backdrop-blur">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-0.5 text-bone" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
            </Photo>
            <div className="p-3.5">
              <p className="text-[0.86rem] leading-relaxed text-bone/90">{effCaption}</p>
              <button className="mt-3 w-full rounded-lg bg-teal-400 py-2 text-[0.82rem] font-semibold text-ink-900">Scopri di più</button>
            </div>
          </div>

          <div className="mt-7 flex justify-end">
            <Button onClick={goNext}>Imposta budget e pubblico</Button>
          </div>
        </Panel>
      )}

      {step === 'targeting' && (
        <Panel>
          <Badge tone="teal">Budget, geografia e pubblico</Badge>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-bone">Ultimi dettagli, poi parte</h1>
          <p className="mt-3 leading-relaxed text-mist">
            Imposta budget e area. Mentre lo fai, l AI costruisce il pubblico ideale. Per un targeting
            ancora più preciso, carica una lista di almeno 100 contatti: GENERAH AI creerà un pubblico
            simile (lookalike).
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[0.82rem] font-medium text-bone/80">Budget giornaliero</label>
              <div className="flex items-center gap-3">
                <input type="range" min={10} max={300} step={5} value={budget} onChange={(e) => setBudget(+e.target.value)} className="flex-1 accent-teal-400" />
                <span className="w-20 text-right font-display text-xl font-semibold text-bone">{budget} €</span>
              </div>
              <p className="mt-1 text-[0.74rem] text-mist/60">≈ {budget * 30} € / mese di spesa pubblicitaria</p>
            </div>

            <div>
              <label className="mb-1.5 block text-[0.82rem] font-medium text-bone/80">Fascia di età</label>
              <div className="grid grid-cols-3 gap-2">
                {['18-34', '25-54', '35-65'].map((a) => (
                  <button
                    key={a}
                    onClick={() => setAgeRange(a)}
                    className={cx(
                      'rounded-xl border py-2.5 font-mono text-[0.8rem] transition',
                      ageRange === a ? 'border-teal-300/50 bg-teal-400/10 text-teal-200' : 'border-white/10 text-mist hover:border-teal-300/30'
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[0.82rem] font-medium text-bone/80">Area geografica</label>
              <input
                value={geo}
                onChange={(e) => setGeo(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink/70 px-4 py-3 text-[0.9rem] text-bone focus:border-teal-300/60 focus:outline-none"
              />
            </div>
          </div>

          {/* pubblico AI */}
          <div className="mt-5 rounded-2xl border border-white/8 bg-ink/40 p-5">
            <p className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-teal-300/80">Pubblico costruito dall AI</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {effInterests.map((it) => (
                <span key={it} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.8rem] text-mist">{it}</span>
              ))}
            </div>
          </div>

          {/* lookalike */}
          <div className="mt-4 rounded-2xl border border-white/8 bg-ink/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.9rem] font-medium text-bone">Pubblico simile (lookalike)</p>
                <p className="text-[0.8rem] text-mist/70">Carica un file Excel/CSV con almeno 100 contatti.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => xlsRef.current?.click()}>
                Carica lista
              </Button>
              <input ref={xlsRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onPickXls} />
            </div>
            {contacts > 0 && (
              <p className="mt-3 flex items-center gap-2 text-[0.84rem] text-teal-200">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 13l4 4L19 7" /></svg>
                {contacts} contatti rilevati · lookalike attivabile.
              </p>
            )}
          </div>

          {!launched ? (
            <div className="mt-7 flex items-center justify-between">
              <button onClick={skipToConsult} className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mist/60 transition hover:text-mist">
                Salta questa fase →
              </button>
              <Button size="lg" onClick={doLaunch} disabled={running}>
                {running ? (
                  <>
                    <Spinner className="h-4 w-4" /> Lancio in corso…
                  </>
                ) : (
                  'Lancia la campagna'
                )}
              </Button>
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-teal-300/30 bg-teal-400/[0.05] p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-400 text-ink-900">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="mt-3 font-display text-xl font-semibold text-bone">Campagna attiva!</p>
              <p className="mt-1.5 text-[0.9rem] text-mist">
                Modulo di acquisizione pubblicato. I lead arriveranno nel tuo CRM in tempo reale.
              </p>
              <Button className="mt-5" onClick={goNext}>
                Passa al video-consulto
              </Button>
            </div>
          )}
        </Panel>
      )}

      {/* ════════ FASE 4 · VIDEO-CONSULTO ════════ */}
      {step === 'consult' && (
        <Panel>
          <Badge tone="teal">Fase 4 di 4 · Video-consulto</Badge>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-bone">Prova il tuo consulente AI</h1>
          <p className="mt-3 leading-relaxed text-mist">
            Un video-consulto reale di 5 minuti, in omaggio una tantum. L avatar parla con voce naturale e
            attinge alla knowledge base caricata in Fase 1: è lo stesso consulente che riceverà i tuoi clienti.
          </p>

          {user.videoConsultUsed ? (
            <div className="mt-6 rounded-2xl border border-white/8 bg-ink-900/40 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-400 text-ink-900">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="mt-3 font-display text-xl font-semibold text-bone">Prova completata</p>
              <p className="mt-1.5 text-[0.9rem] text-mist">
                Il consulto gratuito è stato utilizzato. Ritrovi il consulente nella dashboard, con i minuti video del tuo piano.
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <VideoConsult
                mode="trial"
                maxMinutes={5}
                onEnded={() => {
                  useVideoConsult();
                  setConsultDone(true);
                }}
              />
            </div>
          )}

          <div className="mt-7 flex items-center justify-between">
            <span className="text-[0.8rem] text-mist/70">
              {consultDone || user.videoConsultUsed ? 'Tutto pronto. La tua console ti aspetta.' : 'Prova gratuita di 5 minuti · non scala i minuti del piano.'}
            </span>
            <Button size="lg" onClick={finish}>
              {consultDone || user.videoConsultUsed ? 'Entra nella dashboard' : 'Salta ed entra'}
            </Button>
          </div>
        </Panel>
      )}
    </Container>
  );
}

export default function OnboardingPage() {
  return (
    <Guard need="plan">
      <AppShell>
        <OnboardingInner />
      </AppShell>
    </Guard>
  );
}
