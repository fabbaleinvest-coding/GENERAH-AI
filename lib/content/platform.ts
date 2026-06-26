import { IMG } from '../images';
import type { LS } from '../content';

type Block = {
  id: string;
  num: string;
  tag: LS;
  title: LS;
  lead: LS;
  points: { it: string[]; en: string[] };
  image: string;
  align: 'left' | 'right';
};

export const platform = {
  hero: {
    image: IMG.crmDashboard,
    eyebrow: { it: 'La piattaforma', en: 'The platform' },
    title: {
      it: 'Sette funzionalità. Una sola intelligenza.',
      en: 'Seven capabilities. One single intelligence.',
    },
    sub: {
      it: 'Ogni funzione di GENERAH AI è progettata per eliminare un punto in cui un contatto resta senza risposta. Insieme, formano un reparto commerciale completo che non si ferma mai.',
      en: 'Every GENERAH AI function is designed to eliminate a point where a contact goes unanswered. Together, they form a complete commercial department that never stops.',
    },
  },

  blocks: <Block[]>[
    {
      id: 'acquisizione',
      num: '01',
      tag: { it: 'Acquisizione clienti e pazienti', en: 'Customer & patient acquisition' },
      title: { it: 'La rete invisibile che cattura ogni opportunità', en: 'The invisible net that catches every opportunity' },
      lead: {
        it: 'GENERAH AI lavora come una rete instancabile gettata sopra ogni canale da cui può arrivare un contatto. Un form compilato, un messaggio WhatsApp, un commento, un’email a qualunque ora: nessuna micro-opportunità cade più nel vuoto.',
        en: 'GENERAH AI works as a tireless net cast over every channel a contact can arrive from. A submitted form, a WhatsApp message, a comment, an email at any hour: no micro-opportunity falls through the cracks anymore.',
      },
      points: {
        it: [
          'Intercetta il contatto nell’istante esatto in cui manifesta interesse',
          'Qualifica automaticamente chi hai di fronte, cosa desidera, quanto è pronto',
          'Adatta tono e strategia a ogni interlocutore, non un messaggio uguale per tutti',
        ],
        en: [
          'Intercepts the contact the exact moment they show interest',
          'Automatically qualifies who they are, what they want, how ready they are',
          'Adapts tone and strategy to each person — not one message for all',
        ],
      },
      image: IMG.heroHome,
      align: 'right',
    },
    {
      id: 'crm',
      num: '02',
      tag: { it: 'Inserimento automatico nel CRM', en: 'Automatic CRM entry' },
      title: { it: 'Ordine assoluto, zero lavoro manuale', en: 'Absolute order, zero manual work' },
      lead: {
        it: 'Quante volte un contatto si è perso non per mancanza di interesse, ma perché qualcuno ha dimenticato di trascriverlo? Con GENERAH AI non accade mai più: ogni contatto entra nel CRM istantaneamente, perfettamente organizzato.',
        en: 'How many times was a lead lost not for lack of interest, but because someone forgot to write it down? With GENERAH AI it never happens again: every contact enters the CRM instantly, perfectly organized.',
      },
      points: {
        it: [
          'Nome, recapiti, fonte, interessi e cronologia inseriti in automatico',
          'Ogni contatto etichettato e pronto all’azione, senza data entry',
          'Una mappa cristallina della pipeline: chi è entrato, a che punto è, cosa fare',
        ],
        en: [
          'Name, contacts, source, interests and history entered automatically',
          'Every contact tagged and ready to act on, with no data entry',
          'A crystal-clear pipeline map: who entered, where they are, what to do',
        ],
      },
      image: IMG.crmDashboard,
      align: 'left',
    },
    {
      id: 'nurturing',
      num: '03',
      tag: { it: 'Follow-up e nurturing multicanale', en: 'Multichannel follow-up & nurturing' },
      title: { it: 'La cura che trasforma il “forse” in “sì”', en: 'The care that turns “maybe” into “yes”' },
      lead: {
        it: 'La maggior parte delle vendite non si chiude al primo contatto. Si chiude al quinto, al settimo, dopo settimane di presenza costante. È qui che gli umani crollano. GENERAH AI non molla mai.',
        en: 'Most sales don’t close on the first contact. They close on the fifth, the seventh, after weeks of constant presence. This is where humans crumble. GENERAH AI never lets go.',
      },
      points: {
        it: [
          'Email su misura che parlano del bisogno specifico di quel contatto',
          'WhatsApp che conversa in modo naturale, supera obiezioni, accompagna alla decisione',
          'Sequenze intelligenti che lavorano in sinergia, mai invadenti',
        ],
        en: [
          'Tailored emails that speak to that contact’s specific need',
          'WhatsApp that converses naturally, overcomes objections, guides to the decision',
          'Smart sequences working in synergy, never intrusive',
        ],
      },
      image: IMG.closedLoop,
      align: 'right',
    },
    {
      id: 'voce',
      num: '04',
      tag: { it: 'Agente vocale AI', en: 'AI voice agent' },
      title: { it: 'Una voce indistinguibile da quella umana', en: 'A voice indistinguishable from a human one' },
      lead: {
        it: 'Immagina una telefonata. Una voce calda, le pause giuste, l’intonazione di chi ti ascolta davvero. Ti fa una domanda, rispondi, e capisce. Riattacchi convinto di aver parlato con una persona. Non era una persona. Era GENERAH AI.',
        en: 'Imagine a phone call. A warm voice, the right pauses, the intonation of someone truly listening. It asks you a question, you answer, and it understands. You hang up convinced you spoke with a person. It wasn’t a person. It was GENERAH AI.',
      },
      points: {
        it: [
          'Voce e cadenza identiche a quelle di un essere umano, con esitazioni naturali',
          'Gestisce obiezioni e domande impreviste, fissa appuntamenti, recupera trattative',
          'Centinaia di chiamate al giorno in contemporanea, senza mai una giornata storta',
        ],
        en: [
          'Voice and cadence identical to a human’s, with natural hesitations',
          'Handles objections and unexpected questions, books appointments, recovers deals',
          'Hundreds of simultaneous calls a day, never a bad day',
        ],
      },
      image: IMG.voiceAgent,
      align: 'left',
    },
    {
      id: 'video',
      num: '05',
      tag: { it: 'Video consulti con agente visivo', en: 'Video consults with a visual agent' },
      title: { it: 'Il volto umano dell’intelligenza artificiale', en: 'The human face of artificial intelligence' },
      lead: {
        it: 'GENERAH AI conduce veri e propri video consulti attraverso un agente visivo: un volto umano, generato dall’AI o clonato dalle fattezze di una persona reale del tuo team. Guarda in camera, parla, sorride, spiega, ascolta, risponde.',
        en: 'GENERAH AI runs genuine video consultations through a visual agent: a human face, AI-generated or cloned from a real member of your team. It looks into the camera, talks, smiles, explains, listens, answers.',
      },
      points: {
        it: [
          'Un primo consulto visivo immediato, a qualunque ora, senza occupare il tuo tempo',
          'Per il B2B, un volto rassicurante che costruisce fiducia attorno al prodotto',
          'Mille consulenze in parallelo, ognuna con la stessa competenza e attenzione',
        ],
        en: [
          'An immediate first visual consult, at any hour, without taking your time',
          'For B2B, a reassuring face that builds trust around the product',
          'A thousand consults in parallel, each with the same competence and care',
        ],
      },
      image: IMG.videoConsult,
      align: 'right',
    },
    {
      id: 'rag',
      num: '06',
      tag: { it: 'RAG e knowledge base personalizzate', en: 'Custom RAG & knowledge base' },
      title: { it: 'Un’intelligenza che conosce te', en: 'An intelligence that knows you' },
      lead: {
        it: 'Un venditore generico vende male. GENERAH AI conosce la tua attività meglio di chiunque altro: istruito sui tuoi servizi, listini, procedure, valori e tono di voce. Quando parla, parla come parleresti tu.',
        en: 'A generic salesperson sells poorly. GENERAH AI knows your business better than anyone: trained on your services, price lists, procedures, values and tone of voice. When it speaks, it speaks the way you would.',
      },
      points: {
        it: [
          'Programmazione su misura di RAG e knowledge base per ogni azienda cliente',
          'Conosce prestazioni e tempistiche per la clinica, specifiche e condizioni per il B2B',
          'Uno specialista del tuo mondo, fedele al tuo modo di fare le cose',
        ],
        en: [
          'Bespoke RAG and knowledge-base setup for every client company',
          'Knows treatments and timing for the clinic, specs and terms for B2B',
          'A specialist of your world, faithful to the way you do things',
        ],
      },
      image: IMG.ragKnowledge,
      align: 'left',
    },
    {
      id: 'h24',
      num: '07',
      tag: { it: 'H24 · 7/7 · 365/365', en: '24/7 · 365' },
      title: { it: 'Tutto questo non si ferma mai', en: 'All of this never stops' },
      lead: {
        it: 'Acquisizione, CRM, follow-up, chiamate, video consulti: nulla si ferma. Non alle 18:00, non nel weekend, non a Natale. Mentre la concorrenza ha la segreteria attiva, tu stai accogliendo, qualificando e convertendo.',
        en: 'Acquisition, CRM, follow-up, calls, video consults: nothing stops. Not at 6 PM, not on weekends, not on Christmas. While the competition has voicemail on, you’re welcoming, qualifying and converting.',
      },
      points: {
        it: [
          'Presenza continua su ogni canale, in ogni fuso, in ogni momento',
          'Il cliente moderno decide nell’istante: GENERAH AI c’è sempre',
          'Scalabilità infinita, stessa qualità per 10 o 10.000 contatti',
        ],
        en: [
          'Continuous presence on every channel, in every time zone, at every moment',
          'The modern customer decides in the instant: GENERAH AI is always there',
          'Infinite scalability, the same quality for 10 or 10,000 contacts',
        ],
      },
      image: IMG.alwaysOn,
      align: 'right',
    },
  ],
};
