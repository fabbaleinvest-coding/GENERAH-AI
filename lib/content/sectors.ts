import { IMG } from '../images';
import type { LS } from '../content';

type Sector = { id: string; name: LS; headline: LS; text: LS; bullets: { it: string[]; en: string[] }; image: string };

export const sectors = {
  hero: {
    image: IMG.sectorB2B,
    eyebrow: { it: 'Per chi è GENERAH AI', en: 'Who GENERAH AI is for' },
    title: {
      it: 'Un’unica intelligenza, modellata sul tuo settore.',
      en: 'One intelligence, shaped to your industry.',
    },
    sub: {
      it: 'Che tu venda forniture industriali o curi animali, GENERAH AI parla la lingua del tuo mondo. Conosce le tue prestazioni, i tuoi tempi, le tue obiezioni tipiche — e converte di conseguenza.',
      en: 'Whether you sell industrial supplies or care for animals, GENERAH AI speaks the language of your world. It knows your services, your timing, your typical objections — and converts accordingly.',
    },
  },

  list: <Sector[]>[
    {
      id: 'b2b',
      name: { it: 'Aziende B2B', en: 'B2B companies' },
      headline: { it: 'Intercetta il decisore nel momento del bisogno', en: 'Reach the decision-maker at the moment of need' },
      text: {
        it: 'Forniture, consulenze, software, servizi professionali, industria. GENERAH AI qualifica il decisore, lo coltiva attraverso cicli di vendita lunghi e complessi senza che un solo lead si raffreddi, e prepara terreni fertili per la chiusura.',
        en: 'Supplies, consulting, software, professional services, industry. GENERAH AI qualifies the decision-maker, nurtures them through long, complex sales cycles without a single lead going cold, and prepares fertile ground for the close.',
      },
      bullets: {
        it: ['Qualificazione automatica del decisore', 'Nurturing su cicli lunghi senza dispersione', 'Presentazione del prodotto con un volto rassicurante'],
        en: ['Automatic decision-maker qualification', 'Nurturing across long cycles with no leakage', 'Product presentation with a reassuring face'],
      },
      image: IMG.sectorB2B,
    },
    {
      id: 'b2c',
      name: { it: 'Attività B2C', en: 'B2C businesses' },
      headline: { it: 'Rispondi all’istante, mentre il desiderio è acceso', en: 'Answer instantly, while desire is alight' },
      text: {
        it: 'E-commerce, negozi, servizi alla persona, professionisti. GENERAH AI risponde adesso, recupera i carrelli abbandonati e i contatti tiepidi, e trasforma la curiosità impulsiva in acquisto prima che svanisca.',
        en: 'E-commerce, shops, personal services, professionals. GENERAH AI answers now, recovers abandoned carts and lukewarm contacts, and turns impulsive curiosity into a purchase before it fades.',
      },
      bullets: {
        it: ['Risposta immediata sul desiderio impulsivo', 'Recupero di carrelli e contatti tiepidi', 'Esperienza calda e personale, non testo freddo'],
        en: ['Instant response to impulse desire', 'Recovery of carts and lukewarm contacts', 'A warm, personal experience — not cold text'],
      },
      image: IMG.heroHome,
    },
    {
      id: 'mediche',
      name: { it: 'Cliniche mediche', en: 'Medical clinics' },
      headline: { it: 'Il paziente trova rassicurazione subito, a ogni ora', en: 'The patient finds reassurance at once, at any hour' },
      text: {
        it: 'Il paziente preoccupato che cerca aiuto la domenica sera non trova più il silenzio: trova una presenza che lo accoglie, lo ascolta e gli fissa l’appuntamento. Prenotazioni automatiche, recupero degli appuntamenti mancati, agenda sempre piena.',
        en: 'The worried patient seeking help on a Sunday night no longer finds silence: they find a presence that welcomes them, listens and books the appointment. Automatic bookings, recovery of missed appointments, an always-full schedule.',
      },
      bullets: {
        it: ['Prenotazioni automatiche 24/7', 'Recupero degli appuntamenti mancati', 'Presenza umana e calda anche a studio chiuso'],
        en: ['Automatic 24/7 bookings', 'Recovery of missed appointments', 'A warm, human presence even when the practice is closed'],
      },
      image: IMG.sectorMedical,
    },
    {
      id: 'dentistici',
      name: { it: 'Studi odontoiatrici', en: 'Dental practices' },
      headline: { it: 'Ogni poltrona vuota, un’occasione recuperata', en: 'Every empty chair, an opportunity recovered' },
      text: {
        it: 'Dalla prima richiesta di informazioni al preventivo, fino al promemoria dell’appuntamento e al follow-up post-trattamento: ogni paziente seguito con costanza, ogni spazio in agenda ottimizzato.',
        en: 'From the first inquiry to the quote, to the appointment reminder and post-treatment follow-up: every patient followed consistently, every slot in the schedule optimized.',
      },
      bullets: {
        it: ['Gestione di richieste e preventivi', 'Promemoria e follow-up post-trattamento', 'Riduzione drastica dei tempi morti in agenda'],
        en: ['Handling of inquiries and quotes', 'Reminders and post-treatment follow-up', 'A drastic cut in schedule downtime'],
      },
      image: IMG.sectorDental,
    },
    {
      id: 'veterinari',
      name: { it: 'Centri veterinari', en: 'Veterinary centers' },
      headline: { it: 'Risposte immediate ed empatiche, quando contano', en: 'Immediate, empathetic answers, when they matter' },
      text: {
        it: 'Il padrone in ansia per il suo animale ha bisogno di risposte immediate ed empatiche. GENERAH AI le offre, fissa visite, gestisce i richiami per vaccinazioni e controlli, e costruisce una relazione di fiducia che fidelizza.',
        en: 'The owner anxious about their pet needs immediate, empathetic answers. GENERAH AI gives them, books visits, manages reminders for vaccinations and check-ups, and builds a relationship of trust that creates loyalty.',
      },
      bullets: {
        it: ['Accoglienza empatica del padrone in ansia', 'Richiami automatici per vaccini e controlli', 'Relazione di fiducia che fidelizza'],
        en: ['Empathetic welcome for the anxious owner', 'Automatic reminders for vaccines and check-ups', 'A trust relationship that builds loyalty'],
      },
      image: IMG.sectorVet,
    },
  ],
};
