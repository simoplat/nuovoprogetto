/**
 * lupus_roles.js - Ruoli e configurazione per Lupus in Fabula
 */

const INFILTRATO_CONFIG = {
  baseChance: 0.10,      // Probabilità Notte 1: 10%
  chancePerNight: 0.08,  // Incremento a ogni notte successiva: +8% (Notte 2: 18%, Notte 3: 26%...)
  maxChance: 0.45        // SOGLIA MASSIMA MODIFICABILE (45%)
};

const LUPUS_ROLES = {
  lupo: {
    id: "lupo",
    name: "Lupo",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐺",
    icon: "🐺",
    image: "img/lupus/lupo.jpg",
    color: "#ff2a5f",
    description: "Ogni notte ti svegli insieme agli altri Lupi per scegliere una vittima da sbranare. Di giorno, bluffa e confondi il villaggio per non farti mandare al rogo!",
    nightAction: "I Lupi aprono gli occhi insieme, si coordinano silenziosamente e indicano la vittima al Narratore."
  },
  veggente: {
    id: "veggente",
    name: "Veggente",
    faction: "villaggio",
    factionLabel: "Villaggio 🔮",
    icon: "🔮",
    image: "img/lupus/veggente.jpg",
    color: "#a855f7",
    description: "Ogni notte puoi interrogare il Narratore su un giocatore per scoprire se appartiene al Branco dei Lupi o agli innocenti. Guida il villaggio senza esporti troppo!",
    nightAction: "Il Veggente apre gli occhi e indica un giocatore. Il Narratore annuisce (Lupo) o scuote la testa (Non Lupo)."
  },
  guardia: {
    id: "guardia",
    name: "Guardia",
    faction: "villaggio",
    factionLabel: "Villaggio 🛡️",
    icon: "🛡️",
    image: "img/lupus/guardia.jpg",
    color: "#3b82f6",
    description: "Ogni notte indichi un giocatore (puoi scegliere anche te stesso) per proteggerlo con il suo scudo. Se i Lupi (incluso il Lupo Bianco) lo attaccano, sopravviverà!",
    nightAction: "La Guardia apre gli occhi e indica chi proteggere per la notte. Lo scudo difende da tutti gli attacchi dei lupi."
  },
  strega: {
    id: "strega",
    name: "Strega",
    faction: "villaggio",
    factionLabel: "Villaggio 🧙‍♀️",
    icon: "🧙‍♀️",
    image: "img/lupus/strega.jpg",
    color: "#10b981",
    description: "Possiedi 2 potenti pozioni monouso per partita: la Pozione di Vita per salvare chiunque tu scelga, e la Pozione di Morte per avvelenare un sospettato. Puoi usare al massimo 1 sola pozione a notte!",
    nightAction: "La Strega decide se usare la Pozione di Vita oppure la Pozione di Morte (massimo 1 pozione a notte)."
  },
  cupido: {
    id: "cupido",
    name: "Cupido",
    faction: "villaggio",
    factionLabel: "Villaggio 💘",
    icon: "💘",
    image: "img/lupus/cupido.jpg",
    color: "#f43f5e",
    description: "Solo la Prima Notte, scagli le tue frecce su due giocatori legandoli nel destino. Se uno dei due muore in qualunque momento (notte o giorno), l'altro muore all'istante di crepacuore! Non esiste condizione di vittoria della coppia: muoiono semplicemente insieme.",
    nightAction: "Cupido apre gli occhi solo la prima notte e sceglie 2 giocatori da innamorare toccando loro la spalla."
  },
  donna: {
    id: "donna",
    name: "La Donna (Meretrice)",
    faction: "villaggio",
    factionLabel: "Villaggio 💃",
    icon: "💃",
    image: "img/lupus/donna.jpg",
    color: "#ec4899",
    description: "Ogni notte scegli un abitante da visitare per rifugiarti a casa sua. Se visiti un Lupo muori sbranata! Se i lupi attaccano te sei salva (non eri a casa), ma se sbranano il tuo ospite morite entrambi!",
    nightAction: "La Donna apre gli occhi e indica con chi trascorrerà la notte."
  },
  contadino: {
    id: "contadino",
    name: "Contadino",
    faction: "villaggio",
    factionLabel: "Villaggio 👨‍🌾",
    icon: "👨‍🌾",
    image: "img/lupus/contadino.jpg",
    color: "#eab308",
    description: "Non hai poteri notturni speciali. La tua forza risiede nella deduzione, nell'osservazione e nel voto diurno per mandare al rogo i Lupi Mannari!",
    nightAction: "I Contadini dormono sonni profondi durante tutta la notte."
  },
  giullare: {
    id: "giullare",
    name: "Il Giullare",
    faction: "solitario",
    factionLabel: "Fazione Solitaria 🃏",
    icon: "🃏",
    image: "img/lupus/giullare.jpg",
    color: "#f59e0b",
    description: "Il generatore di caos per eccellenza! Non appartieni a nessuna fazione e vinci UNICAMENTE se riesci a farti condannare al rogo dal villaggio. Comportati in modo ambiguo, semina il dubbio e fatti bruciare!",
    nightAction: "Il Giullare dorme sonni tranquilli tutta la notte sognando il suo rogo trionfale."
  },
  infiltrato: {
    id: "infiltrato",
    name: "Lupo Mannaro",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐺🌕",
    icon: "🐺🌕",
    image: "img/lupus/lupo_mannaro.jpg",
    color: "#ef4444",
    description: "Umano affetto da licantropia latente! Dormi con gli umani: al Veggente appari Non Lupo e, se muori prima di trasformarti, anche al Beccamorto appari con copertura da Contadino! Ma ogni notte il dado della Luna Piena può trasformarti per sempre in un vero Lupo del branco.",
    nightAction: "Ogni notte viene lanciato il dado della Luna Piena: se si trasforma, diventa per sempre un Lupo a tutti gli effetti (non può più tornare umano)."
  },
  lupo_bianco: {
    id: "lupo_bianco",
    name: "Il Lupo Bianco",
    faction: "solitario",
    factionLabel: "Fazione Solitaria 🐺❄️",
    icon: "🐺❄️",
    image: "img/lupus/lupo_bianco.jpg",
    color: "#38bdf8",
    description: "Ti svegli ogni notte con il branco e fingi alleanza. A notti alterne (notte 2, 4, 6...), però, ti svegli una seconda volta da solo e puoi sbranare uno degli altri lupi! Vinci SOLO se resti l'ultimo e unico sopravvissuto della partita.",
    nightAction: "Si sveglia con il branco per scegliere la vittima del villaggio. A notti alterne (pari) si sveglia da solo e può eliminare un compagno lupo."
  },
  lupo_stregone: {
    id: "lupo_stregone",
    name: "Il Lupo Stregone",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐺🔮",
    icon: "🐺🔮",
    image: "img/lupus/lupo_stregone.jpg",
    color: "#9333ea",
    description: "Ti svegli con il branco dei Lupi ogni notte. Subito dopo, ti svegli da solo e puoi scagliare la tua maledizione: indica un abitante al Narratore. Se quel giocatore ha un potere notturno attivo (Guardia, Veggente, Strega, Beccamorto, Necromante), il suo potere sarà bloccato per questa notte!",
    nightAction: "Si sveglia con i lupi. Subito dopo apre gli occhi da solo e indica un giocatore per bloccarne il potere notturno se attivo."
  },
  beccamorto: {
    id: "beccamorto",
    name: "Il Beccamorto",
    faction: "villaggio",
    factionLabel: "Villaggio ⚰️",
    icon: "⚰️",
    image: "img/lupus/beccamorto.jpg",
    color: "#64748b",
    description: "I morti ti parlano nel silenzio del cimitero. Dalla Notte 2 in poi, ogni notte il Narratore ti sveglia e puoi scoprire l'identità di un solo morto alla volta. Vede il ruolo reale del caduto, tranne per l'Infiltrato non trasformato che mantiene la copertura da Contadino!",
    nightAction: "Dalla Notte 2 in poi, il Beccamorto apre gli occhi e indica un solo morto del cimitero. Il Narratore gli mostra la carta o mima il ruolo del prescelto (massimo 1 a notte)."
  },
  idiota: {
    id: "idiota",
    name: "L'Idiota del Villaggio",
    faction: "villaggio",
    factionLabel: "Villaggio 🤡",
    icon: "🤡",
    image: "img/lupus/idiota.jpg",
    color: "#14b8a6",
    description: "Sei un membro innocente del Villaggio, ma i tuoi modi stralunati ingannano le visioni mistiche: se il Veggente ti scruta di notte, il Narratore gli risponderà falsamente che sei un LUPO! Difenditi dal rogo!",
    nightAction: "L'Idiota dorme sonni beati. Al Veggente risulterà falsamente come 'Lupo'."
  },
  cane_nero: {
    id: "cane_nero",
    name: "Il Cane Nero (Lupo Illusionista)",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐕‍🦺",
    icon: "🐕‍🦺",
    image: "img/lupus/cane_nero.jpg",
    color: "#dc2626",
    description: "Sei un feroce Lupo Mannaro sotto le sembianze di un fedele segugio nero. Ti svegli ogni notte con il branco per scegliere la vittima. La tua abilità illusoria: al Veggente risulti insospettabile come 'NON Lupo'!",
    nightAction: "Si sveglia con il branco dei lupi ogni notte. Se il Veggente lo scruta, il Narratore risponde che è 'Non Lupo'."
  },
  necromante: {
    id: "necromante",
    name: "Il Necromante",
    faction: "villaggio",
    factionLabel: "Villaggio 🕯️💀",
    icon: "🕯️💀",
    image: "img/lupus/necromante.jpg",
    color: "#8b5cf6",
    description: "Padrone dei misteri della morte, fedele al Villaggio. Una sola volta in tutta la partita, a partire dalla Notte 2, puoi richiamare dall'oltretomba un qualsiasi defunto del cimitero per farlo risorgere all'alba tra i vivi! Attento: se resusciti un Lupo per sbaglio, tornerà a sbranare col branco.",
    nightAction: "Dalla Notte 2 in poi, il Necromante apre gli occhi ed ha 1 sola opportunità per partita di indicare un defunto del cimitero e farlo resuscitare."
  }
};

if (typeof window !== "undefined") {
  window.INFILTRATO_CONFIG = INFILTRATO_CONFIG;
  window.LUPUS_ROLES = LUPUS_ROLES;
}
