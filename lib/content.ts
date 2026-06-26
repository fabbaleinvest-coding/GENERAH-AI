import { IMG } from './images';

export type LS = { it: string; en: string };
type LSA = { it: string[]; en: string[] };

export const nav: { label: LS; href: string }[] = [
  { label: { it: 'Piattaforma', en: 'Platform' }, href: '/piattaforma' },
  { label: { it: 'Acquisizione', en: 'Acquisition' }, href: '/acquisizione' },
  { label: { it: 'Settori', en: 'Industries' }, href: '/settori' },
  { label: { it: 'Prezzi', en: 'Pricing' }, href: '/prezzi' },
  { label: { it: 'Contatti', en: 'Contact' }, href: '/contatti' },
];

export const common = {
  brand: 'GENERAH AI',
  payoff: { it: 'Sales never sleep', en: 'Sales never sleep' },
  ctaPrimary: { it: 'Richiedi una demo', en: 'Request a demo' },
  ctaSecondary: { it: 'Scopri la piattaforma', en: 'Explore the platform' },
  ctaPricing: { it: 'Vedi i piani', en: 'See the plans' },
  langLabel: { it: 'IT', en: 'EN' },
  menu: { it: 'Menu', en: 'Menu' },
  close: { it: 'Chiudi', en: 'Close' },
};

export const footer = {
  tagline: {
    it: 'Acquisisci. Coltiva. Converti. Senza limiti. Senza sosta. Senza pari.',
    en: 'Acquire. Nurture. Convert. No limits. No pause. No equal.',
  },
  columns: [
    {
      title: { it: 'Prodotto', en: 'Product' },
      links: [
        { label: { it: 'La piattaforma', en: 'The platform' }, href: '/piattaforma' },
        { label: { it: 'Agente vocale', en: 'Voice agent' }, href: '/piattaforma#voce' },
        { label: { it: 'Video consulti', en: 'Video consults' }, href: '/piattaforma#video' },
        { label: { it: 'Acquisizione', en: 'Acquisition' }, href: '/acquisizione' },
      ],
    },
    {
      title: { it: 'Soluzioni', en: 'Solutions' },
      links: [
        { label: { it: 'Aziende B2B', en: 'B2B companies' }, href: '/settori#b2b' },
        { label: { it: 'Attività B2C', en: 'B2C businesses' }, href: '/settori#b2c' },
        { label: { it: 'Cliniche mediche', en: 'Medical clinics' }, href: '/settori#mediche' },
        { label: { it: 'Studi dentistici', en: 'Dental practices' }, href: '/settori#dentistici' },
        { label: { it: 'Centri veterinari', en: 'Veterinary centers' }, href: '/settori#veterinari' },
      ],
    },
    {
      title: { it: 'Azienda', en: 'Company' },
      links: [
        { label: { it: 'Prezzi', en: 'Pricing' }, href: '/prezzi' },
        { label: { it: 'Contatti', en: 'Contact' }, href: '/contatti' },
      ],
    },
  ],
  legal: {
    it: '© ' + new Date().getFullYear() + ' GENERAH AI. Tutti i diritti riservati. Le proiezioni economiche sono stime di partenza e non costituiscono garanzia di risultato.',
    en: '© ' + new Date().getFullYear() + ' GENERAH AI. All rights reserved. Economic projections are baseline estimates and do not constitute a guarantee of results.',
  },
};

export const IMAGES = IMG;
