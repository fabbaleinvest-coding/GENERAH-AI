export type FaqItem = { q: string; a: string };
export type FaqSection = { id: string; title: { it: string; en: string }; items: FaqItem[] };

export const faqHero = {
  eyebrow: { it: 'Domande frequenti', en: 'FAQ' },
  title: {
    it: 'Tutto quello che vuoi sapere su GENERAH AI.',
    en: 'Everything you want to know about GENERAH AI.',
  },
  sub: {
    it: 'Come funziona, cosa sa fare, come gestisce dati e privacy, quanto costa e in quanto tempo parte. Se non trovi la tua risposta qui, scrivici: la aggiungiamo.',
    en: 'How it works, what it can do, how it handles data and privacy, what it costs and how fast it goes live. If you don’t find your answer here, write to us: we’ll add it.',
  },
};

export const faqEnNote =
  'Le risposte dettagliate sono per ora disponibili in italiano. / Detailed answers are currently available in Italian.';

export const faqSections: FaqSection[] = [
  {
    id: "panoramica",
    title: { it: "GENERAH AI in breve", en: "GENERAH AI at a glance" },
    items: [
      { q: "Cos'è GENERAH AI?", a: "GENERAH AI è un ecosistema di intelligenza artificiale che lavora come un reparto commerciale e operativo completo. Acquisisce clienti e pazienti, li inserisce nel tuo CRM, li coltiva con email, WhatsApp e telefonate vocali, conduce video consulti, gestisce la segreteria e fa assistenza tecnica — 24 ore su 24, 7 giorni su 7, 365 giorni l'anno." },
      { q: "Per chi è pensato?", a: "Per qualsiasi attività che voglia più clienti e meno lavoro ripetitivo: aziende B2B, attività B2C ed e-commerce, professionisti, e in particolare cliniche mediche, studi odontoiatrici e centri veterinari." },
      { q: "Che problema risolve concretamente?", a: "Risolve l'emorragia di contatti persi: richieste senza risposta la sera e nel weekend, follow-up dimenticati, lead che si raffreddano, appuntamenti non confermati, telefonate a cui nessuno risponde. GENERAH è sempre presente e non lascia cadere nessuna opportunità." },
      { q: "È un software che devo installare o un servizio gestito?", a: "È un servizio gestito. Non devi installare né mantenere nulla: noi configuriamo, addestriamo e gestiamo il sistema su misura per la tua attività. Tu vedi i risultati nel tuo CRM e in una dashboard." },
      { q: "In cosa è diverso da un chatbot o da un centralino automatico?", a: "Un chatbot risponde a domande preimpostate; un centralino smista chiamate. GENERAH conversa in modo naturale su più canali, capisce il contesto, gestisce trattative e obiezioni, prende decisioni operative (prenota, ricontatta, smista) e impara la tua attività in profondità. È una differenza di categoria, non di grado." },
    ],
  },
  {
    id: "cosa-fa",
    title: { it: "Cosa sa fare", en: "What it can do" },
    items: [
      { q: "Quali canali gestisce?", a: "Email, WhatsApp, telefonate (in entrata e in uscita) con voce realistica, e video consulti con un agente visivo. Tutti coordinati tra loro." },
      { q: "Come acquisisce nuovi clienti e pazienti?", a: "Intercetta ogni richiesta in arrivo (form del sito, WhatsApp, campagne, chiamate) nell'istante in cui arriva, risponde immediatamente, qualifica il contatto e lo accompagna verso la prenotazione o la vendita." },
      { q: "Inserisce i contatti nel mio CRM da solo?", a: "Sì. Ogni contatto — con dati, fonte, interessi e cronologia delle interazioni — viene registrato automaticamente nel CRM, già organizzato e pronto all'uso. Zero inserimento manuale." },
      { q: "Fa follow-up e nurturing in autonomia?", a: "Sì. Attiva sequenze automatiche e personalizzate su email, WhatsApp e telefono, al momento giusto, finché il contatto non converte o chiede di non essere più ricontattato." },
      { q: "Può fare telefonate vere?", a: "Sì, sia in entrata sia in uscita, con una voce naturale. Richiama chi non ha risposto, conferma appuntamenti, recupera trattative ferme, qualifica i lead." },
      { q: "Può fare video consulti?", a: "Sì, tramite un agente visivo dall'aspetto umano che parla, ascolta e spiega in tempo reale." },
      { q: "Può fare assistenza tecnica ai miei clienti?", a: "Sì. GENERAH gestisce l'assistenza di primo livello: risponde a domande tecniche e sui prodotti, guida il cliente nella risoluzione dei problemi più comuni, apre e traccia i ticket, e quando serve passa la pratica a un tecnico umano con tutto il contesto già pronto. (Vedi la sezione dedicata.)" },
      { q: "Può svolgere il lavoro di segreteria?", a: "Sì. Gestisce agenda e appuntamenti, risponde al telefono, prende messaggi, invia promemoria, recupera i no-show, smista email e gestisce i richiami periodici. (Vedi la sezione dedicata.)" },
      { q: "Lavora davvero 24 ore su 24?", a: "Sì. Non dorme, non stacca, non va in ferie. È operativo h24, 7/7, 365/365." },
      { q: "Gestisce più conversazioni contemporaneamente?", a: "Sì. A differenza di una persona, può seguire decine o centinaia di contatti in parallelo senza cali di qualità." },
    ],
  },
  {
    id: "agente-vocale",
    title: { it: "L'agente vocale", en: "The voice agent" },
    items: [
      { q: "La voce è davvero indistinguibile da quella umana?", a: "La voce e la cadenza sono estremamente realistiche, con intonazione e pause naturali. Nella grande maggioranza delle conversazioni l'interlocutore non percepisce di parlare con un'AI." },
      { q: "In che lingue parla?", a: "È multilingua. Può conversare in italiano e nelle principali lingue internazionali; la configuriamo sulle lingue che ti servono." },
      { q: "I clienti si accorgono che è un'AI? Devo dirglielo?", a: "Possiamo impostare il livello di trasparenza che preferisci. In alcuni contesti e Paesi la legge richiede di dichiarare che si sta interagendo con un'AI: ti consigliamo la trasparenza, ed è una scelta che configuriamo insieme." },
      { q: "Cosa succede se il cliente fa una domanda imprevista?", a: "GENERAH attinge alla knowledge base della tua attività e risponde in modo pertinente. Se la domanda esce dal suo perimetro, lo gestisce con eleganza e, dove previsto, passa a un operatore umano." },
      { q: "Può gestire obiezioni e trattative?", a: "Sì. È addestrato sulle obiezioni tipiche del tuo settore e sa argomentare, rassicurare e guidare verso la decisione." },
      { q: "Può chiamare numeri \"freddi\"?", a: "Tecnicamente sì, ma il contatto a freddo è soggetto a regole precise (consenso, normativa, policy delle piattaforme). Ti aiutiamo a usare GENERAH nel rispetto delle regole, privilegiando i contatti che hanno già manifestato interesse. (Vedi sezione Privacy.)" },
    ],
  },
  {
    id: "agente-video",
    title: { it: "L'agente video", en: "The video agent" },
    items: [
      { q: "Come funziona il video consulto?", a: "Il cliente avvia una videochiamata e vede un volto umano che parla, ascolta e risponde in tempo reale, esattamente sull'attività della tua azienda." },
      { q: "Da dove viene il volto?", a: "Può essere generato a partire dalle foto di una persona reale, oppure essere un volto con fattezze del tutto simili a quelle di una persona reale." },
      { q: "Posso usare il volto di una persona reale, ad esempio il mio?", a: "Sì, con il consenso della persona ritratta. Possiamo creare l'agente visivo a partire dalle sue foto." },
      { q: "Quanto è realistico?", a: "Molto. L'obiettivo è un'esperienza naturale e rassicurante, indistinguibile da una videochiamata con una persona nella maggior parte dei casi." },
      { q: "Serve un'app particolare al cliente?", a: "No, lo configuriamo per essere accessibile in modo semplice, senza barriere per l'utente finale." },
    ],
  },
  {
    id: "personalizzazione",
    title: { it: "Personalizzazione (RAG e knowledge base)", en: "Personalization (RAG & knowledge base)" },
    items: [
      { q: "Come fa a conoscere la mia attività?", a: "Costruiamo per te una knowledge base e un sistema RAG su misura: servizi, listini, procedure, domande ricorrenti, tono di voce, valori. GENERAH risponde come risponderesti tu." },
      { q: "Quanto è accurato? Può inventare risposte?", a: "Le risposte sono ancorate alle informazioni che ci fornisci, proprio per ridurre al minimo gli errori. Impostiamo regole e limiti precisi su cosa può e non può dire, così evita di \"improvvisare\" su ciò che non conosce." },
      { q: "Posso aggiornare le informazioni nel tempo?", a: "Sì. Listini, servizi, promozioni e procedure si aggiornano quando vuoi, e GENERAH si allinea." },
      { q: "Parla con il mio tono di voce?", a: "Sì. Configuriamo lo stile — formale, amichevole, tecnico — in linea con il tuo brand." },
      { q: "Cosa succede se cambio listino o servizi?", a: "Aggiorni le informazioni (o ce le segnali) e GENERAH inizia subito a usare le nuove." },
    ],
  },
  {
    id: "assistenza",
    title: { it: "Assistenza tecnica", en: "Technical support" },
    items: [
      { q: "GENERAH può fare supporto tecnico ai miei clienti?", a: "Sì. Gestisce l'assistenza di primo livello in autonomia, su chat, WhatsApp, email e telefono." },
      { q: "Che tipo di problemi può risolvere?", a: "Domande su prodotti e servizi, configurazioni, errori comuni, istruzioni d'uso, stato degli ordini, richieste ricorrenti: tutto ciò che è coperto dalla knowledge base che costruiamo insieme." },
      { q: "Apre e gestisce i ticket?", a: "Sì. Registra la richiesta, la classifica, la traccia e ne segue lo stato, mantenendo tutto ordinato nel tuo sistema." },
      { q: "Quando passa la pratica a un tecnico umano?", a: "Quando il problema supera il perimetro previsto o richiede un intervento specialistico: in quel caso effettua l'escalation a una persona, consegnandole il contesto completo già pronto, così il tecnico non riparte da zero." },
      { q: "Funziona anche al telefono e non solo in chat?", a: "Sì. L'assistenza può avvenire anche tramite l'agente vocale." },
    ],
  },
  {
    id: "segreteria",
    title: { it: "Segreteria", en: "Reception & scheduling" },
    items: [
      { q: "GENERAH può fare da segretaria o receptionist?", a: "Sì. Accoglie, risponde, prenota e organizza, su telefono e in chat, senza orari." },
      { q: "Gestisce l'agenda e gli appuntamenti?", a: "Sì. Prenota, sposta e cancella appuntamenti, evitando sovrapposizioni e ottimizzando l'agenda." },
      { q: "Invia promemoria e recupera i no-show?", a: "Sì. Manda promemoria automatici e ricontatta chi non si è presentato per riprogrammare, riducendo i buchi in agenda." },
      { q: "Risponde al telefono e prende messaggi?", a: "Sì. Risponde sempre, raccoglie le richieste, prende messaggi e li registra nel sistema." },
      { q: "Gestisce richiami periodici (es. vaccini, controlli, scadenze)?", a: "Sì. Programma e invia richiami ricorrenti — controlli odontoiatrici, vaccinazioni veterinarie, visite di controllo, rinnovi — fidelizzando i clienti." },
      { q: "Filtra e smista le email?", a: "Sì. Classifica, risponde alle richieste standard e indirizza quelle che richiedono attenzione umana." },
    ],
  },
  {
    id: "settori",
    title: { it: "Settori specifici", en: "Specific industries" },
    items: [
      { q: "Funziona per le cliniche mediche?", a: "Sì. Accoglie i pazienti a ogni ora, fornisce informazioni amministrative, prenota visite, invia promemoria e recupera gli appuntamenti mancati." },
      { q: "GENERAH può dare consigli o diagnosi mediche?", a: "No. Non fornisce diagnosi né consulenza clinica: gestisce informazioni amministrative, accoglienza, prenotazioni e raccolta di informazioni preliminari. Ogni valutazione clinica resta in capo al professionista sanitario." },
      { q: "Funziona per gli studi odontoiatrici?", a: "Sì. Dalla prima richiesta al preventivo, dal promemoria al follow-up post-trattamento: ogni paziente seguito con costanza, ogni poltrona vuota un'occasione recuperata." },
      { q: "Funziona per i veterinari?", a: "Sì. Risponde con empatia ai proprietari in ansia, prenota visite e gestisce i richiami per vaccinazioni e controlli." },
      { q: "Funziona per il B2B?", a: "Sì. Intercetta il decisore nel momento del bisogno, lo qualifica e lo coltiva lungo cicli di vendita anche lunghi senza che un lead si raffreddi." },
      { q: "Funziona per il B2C e l'e-commerce?", a: "Sì. Risponde all'istante quando il desiderio è acceso, recupera carrelli e contatti tiepidi e trasforma la curiosità in acquisto." },
      { q: "La mia attività è molto particolare: funziona lo stesso?", a: "Quasi sempre sì. La personalizzazione del RAG serve esattamente a questo. In fase di analisi valutiamo insieme il tuo caso specifico." },
    ],
  },
  {
    id: "integrazione",
    title: { it: "Integrazione e tecnologia", en: "Integration & technology" },
    items: [
      { q: "Si integra con il mio CRM o gestionale?", a: "GENERAH è progettato per integrarsi con i principali CRM e gestionali. In fase di analisi verifichiamo il tuo strumento e la modalità di integrazione migliore." },
      { q: "Si integra con il mio numero di telefono e con WhatsApp?", a: "Sì. Configuriamo i canali telefonici e l'account WhatsApp Business in modo che GENERAH operi con la tua identità." },
      { q: "Devo essere esperto di tecnologia?", a: "No. Pensiamo a tutto noi: configurazione, addestramento e gestione. A te resta il controllo e i risultati." },
      { q: "Dove vengono salvati i dati?", a: "I dati vengono gestiti su infrastrutture sicure. Definiamo insieme, in fase contrattuale, le modalità di trattamento e conservazione conformi alla normativa. (Vedi sezione Privacy.)" },
      { q: "Posso vedere e ascoltare cosa fa l'AI?", a: "Sì. Hai accesso a trascrizioni, registrazioni (dove consentito), cronologia delle conversazioni e una dashboard con le performance." },
    ],
  },
  {
    id: "privacy",
    title: { it: "Privacy, GDPR e compliance", en: "Privacy, GDPR & compliance" },
    items: [
      { q: "GENERAH AI è conforme al GDPR?", a: "Il sistema è costruito per supportare la conformità (sicurezza, tracciabilità, controllo). Va però ricordato che il titolare del trattamento dei dati dei tuoi clienti sei tu: insieme definiamo gli accordi necessari (es. nomina a responsabile del trattamento) e le corrette basi giuridiche." },
      { q: "Come gestite i dati sensibili, ad esempio quelli sanitari?", a: "I dati sanitari sono categorie particolari ai sensi del GDPR e richiedono tutele rafforzate (consenso adeguato, misure di sicurezza, accordi specifici). Configuriamo l'ecosistema con queste cautele e ti supportiamo nel rispettarle." },
      { q: "Posso caricare le mie liste di contatti per farle lavorare a GENERAH?", a: "Sì, a condizione che tu disponga di una base giuridica valida per contattarli (es. consenso). Contattare liste fredde o acquistate senza consenso viola normativa e policy delle piattaforme e può portare al blocco del numero: per questo privilegiamo e ti aiutiamo a lavorare i contatti opt-in." },
      { q: "È legale far contattare i miei clienti da un'AI?", a: "Sì, nel rispetto delle regole su consenso, marketing e — dove richiesto — trasparenza sull'uso dell'AI. Ti guidiamo nella configurazione corretta." },
      { q: "Chi è il titolare del trattamento?", a: "Di norma resti tu il titolare, in quanto è la tua attività a raccogliere e usare i dati dei clienti; noi operiamo come fornitore del servizio secondo gli accordi che stipuliamo." },
    ],
  },
  {
    id: "affidabilita",
    title: { it: "Affidabilità e controllo", en: "Reliability & control" },
    items: [
      { q: "Cosa succede se l'AI sbaglia?", a: "Impostiamo limiti, regole e controlli per minimizzare gli errori, e monitoriamo le conversazioni. Dove serve, prevediamo il passaggio a un operatore umano. Nessun sistema è infallibile, ma il modello è progettato per essere prudente su ciò che non conosce." },
      { q: "Come evitate che dica cose sbagliate o \"inventate\"?", a: "Le risposte sono ancorate alle informazioni che ci fornisci (RAG), con guardrail su argomenti e toni. Definiamo cosa l'AI non deve mai dire o promettere." },
      { q: "Posso mettere limiti su cosa può e non può dire?", a: "Sì, ed è parte della configurazione: argomenti vietati, frasi da non usare, casi da rimandare sempre a un umano." },
      { q: "Cosa succede se c'è un disservizio tecnico?", a: "Monitoriamo l'operatività e interveniamo in caso di anomalie, con il supporto previsto dal tuo piano." },
      { q: "Monitorate le performance?", a: "Sì. Hai metriche su contatti gestiti, appuntamenti fissati, conversioni e attività su ogni canale." },
    ],
  },
  {
    id: "prezzi",
    title: { it: "Prezzi, contratti e ROI", en: "Pricing, contracts & ROI" },
    items: [
      { q: "Quanto costa?", a: "GENERAH è offerto in pacchetti (Starter, Growth, Premium, Enterprise) con un canone mensile e un'attivazione una tantum. I canoni vanno indicativamente da circa 790 € a 4.500 €+ al mese a seconda delle funzionalità e dei volumi. Ti proponiamo la fascia più adatta dopo l'analisi." },
      { q: "Cosa è incluso nel canone?", a: "Il funzionamento dell'ecosistema sui canali previsti, un pacchetto di minuti di telefonate, minuti di video consulto e messaggi WhatsApp, il CRM e le automazioni, oltre alla gestione del sistema." },
      { q: "Cosa sono i minuti e i messaggi inclusi?", a: "Ogni piano include una quota mensile di minuti telefono, minuti video e messaggi di marketing WhatsApp. Le conversazioni con chi ti scrive per primo sono illimitate." },
      { q: "Cosa succede se supero le soglie incluse?", a: "Puoi acquistare pacchetti aggiuntivi di minuti o messaggi a prezzi a scalare, oppure attivare la ricarica automatica per non interrompere mai il servizio." },
      { q: "C'è un costo di attivazione?", a: "Sì, una tantum: copre la costruzione della knowledge base su misura, l'eventuale clonazione voce/avatar, l'integrazione con il tuo CRM e la configurazione dei flussi." },
      { q: "Qual è la durata minima del contratto?", a: "È previsto un periodo minimo (tipicamente 6-12 mesi) per ammortizzare l'attivazione e dare al sistema il tempo di produrre risultati. I dettagli sono nel contratto." },
      { q: "Conviene davvero rispetto a un dipendente?", a: "Sì. Un dipendente commerciale costa all'azienda circa 45.000 € l'anno e lavora circa 1.720 ore. GENERAH opera 8.760 ore l'anno (24h × 365 giorni): oltre 5 volte la copertura oraria, a un costo annuo nettamente inferiore — e gestisce molti contatti in parallelo." },
      { q: "In quanto tempo rientro dell'investimento?", a: "Dipende dal volume di contatti e dal valore medio del cliente, ma il modello è pensato perché il costo si ripaghi con un numero contenuto di vendite o appuntamenti aggiuntivi al mese." },
      { q: "Ci sono sconti o codici dedicati?", a: "Sì, prevediamo offerte riservate e un programma partner. Chiedi al tuo referente il codice o l'offerta attiva." },
    ],
  },
  {
    id: "onboarding",
    title: { it: "Onboarding e supporto", en: "Onboarding & support" },
    items: [
      { q: "Quanto tempo serve per andare live?", a: "Dipende dalla complessità, ma l'obiettivo è renderti operativo in tempi rapidi. Ti diamo una stima precisa dopo l'analisi iniziale." },
      { q: "Cosa devo fare io durante l'attivazione?", a: "Fornirci le informazioni sulla tua attività (servizi, listini, procedure, FAQ) e gli accessi necessari. Al resto pensiamo noi." },
      { q: "Chi gestisce il sistema dopo l'attivazione?", a: "Lo gestiamo noi come servizio. Tu mantieni il controllo, vedi i risultati e puoi richiedere modifiche." },
      { q: "Che supporto ricevo?", a: "Supporto e assistenza secondo il piano scelto, con monitoraggio e aggiornamenti." },
    ],
  },
  {
    id: "limiti",
    title: { it: "Limiti e trasparenza", en: "Limits & transparency" },
    items: [
      { q: "Cosa NON fa GENERAH AI?", a: "Non fornisce diagnosi o consulenza professionale regolamentata (medica, legale, ecc.), non prende decisioni che richiedono giudizio umano specialistico e non agisce fuori dai limiti che impostiamo. È progettato per essere prudente, non onnisciente." },
      { q: "Sostituisce completamente il mio personale?", a: "No, ed è un bene: libera il personale dalle attività ripetitive e dai contatti a cui nessuno riuscirebbe a rispondere h24, così le persone si concentrano sul valore alto. Lavora con il tuo team, non contro." },
      { q: "C'è sempre la possibilità di intervento umano?", a: "Sì. Definiamo i casi in cui la conversazione passa a una persona, con tutto il contesto già pronto." },
    ],
  },
  {
    id: "obiezioni",
    title: { it: "Obiezioni frequenti", en: "Common objections" },
    items: [
      { q: "\"I miei clienti non vogliono parlare con un robot.\"", a: "GENERAH non è un robot impacciato: conversa in modo naturale ed empatico. La maggior parte degli utenti apprezza soprattutto una cosa — ricevere una risposta immediata, a qualsiasi ora, invece di aspettare o trovare la segreteria." },
      { q: "\"La mia attività è troppo specifica.\"", a: "È proprio la personalizzazione (RAG su misura) a gestire le specificità. Lo valutiamo insieme nel tuo caso." },
      { q: "\"Ho paura di perdere il tocco umano.\"", a: "Il tocco umano resta dove conta. GENERAH copre i momenti in cui, altrimenti, non ci sarebbe nessuno: la sera, il weekend, i picchi, i follow-up dimenticati." },
      { q: "\"E se non funziona per me?\"", a: "Partiamo da un'analisi del tuo caso e ti mostriamo come si applica concretamente alla tua attività prima di procedere." },
      { q: "\"È troppo costoso.\"", a: "Confrontato con il costo e i limiti di una persona — e con il valore dei clienti che oggi perdi — il costo di GENERAH si ripaga con poche conversioni aggiuntive al mese." },
    ],
  },
  {
    id: "partner",
    title: { it: "Programma partner", en: "Partner program" },
    items: [
      { q: "Esiste un programma per partner commerciali?", a: "Sì. Se porti clienti a GENERAH AI, ricevi una commissione ricorrente per ogni cliente attivo che hai segnalato." },
      { q: "Quanto guadagna un partner?", a: "La commissione è ricorrente sul canone dei clienti segnalati: un flusso che cresce man mano che porti nuovi clienti. Chiedi al tuo referente i dettagli e il tuo codice dedicato." },
    ],
  },
];
