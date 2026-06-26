// Immagini generate con Higgsfield · Nano Banana Pro, servite dal CDN CloudFront.
// URL persistenti (path-based, senza firma). Per un repo totalmente self-contained
// si possono scaricare in /public/images e sostituire i percorsi qui sotto.

const CDN =
  'https://d8j0ntlcm91z4.cloudfront.net/user_3DM5GSQsJZdKE0WLc3fIXqPJ7fB';

export const IMG = {
  heroHome: `${CDN}/hf_20260626_182916_956b4918-3943-43b6-a889-f12373775047.png`,
  silentBleed: `${CDN}/hf_20260626_182942_81acba4a-1add-4baf-a149-1e150612cb18.png`,
  closedLoop: `${CDN}/hf_20260626_182949_c9123d07-7471-4964-a7a5-98d7cae9a8ed.png`,
  voiceAgent: `${CDN}/hf_20260626_182956_4857d6de-4aca-49d9-929d-6b9a37b82b7d.png`,
  videoConsult: `${CDN}/hf_20260626_183004_8dc8c09c-e999-4bdf-a9bb-e4ca64fe78f2.png`,
  crmDashboard: `${CDN}/hf_20260626_183009_ea23da04-2642-4bd2-9695-ba8de6a4fc20.png`,
  ragKnowledge: `${CDN}/hf_20260626_183014_71595c59-749b-4dab-8675-00504feb9610.png`,
  mediaBuying: `${CDN}/hf_20260626_183019_4936027a-0d51-40ac-9978-eaaf8a364b27.png`,
  creativeGenius: `${CDN}/hf_20260626_183025_acbb7b8c-040e-4f70-89a8-2c5025a5fecf.png`,
  sectorMedical: `${CDN}/hf_20260626_183031_e2dd6723-f4a5-4978-837d-0e2ccea218b8.png`,
  sectorDental: `${CDN}/hf_20260626_183039_4acfdd49-916f-4474-9b9c-dc12bab96991.png`,
  sectorVet: `${CDN}/hf_20260626_183043_27cae4ba-a8b4-4a02-92f9-44dc7aeb48fd.png`,
  sectorB2B: `${CDN}/hf_20260626_183050_2206a118-061c-4f0d-a297-b24f5d397f32.png`,
  pricingHero: `${CDN}/hf_20260626_183058_bdef5277-42a8-4afd-b06f-11a5a4291746.png`,
  ctaFinal: `${CDN}/hf_20260626_183104_2c5c72d1-087f-4d9b-bae0-11faa15e9887.png`,
  contactHub: `${CDN}/hf_20260626_183109_1f75d749-5317-4b9e-a69c-7a03c4ad0def.png`,
  alwaysOn: `${CDN}/hf_20260626_183119_7bd9dd6b-e6a3-4c33-9356-3d309dcfbe4f.png`,
} as const;

export type ImageKey = keyof typeof IMG;

// Video generati con Higgsfield · Kling 3.0 (image-to-video, drone POV).
// Il poster usa il primo frame (l'immagine hero) durante il caricamento.
export const VIDEO = {
  heroHome: '__HERO_VIDEO_URL__',
} as const;
