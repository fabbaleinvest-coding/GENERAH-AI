import { IMG } from '../images';
import type { LS } from '../content';

type Block = { id: string; num: string; tag: LS; title: LS; lead: LS; points: { it: string[]; en: string[] }; image: string; align: 'left' | 'right' };
type Channel = { name: string; role: LS };

export const acquisition = {
  hero: {
    image: IMG.mediaBuying,
    eyebrow: { it: 'Acquisizione globale', en: 'Global acquisition' },
    title: {
      it: 'Non aspetta più i clienti.\nSe li va a prendere.',
      en: 'It no longer waits for customers.\nIt goes and gets them.',
    },
    sub: {
      it: 'Un motore di media buying e direzione creativa 100% autonomo. La tua agenzia di marketing interna: copywriter, art director e media buyer senior che lavorano senza sosta, con un solo obiettivo — inondare il tuo sistema di lead iper-qualificati.',
      en: 'A 100% autonomous media-buying and creative-direction engine. Your in-house marketing agency: copywriter, art director and senior media buyer working tirelessly, with one goal — to flood your system with hyper-qualified leads.',
    },
  },

  intro: {
    eyebrow: { it: 'La fine del gioco al massacro', en: 'The end of the war of attrition' },
    title: {
      it: 'Hai pagato agenzie esorbitanti e bruciato budget in campagne che non convertivano.',
      en: 'You’ve paid exorbitant agencies and burned budget on campaigns that didn’t convert.',
    },
    body: {
      it: 'E anche quando il lead arrivava, c’era uno scollamento fatale tra chi creava la pubblicità e chi doveva chiudere la vendita. GENERAH AI integra le due cose in un unico ecosistema: crea l’esca, lancia la rete, recupera i contatti e li accompagna fino alla transazione.',
      en: 'And even when the lead arrived, there was a fatal disconnect between whoever made the ad and whoever had to close the sale. GENERAH AI fuses the two into a single ecosystem: it creates the bait, casts the net, recovers the contacts and walks them all the way to the transaction.',
    },
  },

  blocks: <Block[]>[
    {
      id: 'creativo',
      num: '01',
      tag: { it: 'Genio creativo iper-personalizzato', en: 'Hyper-personalized creative genius' },
      title: { it: 'L’AI che scrive, disegna ed emoziona', en: 'The AI that writes, designs and moves people' },
      lead: {
        it: 'Conoscendo perfettamente la tua azienda grazie alla knowledge base, GENERAH AI elabora le campagne partendo da zero. Non spinge bottoni: crea.',
        en: 'Knowing your company perfectly through its knowledge base, GENERAH AI builds campaigns from scratch. It doesn’t push buttons: it creates.',
      },
      points: {
        it: [
          'Copywriting persuasivo: dal testo emozionale per Facebook all’hook fulmineo per TikTok',
          'Visual e video scripting: immagini e sceneggiature ottimizzate per fermare lo scroll',
          'Test A/B infiniti: dozzine di varianti lanciate per capire cosa converte di più',
        ],
        en: [
          'Persuasive copywriting: from emotional Facebook copy to lightning TikTok hooks',
          'Visual and video scripting: images and scripts built to stop the scroll',
          'Infinite A/B tests: dozens of variants launched to learn what converts best',
        ],
      },
      image: IMG.creativeGenius,
      align: 'right',
    },
    {
      id: 'omnicanale',
      num: '02',
      tag: { it: 'Dominio omnicanale assoluto', en: 'Absolute omnichannel dominance' },
      title: { it: 'Ovunque siano i tuoi clienti, tutto il tempo', en: 'Wherever your customers are, all the time' },
      lead: {
        it: 'I tuoi futuri clienti saltano da Instagram a Google, guardano un video su YouTube e poi aprono TikTok. GENERAH AI li segue ovunque, orchestrando campagne millimetriche su ogni piattaforma.',
        en: 'Your future customers jump from Instagram to Google, watch a video on YouTube, then open TikTok. GENERAH AI follows them everywhere, orchestrating millimetric campaigns on every platform.',
      },
      points: {
        it: [
          'Facebook & Instagram per catturare la domanda latente con creatività che colpiscono',
          'Google Search & YouTube per intercettare la domanda consapevole',
          'TikTok per cavalcare i trend e abbassare il costo per lead; X per nicchie B2B',
        ],
        en: [
          'Facebook & Instagram to capture latent demand with striking creative',
          'Google Search & YouTube to intercept aware demand',
          'TikTok to ride trends and cut cost-per-lead; X for B2B niches',
        ],
      },
      image: IMG.mediaBuying,
      align: 'left',
    },
    {
      id: 'ottimizzazione',
      num: '03',
      tag: { it: 'Il cecchino degli algoritmi', en: 'The algorithm sniper' },
      title: { it: 'Ottimizzazione del budget, H24', en: 'Budget optimization, around the clock' },
      lead: {
        it: 'Dimentica l’ansia di dover spegnere una campagna che brucia soldi mentre dormi. GENERAH AI analizza CPA, CTR e ROAS in tempo reale ed è un predatore finanziario programmato per massimizzare il ritorno, giorno e notte.',
        en: 'Forget the anxiety of having to kill a money-burning campaign while you sleep. GENERAH AI analyzes CPA, CTR and ROAS in real time — a financial predator built to maximize return, day and night.',
      },
      points: {
        it: [
          'Taglia i fondi a un annuncio che performa male in un millisecondo',
          'Sposta aggressivamente il budget dove i lead costano meno',
          'Massimizza il ROI in tempo reale, senza pause e senza emozioni',
        ],
        en: [
          'Cuts funds to an underperforming ad in a millisecond',
          'Aggressively shifts budget to where leads cost least',
          'Maximizes ROI in real time, without pause and without emotion',
        ],
      },
      image: IMG.pricingHero,
      align: 'right',
    },
  ],

  channels: <Channel[]>[
    { name: 'Facebook', role: { it: 'Domanda latente', en: 'Latent demand' } },
    { name: 'Instagram', role: { it: 'Creatività visiva', en: 'Visual creative' } },
    { name: 'Google', role: { it: 'Domanda consapevole', en: 'Aware demand' } },
    { name: 'YouTube', role: { it: 'Video ad alto impatto', en: 'High-impact video' } },
    { name: 'TikTok', role: { it: 'Trend e CPL basso', en: 'Trends & low CPL' } },
    { name: 'X', role: { it: 'Nicchie B2B', en: 'B2B niches' } },
  ],

  closer: {
    eyebrow: { it: 'Il capolavoro finale', en: 'The final masterpiece' },
    title: {
      it: 'Crea l’esca, lancia la rete, recupera i pesci e te li serve pronti.',
      en: 'It makes the bait, casts the net, recovers the fish and serves them ready.',
    },
    sub: {
      it: 'Tu devi solo decidere quanto vuoi che il tuo business diventi grande.',
      en: 'You only have to decide how big you want your business to become.',
    },
  },
};
