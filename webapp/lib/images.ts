// ─────────────────────────────────────────────────────────────────────────
//  Immagini · Higgsfield Nano Banana Pro — servite dal CDN CloudFront.
//  Riuso del set generato per la vetrina + nuove immagini dedicate alla webapp.
// ─────────────────────────────────────────────────────────────────────────

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3DM5GSQsJZdKE0WLc3fIXqPJ7fB';

export const IMG = {
  // ── Riutilizzate dalla vetrina (URL persistenti) ──
  heroHome: `${CDN}/hf_20260626_182916_956b4918-3943-43b6-a889-f12373775047.png`,
  silentBleed: `${CDN}/hf_20260626_182942_81acba4a-1add-4baf-a149-1e150612cb18.png`,
  closedLoop: `${CDN}/hf_20260626_182949_c9123d07-7471-4964-a7a5-98d7cae9a8ed.png`,
  voiceAgent: `${CDN}/hf_20260626_182956_4857d6de-4aca-49d9-929d-6b9a37b82b7d.png`,
  videoConsult: `${CDN}/hf_20260626_183004_8dc8c09c-e999-4bdf-a9bb-e4ca64fe78f2.png`,
  crmDashboard: `${CDN}/hf_20260626_183009_ea23da04-2642-4bd2-9695-ba8de6a4fc20.png`,
  ragKnowledge: `${CDN}/hf_20260626_183014_71595c59-749b-4dab-8675-00504feb9610.png`,
  mediaBuying: `${CDN}/hf_20260626_183019_4936027a-0d51-40ac-9978-eaaf8a364b27.png`,
  creativeGenius: `${CDN}/hf_20260626_183025_acbb7b8c-040e-4f70-89a8-2c5025a5fecf.png`,
  pricingHero: `${CDN}/hf_20260626_183058_bdef5277-42a8-4afd-b06f-11a5a4291746.png`,
  ctaFinal: `${CDN}/hf_20260626_183104_2c5c72d1-087f-4d9b-bae0-11faa15e9887.png`,
  alwaysOn: `${CDN}/hf_20260626_183119_7bd9dd6b-e6a3-4c33-9356-3d309dcfbe4f.png`,

  // ── Nuove, dedicate alla webapp (popolate dopo la generazione) ──
  // default temporanei: usano immagini esistenti finché non sostituiti.
  authHero: `${CDN}/hf_20260626_182916_956b4918-3943-43b6-a889-f12373775047.png`,
  consoleHero: `${CDN}/hf_20260626_183009_ea23da04-2642-4bd2-9695-ba8de6a4fc20.png`,
  adVertical: `${CDN}/hf_20260626_183004_8dc8c09c-e999-4bdf-a9bb-e4ca64fe78f2.png`,
  // ── Fase 2 · Contenuti social (Higgsfield · Nano Banana Pro) ──
  socialFeed: `${CDN}/hf_20260629_133350_44f2145b-de3e-44a5-93a7-06c57de71788.png`,
  socialPost: `${CDN}/hf_20260629_133357_294cb78d-42d0-4feb-9178-e335d442917e.png`,
} as const;

export type ImageKey = keyof typeof IMG;
