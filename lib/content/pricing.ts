import { IMG } from '../images';
import type { LS } from '../content';

export type Plan = {
  id: string;
  name: string;
  popular?: boolean;
  monthly: number; // €/mese
  setup: number; // una tantum €
  blurb: LS;
  includes: { phone: number; video: number; marketing: number };
  features: { it: string[]; en: string[] };
};

export type OverageRow = { qty: LS; price: LS; unit: LS };
export type OverageTable = { title: LS; note: LS; rows: OverageRow[] };

export const pricing = {
  hero: {
    image: IMG.pricingHero,
    eyebrow: { it: 'Piani e prezzi', en: 'Plans & pricing' },
    title: {
      it: 'Un investimento. Un moltiplicatore.',
      en: 'One investment. One multiplier.',
    },
    sub: {
      it: 'Quattro pacchetti pensati per accompagnare la tua crescita, dal primo lead all’ecosistema completo. Canone mensile trasparente, setup una tantum, e un listino chiaro per ogni capacità aggiuntiva.',
      en: 'Four packages built to follow your growth, from the first lead to the full ecosystem. Transparent monthly fee, one-time setup, and a clear list for every additional capacity.',
    },
  },

  labels: {
    perMonth: { it: '/mese', en: '/month' },
    setup: { it: 'Setup una tantum', en: 'One-time setup' },
    phone: { it: 'Minuti telefono inclusi', en: 'Included phone minutes' },
    video: { it: 'Minuti video inclusi', en: 'Included video minutes' },
    marketing: { it: 'Messaggi marketing WhatsApp / mese', en: 'WhatsApp marketing messages / month' },
    noVideo: { it: 'Video consulti non inclusi', en: 'Video consults not included' },
    cta: { it: 'Richiedi una demo', en: 'Request a demo' },
    mostPopular: { it: 'Più scelto', en: 'Most popular' },
    everythingIn: { it: 'Tutto di', en: 'Everything in' },
  },

  plans: <Plan[]>[
    {
      id: 'starter',
      name: 'Starter',
      monthly: 790,
      setup: 2500,
      blurb: { it: 'Per partire e non perdere più un contatto.', en: 'To start and never miss a contact again.' },
      includes: { phone: 700, video: 0, marketing: 500 },
      features: {
        it: [
          'Acquisizione multicanale e qualificazione automatica',
          'Inserimento automatico nel CRM',
          'Follow-up e nurturing via email e WhatsApp',
          'Agente vocale AI per chiamate e richiami',
          'Knowledge base personalizzata di base',
        ],
        en: [
          'Multichannel acquisition and automatic qualification',
          'Automatic CRM entry',
          'Follow-up and nurturing via email and WhatsApp',
          'AI voice agent for calls and callbacks',
          'Basic custom knowledge base',
        ],
      },
    },
    {
      id: 'growth',
      name: 'Growth',
      popular: true,
      monthly: 1900,
      setup: 4000,
      blurb: { it: 'Il punto di equilibrio tra potenza e valore.', en: 'The sweet spot between power and value.' },
      includes: { phone: 2000, video: 150, marketing: 1250 },
      features: {
        it: [
          'Tutto ciò che include Starter',
          'Video consulti con agente visivo',
          'RAG e knowledge base avanzata',
          'Sequenze di nurturing multicanale evolute',
          'Reportistica sulla pipeline',
        ],
        en: [
          'Everything in Starter',
          'Video consults with a visual agent',
          'Advanced RAG and knowledge base',
          'Evolved multichannel nurturing sequences',
          'Pipeline reporting',
        ],
      },
    },
    {
      id: 'premium',
      name: 'Premium',
      monthly: 4500,
      setup: 7000,
      blurb: { it: 'Acquisizione attiva e marketing autonomo.', en: 'Active acquisition and autonomous marketing.' },
      includes: { phone: 4500, video: 500, marketing: 3000 },
      features: {
        it: [
          'Tutto ciò che include Growth',
          'Motore di media buying e direzione creativa autonomo',
          'Ottimizzazione budget campagne H24',
          'Knowledge base multi-sede / multi-reparto',
          'Priorità di supporto',
        ],
        en: [
          'Everything in Growth',
          'Autonomous media-buying and creative-direction engine',
          'Around-the-clock campaign budget optimization',
          'Multi-site / multi-department knowledge base',
          'Priority support',
        ],
      },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthly: 5000,
      setup: 8000,
      blurb: { it: 'L’ecosistema completo, su misura della tua scala.', en: 'The full ecosystem, tailored to your scale.' },
      includes: { phone: 8000, video: 1000, marketing: 7500 },
      features: {
        it: [
          'Tutto ciò che include Premium',
          'Account manager dedicato e SLA su misura',
          'Integrazioni custom con i tuoi sistemi',
          'Volumi e capacità su misura',
          'Onboarding e formazione dedicati',
        ],
        en: [
          'Everything in Premium',
          'Dedicated account manager and custom SLA',
          'Custom integrations with your systems',
          'Tailored volumes and capacity',
          'Dedicated onboarding and training',
        ],
      },
    },
  ],

  overageIntro: {
    eyebrow: { it: 'Listino capacità aggiuntive', en: 'Additional capacity list' },
    title: {
      it: 'Cresci senza vincoli. Paghi solo ciò che serve.',
      en: 'Grow without limits. Pay only for what you need.',
    },
    sub: {
      it: 'Minuti di telefono, minuti video e capacità marketing WhatsApp aggiuntivi, disponibili a consumo o in pacchetti convenienti. Le conversazioni WhatsApp in risposta a chi ti scrive restano illimitate e gratuite.',
      en: 'Additional phone minutes, video minutes and WhatsApp marketing capacity, available pay-as-you-go or in convenient bundles. WhatsApp conversations replying to people who message you remain unlimited and free.',
    },
  },

  overage: <OverageTable[]>[
    {
      title: { it: 'Minuti telefono aggiuntivi', en: 'Additional phone minutes' },
      note: { it: 'Per chiamate e richiami oltre i minuti inclusi nel piano.', en: 'For calls and callbacks beyond the minutes included in your plan.' },
      rows: [
        { qty: { it: 'A consumo', en: 'Pay-as-you-go' }, price: { it: '0,35 € / min', en: '€0.35 / min' }, unit: { it: 'singolo minuto', en: 'single minute' } },
        { qty: { it: 'Pacco 500', en: '500 bundle' }, price: { it: '154 €', en: '€154' }, unit: { it: '0,308 € / min', en: '€0.308 / min' } },
        { qty: { it: 'Pacco 1.000', en: '1,000 bundle' }, price: { it: '266 €', en: '€266' }, unit: { it: '0,266 € / min', en: '€0.266 / min' } },
        { qty: { it: 'Pacco 5.000', en: '5,000 bundle' }, price: { it: '1.190 €', en: '€1,190' }, unit: { it: '0,238 € / min', en: '€0.238 / min' } },
      ],
    },
    {
      title: { it: 'Minuti video aggiuntivi', en: 'Additional video minutes' },
      note: { it: 'Per video consulti con agente visivo oltre i minuti inclusi.', en: 'For visual-agent video consults beyond the included minutes.' },
      rows: [
        { qty: { it: 'A consumo', en: 'Pay-as-you-go' }, price: { it: '0,65 € / min', en: '€0.65 / min' }, unit: { it: 'singolo minuto', en: 'single minute' } },
        { qty: { it: 'Pacco 100', en: '100 bundle' }, price: { it: '58,50 €', en: '€58.50' }, unit: { it: '0,585 € / min', en: '€0.585 / min' } },
        { qty: { it: 'Pacco 300', en: '300 bundle' }, price: { it: '156 €', en: '€156' }, unit: { it: '0,52 € / min', en: '€0.52 / min' } },
        { qty: { it: 'Pacco 1.000', en: '1,000 bundle' }, price: { it: '481 €', en: '€481' }, unit: { it: '0,481 € / min', en: '€0.481 / min' } },
      ],
    },
    {
      title: { it: 'Capacità marketing WhatsApp', en: 'WhatsApp marketing capacity' },
      note: { it: 'Sblocca il tetto di messaggi marketing a freddo del tuo piano.', en: 'Unlocks your plan’s cap on cold marketing messages.' },
      rows: [
        { qty: { it: 'A consumo', en: 'Pay-as-you-go' }, price: { it: '0,30 € / msg', en: '€0.30 / msg' }, unit: { it: 'singolo messaggio', en: 'single message' } },
        { qty: { it: 'Pacco 1.000', en: '1,000 bundle' }, price: { it: '298 €', en: '€298' }, unit: { it: '0,298 € / msg', en: '€0.298 / msg' } },
        { qty: { it: 'Pacco 5.000', en: '5,000 bundle' }, price: { it: '1.380 €', en: '€1,380' }, unit: { it: '0,276 € / msg', en: '€0.276 / msg' } },
        { qty: { it: 'Pacco 20.000', en: '20,000 bundle' }, price: { it: '4.980 €', en: '€4,980' }, unit: { it: '0,249 € / msg', en: '€0.249 / msg' } },
        { qty: { it: 'Pacco 50.000', en: '50,000 bundle' }, price: { it: '10.980 €', en: '€10,980' }, unit: { it: '0,2196 € / msg', en: '€0.2196 / msg' } },
      ],
    },
  ],

  savings: {
    eyebrow: { it: 'Il confronto che cambia tutto', en: 'The comparison that changes everything' },
    title: {
      it: 'Quanto risparmi — e quanto produci in più',
      en: 'How much you save — and how much more you produce',
    },
    sub: {
      it: 'Un venditore commerciale costa in media 45.000 € l’anno (all-in). GENERAH AI parte da una operatività 2,5 volte superiore sul tempo — perché lavora 24 ore su 24, 7 giorni su 7 — e cresce ulteriormente con i volumi inclusi nel pacchetto, gestendo molti contatti in parallelo.',
      en: 'A sales rep costs on average €45,000 a year (all-in). GENERAH AI starts from 2.5× more operating time — because it works 24/7 — and scales further with the volumes included in the plan, handling many contacts in parallel.',
    },
    stats: [
      { value: '45.000 €', label: { it: 'Costo annuo di un dipendente (all-in)', en: 'Annual cost of one employee (all-in)' } },
      { value: '2,5×', label: { it: 'Operatività sul tempo (24/7/365)', en: 'Operating time (24/7/365)' } },
      { value: 'fino a 9,3×', label: { it: 'Produttività con i volumi inclusi', en: 'Productivity with included volumes' } },
    ],
    cols: {
      plan: { it: 'Pacchetto', en: 'Plan' },
      annual: { it: 'Costo annuo GENERAH AI', en: 'GENERAH AI annual cost' },
      productivity: { it: 'Aumento di produttività', en: 'Productivity increase' },
      vsOne: { it: 'Risparmio vs 1 dipendente', en: 'Saving vs 1 employee' },
      vsProductivity: { it: 'Risparmio a parità di produttività', en: 'Saving at equal productivity' },
    },
    rows: [
      { plan: 'Starter', annual: 9480, productivity: 2.5, vsOne: 35520, vsProductivity: 103020 },
      { plan: 'Growth', annual: 22800, productivity: 4.8, vsOne: 22200, vsProductivity: 194164 },
      { plan: 'Premium', annual: 54000, productivity: 9.3, vsOne: -9000, vsProductivity: 363857 },
    ],
    note: {
      it: 'Prezzi IVA esclusa, a regime (il primo anno include il setup una tantum). L’aumento di produttività parte da 2,5× per la maggiore operatività sul tempo (24/7/365) e viene scalato in base all’aumento dei minuti inclusi nel pacchetto, pesato al 50% rispetto al pacchetto base. Il “risparmio a parità di produttività” confronta il costo annuo di GENERAH AI con quello della forza-lavoro umana equivalente (45.000 € × il fattore di produttività). Sulla fascia Premium il canone supera il costo di un singolo dipendente, ma l’operatività e i volumi gestiti equivalgono a quelli di un intero reparto.',
      en: 'Prices exclude VAT, at steady state (the first year includes the one-time setup). The productivity increase starts at 2.5× for the greater operating time (24/7/365) and is scaled by the increase in included minutes per plan, weighted at 50% versus the base plan. The “saving at equal productivity” compares GENERAH AI’s annual cost with the equivalent human workforce (€45,000 × the productivity factor). On the Premium tier the fee exceeds the cost of a single employee, but the operation and managed volumes equal those of an entire department.',
    },
  },

  faq: [
    {
      q: { it: 'Le risposte ai clienti che mi scrivono sono incluse?', en: 'Are replies to customers who message me included?' },
      a: {
        it: 'Sì. Le conversazioni WhatsApp “in-finestra”, cioè le risposte a chi ti scrive entro 24 ore, sono illimitate e gratuite. Nel listino paghi solo il marketing a freddo e le utility fuori finestra.',
        en: 'Yes. “In-window” WhatsApp conversations — replies to people who message you within 24 hours — are unlimited and free. The list only charges for cold marketing and out-of-window utility messages.',
      },
    },
    {
      q: { it: 'Cosa copre il setup una tantum?', en: 'What does the one-time setup cover?' },
      a: {
        it: 'L’addestramento su misura della knowledge base, la configurazione dei canali, l’integrazione con il tuo CRM e la messa in opera dell’agente vocale e video sul tuo brand.',
        en: 'The bespoke knowledge-base training, channel configuration, integration with your CRM, and the deployment of the voice and video agents on your brand.',
      },
    },
    {
      q: { it: 'I prezzi sono definitivi?', en: 'Are these prices final?' },
      a: {
        it: 'Sono il nostro listino di partenza per il mercato italiano. Per volumi elevati o esigenze specifiche, il piano Enterprise prevede capacità e condizioni su misura.',
        en: 'They are our baseline list for the Italian market. For high volumes or specific needs, the Enterprise plan offers tailored capacity and terms.',
      },
    },
  ],
};
