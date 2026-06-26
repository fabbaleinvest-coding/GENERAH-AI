import { IMG } from '../images';
import type { LS } from '../content';

type Feature = { id: string; icon: string; tag: LS; title: LS; text: LS };
type LoopStep = { time: string; title: LS; text: LS };

export const home = {
  hero: {
    image: IMG.heroHome,
    eyebrow: { it: 'Il reparto vendite che non dorme mai', en: 'The sales team that never sleeps' },
    title: {
      it: 'Mentre dormi,\nGENERAH AI vende.',
      en: 'While you sleep,\nGENERAH AI sells.',
    },
    sub: {
      it: 'Un ecosistema di intelligenza artificiale che acquisisce, coltiva e converte ogni contatto. 24 ore su 24, 7 giorni su 7, 365 giorni l’anno. A una frazione del costo di un solo venditore.',
      en: 'An artificial-intelligence ecosystem that acquires, nurtures and converts every lead. 24 hours a day, 7 days a week, 365 days a year. At a fraction of the cost of a single salesperson.',
    },
  },

  // Manifesto — l'emorragia silenziosa
  manifesto: {
    image: IMG.silentBleed,
    eyebrow: { it: 'La verità scomoda', en: 'The uncomfortable truth' },
    title: {
      it: 'Mentre leggi questa frase, un cliente ti sta sfuggendo.',
      en: 'As you read this sentence, a customer is slipping away.',
    },
    body: {
      it: [
        'In questo esatto momento — che siano le tre del pomeriggio o le tre di notte — c’è qualcuno che ha bisogno esattamente di ciò che offri. Ha aperto il tuo sito. Ha scritto su WhatsApp. Ha chiesto un preventivo, un appuntamento.',
        'E poi ha aspettato. Mentre aspettava, ha trovato un concorrente che ha risposto in trenta secondi. E quel cliente, adesso, è suo.',
        'È l’emorragia silenziosa di ogni attività: i contatti caldi che si raffreddano, le richieste senza risposta nel weekend, le opportunità che evaporano perché nessun essere umano può essere ovunque, sempre, all’istante.',
      ],
      en: [
        'Right now — whether it’s three in the afternoon or three at night — someone needs exactly what you offer. They opened your site. They messaged you on WhatsApp. They asked for a quote, an appointment.',
        'And then they waited. While they waited, they found a competitor who answered in thirty seconds. And that customer is now theirs.',
        'It’s the silent bleed of every business: warm leads going cold, requests unanswered over the weekend, opportunities evaporating because no human can be everywhere, always, instantly.',
      ],
    },
    closer: {
      it: 'GENERAH AI non è un software. È la fine di quell’emorragia.',
      en: 'GENERAH AI is not software. It’s the end of that bleed.',
    },
  },

  // Stat band
  stats: [
    { value: '24/7/365', label: { it: 'Sempre attivo, mai in ferie', en: 'Always on, never on leave' } },
    { value: '∞', label: { it: 'Contatti gestiti in parallelo', en: 'Contacts handled in parallel' } },
    { value: '< 60s', label: { it: 'Tempo di risposta a ogni lead', en: 'Response time to every lead' } },
    { value: '5', label: { it: 'Settori serviti, su misura', en: 'Industries served, tailored' } },
  ],

  // Funzionalità sintesi (home)
  featuresIntro: {
    eyebrow: { it: 'Un ecosistema completo', en: 'A complete ecosystem' },
    title: {
      it: 'Un reparto commerciale intero, condensato in un’unica intelligenza.',
      en: 'An entire commercial department, condensed into a single intelligence.',
    },
    sub: {
      it: 'Acquisizione, CRM, follow-up, chiamate vocali, video consulenze. Tutto orchestrato dall’AI, fedele al tuo modo di fare le cose.',
      en: 'Acquisition, CRM, follow-up, voice calls, video consultations. All orchestrated by AI, faithful to the way you do things.',
    },
  },

  features: <Feature[]>[
    {
      id: 'acquisizione',
      icon: 'target',
      tag: { it: '01 — Acquisizione', en: '01 — Acquisition' },
      title: { it: 'La rete che cattura ogni opportunità', en: 'The net that catches every opportunity' },
      text: {
        it: 'Form, WhatsApp, email, annunci, commenti: ogni micro-opportunità viene intercettata nell’istante esatto e qualificata automaticamente. Niente cade più nel vuoto.',
        en: 'Forms, WhatsApp, email, ads, comments: every micro-opportunity is intercepted the exact moment it appears and qualified automatically. Nothing falls through the cracks.',
      },
    },
    {
      id: 'crm',
      icon: 'database',
      tag: { it: '02 — CRM automatico', en: '02 — Automatic CRM' },
      title: { it: 'Ordine assoluto, zero lavoro manuale', en: 'Absolute order, zero manual work' },
      text: {
        it: 'Nome, recapiti, fonte, cronologia: ogni contatto entra nel CRM istantaneamente, etichettato e pronto all’azione. Una mappa cristallina della tua pipeline, sempre aggiornata.',
        en: 'Name, contacts, source, history: every lead enters the CRM instantly, tagged and ready to act on. A crystal-clear map of your pipeline, always up to date.',
      },
    },
    {
      id: 'nurturing',
      icon: 'flow',
      tag: { it: '03 — Follow-up & nurturing', en: '03 — Follow-up & nurturing' },
      title: { it: 'La cura che trasforma il “forse” in “sì”', en: 'The care that turns “maybe” into “yes”' },
      text: {
        it: 'Sequenze intelligenti su email e WhatsApp che parlano del bisogno specifico di ogni contatto, al momento giusto, con il tono giusto. GENERAH AI non molla mai.',
        en: 'Smart sequences across email and WhatsApp that speak to each contact’s specific need, at the right time, in the right tone. GENERAH AI never gives up.',
      },
    },
    {
      id: 'voce',
      icon: 'wave',
      tag: { it: '04 — Agente vocale AI', en: '04 — AI voice agent' },
      title: { it: 'Una voce indistinguibile da quella umana', en: 'A voice indistinguishable from a human one' },
      text: {
        it: 'Voce calda, pause naturali, ascolto reale. Gestisce obiezioni, fissa appuntamenti, richiama chi non ha risposto. Centinaia di chiamate al giorno, ognuna perfetta.',
        en: 'Warm voice, natural pauses, real listening. It handles objections, books appointments, calls back those who didn’t answer. Hundreds of calls a day, each one perfect.',
      },
    },
    {
      id: 'video',
      icon: 'video',
      tag: { it: '05 — Video consulti', en: '05 — Video consults' },
      title: { it: 'Il volto umano dell’intelligenza artificiale', en: 'The human face of artificial intelligence' },
      text: {
        it: 'Un agente visivo conduce veri video consulti: guarda, parla, sorride, spiega. Mille consulenze in parallelo, ognuna con lo stesso volto competente e attento.',
        en: 'A visual agent runs real video consultations: it looks, talks, smiles, explains. A thousand consults in parallel, each with the same competent, attentive face.',
      },
    },
    {
      id: 'rag',
      icon: 'brain',
      tag: { it: '06 — RAG & knowledge base', en: '06 — RAG & knowledge base' },
      title: { it: 'Un’intelligenza che conosce te', en: 'An intelligence that knows you' },
      text: {
        it: 'Istruita sui tuoi servizi, listini, procedure e tono di voce. Quando parla, parla come parleresti tu. Uno specialista del tuo mondo, non un generalista che improvvisa.',
        en: 'Trained on your services, price lists, procedures and tone of voice. When it speaks, it speaks the way you would. A specialist of your world, not a generalist improvising.',
      },
    },
  ],

  alwaysOn: {
    image: IMG.alwaysOn,
    eyebrow: { it: '07 — H24 · 7/7 · 365/365', en: '07 — 24/7 · 365' },
    title: {
      it: 'Il vantaggio che non puoi più ignorare.',
      en: 'The advantage you can no longer ignore.',
    },
    body: {
      it: 'Non alle 18:00. Non nel weekend. Non a Natale, non a Ferragosto, non alle quattro del mattino. Mentre dormi, GENERAH AI lavora. Mentre sei in riunione, GENERAH AI chiude. Il cliente moderno decide nell’istante — e vince chi c’è in quell’istante.',
      en: 'Not at 6 PM. Not on weekends. Not on Christmas, not in mid-August, not at four in the morning. While you sleep, GENERAH AI works. While you’re in a meeting, GENERAH AI closes. The modern customer decides in the instant — and the one who’s there in that instant wins.',
    },
  },

  // Loop chiuso
  loop: {
    eyebrow: { it: 'Il loop chiuso e perfetto', en: 'The closed, perfect loop' },
    title: {
      it: 'Dal primo sguardo alla vendita. Senza che nessuno muova un dito.',
      en: 'From the first glance to the sale. Without anyone lifting a finger.',
    },
    image: IMG.closedLoop,
    steps: <LoopStep[]>[
      {
        time: '14:30',
        title: { it: 'L’aggancio', en: 'The hook' },
        text: {
          it: 'GENERAH AI pubblica un’inserzione con un copy irresistibile. Un potenziale cliente la vede e clicca.',
          en: 'GENERAH AI publishes an ad with irresistible copy. A prospect sees it and clicks.',
        },
      },
      {
        time: '14:31',
        title: { it: 'L’acquisizione', en: 'The capture' },
        text: {
          it: 'Il lead inserisce i suoi dati. Il contatto viene risucchiato istantaneamente nel CRM.',
          en: 'The lead enters their data. The contact is instantly pulled into the CRM.',
        },
      },
      {
        time: '14:32',
        title: { it: 'Il contatto', en: 'The touch' },
        text: {
          it: 'Il contatto è ancora caldo. GENERAH AI invia un WhatsApp personalizzato e una mail di benvenuto.',
          en: 'The contact is still warm. GENERAH AI sends a personalized WhatsApp and a welcome email.',
        },
      },
      {
        time: '14:35',
        title: { it: 'La voce', en: 'The voice' },
        text: {
          it: 'L’agente vocale chiama. Con voce calda risponde alle domande, dissolve i dubbi, qualifica.',
          en: 'The voice agent calls. With a warm voice it answers questions, dissolves doubts, qualifies.',
        },
      },
      {
        time: '15:00',
        title: { it: 'La chiusura', en: 'The close' },
        text: {
          it: 'L’avatar visivo conduce il video consulto, mostra empatia e chiude la vendita o prenota il trattamento.',
          en: 'The visual avatar runs the video consult, shows empathy and closes the sale or books the treatment.',
        },
      },
    ],
  },

  // Calcolo che cambia tutto
  math: {
    eyebrow: { it: 'Il calcolo che cambia tutto', en: 'The math that changes everything' },
    title: {
      it: 'Non stai sostituendo una persona con una macchina. Stai sostituendo i limiti con l’infinito.',
      en: 'You’re not replacing a person with a machine. You’re replacing limits with the infinite.',
    },
    columns: [
      {
        kind: { it: 'Un venditore umano', en: 'A human salesperson' },
        tone: 'muted',
        points: {
          it: ['8 ore al giorno, 5 giorni su 7', 'Ferie, malattia, cali di motivazione', 'Pochi contatti per volta', 'Stipendio, contributi, provvigioni, formazione'],
          en: ['8 hours a day, 5 days a week', 'Holidays, sick days, dips in motivation', 'A handful of contacts at a time', 'Salary, taxes, commissions, training'],
        },
      },
      {
        kind: { it: 'GENERAH AI', en: 'GENERAH AI' },
        tone: 'brand',
        points: {
          it: ['24 ore su 24, 7 giorni su 7', 'Non si ammala, non va in ferie', 'Contatti illimitati in parallelo', 'Una frazione del costo di una persona'],
          en: ['24 hours a day, 7 days a week', 'Never sick, never on leave', 'Unlimited contacts in parallel', 'A fraction of the cost of one person'],
        },
      },
    ],
    closer: {
      it: 'Il risultato è uno solo: un incremento drastico delle vendite, a un costo nettamente inferiore. Non è un risparmio. È un moltiplicatore.',
      en: 'The result is singular: a dramatic increase in sales, at a markedly lower cost. It’s not a saving. It’s a multiplier.',
    },
  },

  finalCta: {
    image: IMG.ctaFinal,
    eyebrow: { it: 'La domanda non è se. È quando.', en: 'The question isn’t if. It’s when.' },
    title: {
      it: 'Il tuo prossimo cliente sta arrivando proprio adesso.',
      en: 'Your next customer is arriving right now.',
    },
    sub: {
      it: 'Ci sarà qualcuno a riceverlo? Con GENERAH AI, la risposta è sempre sì.',
      en: 'Will someone be there to receive them? With GENERAH AI, the answer is always yes.',
    },
  },
};
