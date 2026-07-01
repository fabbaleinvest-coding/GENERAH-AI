// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Province italiane e prefisso telefonico (teleselettivo).
//
//  Alla registrazione l'utente indica la provincia dove svolge l'attività: da
//  lì ricaviamo il prefisso geografico corretto per assegnargli un numero DIDWW
//  (usato SIA per WhatsApp SIA per l'agente vocale: è lo STESSO numero) con il
//  prefisso locale, così i clienti riconoscono un recapito del loro territorio.
//
//  Il prefisso è memorizzato CON lo zero iniziale (es. "06", "02", "0922"): nei
//  numeri geografici italiani lo zero fa parte del numero nazionale anche in
//  formato E.164 (+39 06…, +39 0922…), quindi il match è  e164 like '+39'||prefisso||'%'.
// ───────────────────────────────────────────────────────────────────────────

export interface Provincia {
  sigla: string;
  nome: string;
  prefisso: string;
}

export const PROVINCE: Provincia[] = [
  { sigla: 'AG', nome: 'Agrigento', prefisso: '0922' },
  { sigla: 'AL', nome: 'Alessandria', prefisso: '0131' },
  { sigla: 'AN', nome: 'Ancona', prefisso: '071' },
  { sigla: 'AO', nome: 'Aosta', prefisso: '0165' },
  { sigla: 'AR', nome: 'Arezzo', prefisso: '0575' },
  { sigla: 'AP', nome: 'Ascoli Piceno', prefisso: '0736' },
  { sigla: 'AT', nome: 'Asti', prefisso: '0141' },
  { sigla: 'AV', nome: 'Avellino', prefisso: '0825' },
  { sigla: 'BA', nome: 'Bari', prefisso: '080' },
  { sigla: 'BT', nome: 'Barletta-Andria-Trani', prefisso: '0883' },
  { sigla: 'BL', nome: 'Belluno', prefisso: '0437' },
  { sigla: 'BN', nome: 'Benevento', prefisso: '0824' },
  { sigla: 'BG', nome: 'Bergamo', prefisso: '035' },
  { sigla: 'BI', nome: 'Biella', prefisso: '015' },
  { sigla: 'BO', nome: 'Bologna', prefisso: '051' },
  { sigla: 'BZ', nome: 'Bolzano', prefisso: '0471' },
  { sigla: 'BS', nome: 'Brescia', prefisso: '030' },
  { sigla: 'BR', nome: 'Brindisi', prefisso: '0831' },
  { sigla: 'CA', nome: 'Cagliari', prefisso: '070' },
  { sigla: 'CL', nome: 'Caltanissetta', prefisso: '0934' },
  { sigla: 'CB', nome: 'Campobasso', prefisso: '0874' },
  { sigla: 'CE', nome: 'Caserta', prefisso: '0823' },
  { sigla: 'CT', nome: 'Catania', prefisso: '095' },
  { sigla: 'CZ', nome: 'Catanzaro', prefisso: '0961' },
  { sigla: 'CH', nome: 'Chieti', prefisso: '0871' },
  { sigla: 'CO', nome: 'Como', prefisso: '031' },
  { sigla: 'CS', nome: 'Cosenza', prefisso: '0984' },
  { sigla: 'CR', nome: 'Cremona', prefisso: '0372' },
  { sigla: 'KR', nome: 'Crotone', prefisso: '0962' },
  { sigla: 'CN', nome: 'Cuneo', prefisso: '0171' },
  { sigla: 'EN', nome: 'Enna', prefisso: '0935' },
  { sigla: 'FM', nome: 'Fermo', prefisso: '0734' },
  { sigla: 'FE', nome: 'Ferrara', prefisso: '0532' },
  { sigla: 'FI', nome: 'Firenze', prefisso: '055' },
  { sigla: 'FG', nome: 'Foggia', prefisso: '0881' },
  { sigla: 'FC', nome: 'Forlì-Cesena', prefisso: '0543' },
  { sigla: 'FR', nome: 'Frosinone', prefisso: '0775' },
  { sigla: 'GE', nome: 'Genova', prefisso: '010' },
  { sigla: 'GO', nome: 'Gorizia', prefisso: '0481' },
  { sigla: 'GR', nome: 'Grosseto', prefisso: '0564' },
  { sigla: 'IM', nome: 'Imperia', prefisso: '0183' },
  { sigla: 'IS', nome: 'Isernia', prefisso: '0865' },
  { sigla: 'AQ', nome: "L'Aquila", prefisso: '0862' },
  { sigla: 'SP', nome: 'La Spezia', prefisso: '0187' },
  { sigla: 'LT', nome: 'Latina', prefisso: '0773' },
  { sigla: 'LE', nome: 'Lecce', prefisso: '0832' },
  { sigla: 'LC', nome: 'Lecco', prefisso: '0341' },
  { sigla: 'LI', nome: 'Livorno', prefisso: '0586' },
  { sigla: 'LO', nome: 'Lodi', prefisso: '0371' },
  { sigla: 'LU', nome: 'Lucca', prefisso: '0583' },
  { sigla: 'MC', nome: 'Macerata', prefisso: '0733' },
  { sigla: 'MN', nome: 'Mantova', prefisso: '0376' },
  { sigla: 'MS', nome: 'Massa-Carrara', prefisso: '0585' },
  { sigla: 'MT', nome: 'Matera', prefisso: '0835' },
  { sigla: 'ME', nome: 'Messina', prefisso: '090' },
  { sigla: 'MI', nome: 'Milano', prefisso: '02' },
  { sigla: 'MO', nome: 'Modena', prefisso: '059' },
  { sigla: 'MB', nome: 'Monza e Brianza', prefisso: '039' },
  { sigla: 'NA', nome: 'Napoli', prefisso: '081' },
  { sigla: 'NO', nome: 'Novara', prefisso: '0321' },
  { sigla: 'NU', nome: 'Nuoro', prefisso: '0784' },
  { sigla: 'OR', nome: 'Oristano', prefisso: '0783' },
  { sigla: 'PD', nome: 'Padova', prefisso: '049' },
  { sigla: 'PA', nome: 'Palermo', prefisso: '091' },
  { sigla: 'PR', nome: 'Parma', prefisso: '0521' },
  { sigla: 'PV', nome: 'Pavia', prefisso: '0382' },
  { sigla: 'PG', nome: 'Perugia', prefisso: '075' },
  { sigla: 'PU', nome: 'Pesaro e Urbino', prefisso: '0721' },
  { sigla: 'PE', nome: 'Pescara', prefisso: '085' },
  { sigla: 'PC', nome: 'Piacenza', prefisso: '0523' },
  { sigla: 'PI', nome: 'Pisa', prefisso: '050' },
  { sigla: 'PT', nome: 'Pistoia', prefisso: '0573' },
  { sigla: 'PN', nome: 'Pordenone', prefisso: '0434' },
  { sigla: 'PZ', nome: 'Potenza', prefisso: '0971' },
  { sigla: 'PO', nome: 'Prato', prefisso: '0574' },
  { sigla: 'RG', nome: 'Ragusa', prefisso: '0932' },
  { sigla: 'RA', nome: 'Ravenna', prefisso: '0544' },
  { sigla: 'RC', nome: 'Reggio Calabria', prefisso: '0965' },
  { sigla: 'RE', nome: 'Reggio Emilia', prefisso: '0522' },
  { sigla: 'RI', nome: 'Rieti', prefisso: '0746' },
  { sigla: 'RN', nome: 'Rimini', prefisso: '0541' },
  { sigla: 'RM', nome: 'Roma', prefisso: '06' },
  { sigla: 'RO', nome: 'Rovigo', prefisso: '0425' },
  { sigla: 'SA', nome: 'Salerno', prefisso: '089' },
  { sigla: 'SS', nome: 'Sassari', prefisso: '079' },
  { sigla: 'SV', nome: 'Savona', prefisso: '019' },
  { sigla: 'SI', nome: 'Siena', prefisso: '0577' },
  { sigla: 'SR', nome: 'Siracusa', prefisso: '0931' },
  { sigla: 'SO', nome: 'Sondrio', prefisso: '0342' },
  { sigla: 'SU', nome: 'Sud Sardegna', prefisso: '0781' },
  { sigla: 'TA', nome: 'Taranto', prefisso: '099' },
  { sigla: 'TE', nome: 'Teramo', prefisso: '0861' },
  { sigla: 'TR', nome: 'Terni', prefisso: '0744' },
  { sigla: 'TO', nome: 'Torino', prefisso: '011' },
  { sigla: 'TP', nome: 'Trapani', prefisso: '0923' },
  { sigla: 'TN', nome: 'Trento', prefisso: '0461' },
  { sigla: 'TV', nome: 'Treviso', prefisso: '0422' },
  { sigla: 'TS', nome: 'Trieste', prefisso: '040' },
  { sigla: 'UD', nome: 'Udine', prefisso: '0432' },
  { sigla: 'VA', nome: 'Varese', prefisso: '0332' },
  { sigla: 'VE', nome: 'Venezia', prefisso: '041' },
  { sigla: 'VB', nome: 'Verbano-Cusio-Ossola', prefisso: '0323' },
  { sigla: 'VC', nome: 'Vercelli', prefisso: '0161' },
  { sigla: 'VR', nome: 'Verona', prefisso: '045' },
  { sigla: 'VV', nome: 'Vibo Valentia', prefisso: '0963' },
  { sigla: 'VI', nome: 'Vicenza', prefisso: '0444' },
  { sigla: 'VT', nome: 'Viterbo', prefisso: '0761' },
];

export const PROVINCE_NOMI: string[] = PROVINCE.map((p) => p.nome);

const BY_NOME: Record<string, string> = Object.fromEntries(PROVINCE.map((p) => [p.nome, p.prefisso]));

// Prefisso geografico per una provincia (per nome). '' se non riconosciuta.
export function prefixForProvincia(nome: string | null | undefined): string {
  if (!nome) return '';
  return BY_NOME[nome.trim()] || '';
}
