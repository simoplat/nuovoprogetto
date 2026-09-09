/**
 * Gestione Parole e Indizi - Gioco dell'Impostore
 * 
 * NOTA: Tutte le parole, gli indizi e le categorie sono gestiti nel file 'words.json'
 * nella cartella principale. Per aggiungere nuove parole o categorie è sufficiente
 * modificare 'words.json' senza toccare il codice JavaScript!
 * 
 * Regola Indizi: ogni indizio è una sola parola generica riferita al contesto.
 * Se una parola non ha indizio associato, l'indizio rimane vuoto.
 */

// Database parole e mappa indizi in memoria
const WORD_DATABASE = {};
const WORD_CLUES = {};

/**
 * Dataset di fallback iniziale (garantisce il funzionamento immediato e offline
 * anche nel caso in cui la pagina venga aperta tramite protocollo file:// senza server web)
 */
const DEFAULT_FALLBACK_DATABASE = {
  cibo: {
    name: "Cibo & Bevande 🍕",
    words: [
      { word: "Pizza", clue: "Forno" },
      { word: "Sushi", clue: "Pesce" },
      { word: "Gelato", clue: "Estate" },
      { word: "Lasagne", clue: "Domenica" },
      { word: "Tiramisù", clue: "Dessert" },
      { word: "Hamburger", clue: "Panino" },
      { word: "Cappuccino", clue: "Colazione" },
      { word: "Spaghetti", clue: "Pasta" },
      { word: "Cioccolato", clue: "Cacao" },
      { word: "Risotto", clue: "Chicchi" },
      { word: "Patatine fritte", clue: "Contorno" },
      { word: "Crepes", clue: "Cialda" },
      { word: "Nutella", clue: "Crema" },
      { word: "Tacos", clue: "Messico" },
      { word: "Kebab", clue: "Spiedo" },
      { word: "Pancake", clue: "Sciroppo" },
      { word: "Macedonia", clue: "Frutta" },
      { word: "Bistecca", clue: "Brace" },
      { word: "Gnocchi", clue: "Patate" },
      { word: "Croissant", clue: "Sfoglia" },
      { word: "Polpette", clue: "Sugo" },
      { word: "Popcorn", clue: "Cinema" },
      { word: "Tagliata", clue: "Manzo" }
    ]
  },
  animali: {
    name: "Animali 🐾",
    words: [
      { word: "Pinguino", clue: "Ghiaccio" },
      { word: "Leone", clue: "Savana" },
      { word: "Delfino", clue: "Oceano" },
      { word: "Canguro", clue: "Australia" },
      { word: "Camaleonte", clue: "Mimetismo" },
      { word: "Squalo", clue: "Predatore" },
      { word: "Panda", clue: "Bambù" },
      { word: "Pipistrello", clue: "Caverna" },
      { word: "Aquila", clue: "Vetta" },
      { word: "Giraffa", clue: "Altezza" },
      { word: "Serpente", clue: "Strisciante" },
      { word: "Zebra", clue: "Strisce" },
      { word: "Koala", clue: "Eucalipto" },
      { word: "Coccodrillo", clue: "Fiume" },
      { word: "Gufo", clue: "Notte" },
      { word: "Polpo", clue: "Tentacoli" },
      { word: "Elefante", clue: "Proboscide" },
      { word: "Tartaruga", clue: "Guscio" },
      { word: "Lupo", clue: "Branco" },
      { word: "Ippopotamo", clue: "Fango" },
      { word: "Pappagallo", clue: "Piume" },
      { word: "Ghepardo", clue: "Velocità" },
      { word: "Scimmia", clue: "Alberi" }
    ]
  },
  luoghi: {
    name: "Luoghi & Viaggi ✈️",
    words: [
      { word: "Spiaggia", clue: "Sabbia" },
      { word: "Montagna", clue: "Sentiero" },
      { word: "Aeroporto", clue: "Volo" },
      { word: "Colosseo", clue: "Monumento" },
      { word: "Parigi", clue: "Capitale" },
      { word: "Discoteca", clue: "Musica" },
      { word: "Ospedale", clue: "Cura" },
      { word: "Museo", clue: "Arte" },
      { word: "Cinema", clue: "Schermo" },
      { word: "Stadio", clue: "Tifo" },
      { word: "Supermercato", clue: "Spesa" },
      { word: "Stazione dei treni", clue: "Binari" },
      { word: "Luna Park", clue: "Giostre" },
      { word: "Biblioteca", clue: "Libri" },
      { word: "Castello", clue: "Fortezza" },
      { word: "Piscina", clue: "Acqua" },
      { word: "Hotel di lusso", clue: "Soggiorno" },
      { word: "Venezia", clue: "Canali" },
      { word: "Sottomarino", clue: "Abissi" },
      { word: "Isola deserta", clue: "Naufragio" },
      { word: "Ristorante stellato", clue: "Gourmet" }
    ]
  },
  cinema: {
    name: "Cinema & Personaggi 🎬",
    words: [
      { word: "Harry Potter", clue: "Magia" },
      { word: "Batman", clue: "Notte" },
      { word: "Spider-Man", clue: "Ragnatela" },
      { word: "Il Gladiatore", clue: "Arena" },
      { word: "Shrek", clue: "Palude" },
      { word: "Star Wars", clue: "Galassia" },
      { word: "Titanic", clue: "Iceberg" },
      { word: "Sherlock Holmes", clue: "Indagine" },
      { word: "Jack Sparrow", clue: "Pirata" },
      { word: "James Bond", clue: "Spionaggio" },
      { word: "Darth Vader", clue: "Impero" },
      { word: "Joker", clue: "Follia" },
      { word: "Barbie", clue: "Moda" },
      { word: "Super Mario", clue: "Videogame" },
      { word: "Gollum", clue: "Anello" },
      { word: "Marilyn Monroe", clue: "Diva" },
      { word: "Indiana Jones", clue: "Archeologia" },
      { word: "Terminator", clue: "Futuro" },
      { word: "Capitan America", clue: "Scudo" }
    ]
  },
  oggetti: {
    name: "Oggetti Quotidiani 📦",
    words: [
      { word: "Ombrello", clue: "Pioggia" },
      { word: "Spazzolino", clue: "Igiene" },
      { word: "Forchetta", clue: "Tavola" },
      { word: "Smartphone", clue: "Schermo" },
      { word: "Sveglia", clue: "Mattino" },
      { word: "Occhiali da sole", clue: "Luce" },
      { word: "Cuscino", clue: "Riposo" },
      { word: "Portafoglio", clue: "Denaro" },
      { word: "Scarpe da ginnastica", clue: "Corsa" },
      { word: "Zaino", clue: "Spalle" },
      { word: "Chiavi di casa", clue: "Serratura" },
      { word: "Phon per capelli", clue: "Asciugatura" },
      { word: "Lampada", clue: "Illuminazione" },
      { word: "Borraccia", clue: "Idratazione" },
      { word: "Telecomando", clue: "Canali" },
      { word: "Valigia", clue: "Viaggio" },
      { word: "Aspirapolvere", clue: "Pulizia" },
      { word: "Microonde", clue: "Riscaldamento" },
      { word: "Pettine", clue: "Capelli" }
    ]
  },
  mestieri: {
    name: "Mestieri & Ruoli 💼",
    words: [
      { word: "Astronauta", clue: "Spazio" },
      { word: "Pompiere", clue: "Incendio" },
      { word: "Medico chirurgo", clue: "Ospedale" },
      { word: "Detective privato", clue: "Indagine" },
      { word: "Pizzaiolo", clue: "Farina" },
      { word: "Pilota di aerei", clue: "Cabina" },
      { word: "Calciatore famoso", clue: "Campo" },
      { word: "Attore di Hollywood", clue: "Recitazione" },
      { word: "Archeologo", clue: "Scavi" },
      { word: "Barbiere", clue: "Rasatura" },
      { word: "Spia segreta", clue: "Missione" },
      { word: "Giudice", clue: "Tribunale" },
      { word: "Chef stellato", clue: "Cucina" },
      { word: "Mago", clue: "Illusione" },
      { word: "DJ", clue: "Musica" },
      { word: "Meccanico", clue: "Motore" },
      { word: "Insegnante", clue: "Scuola" },
      { word: "Fotografo", clue: "Obiettivo" }
    ]
  },
  sport: {
    name: "Sport & Tempo Libero ⚽",
    words: [
      { word: "Calcio", clue: "Pallone" },
      { word: "Tennis", clue: "Racchetta" },
      { word: "Pallacanestro", clue: "Canestro" },
      { word: "Scacchi", clue: "Scacchiera" },
      { word: "Nuoto", clue: "Corsia" },
      { word: "Pugilato", clue: "Guantoni" },
      { word: "Bowling", clue: "Birilli" },
      { word: "Sci alpino", clue: "Neve" },
      { word: "Formula 1", clue: "Circuito" },
      { word: "Arrampicata", clue: "Parete" },
      { word: "Biliardo", clue: "Stecca" },
      { word: "Surf", clue: "Onda" },
      { word: "Padel", clue: "Vetro" },
      { word: "Ciclismo", clue: "Bicicletta" },
      { word: "Freccette", "clue": "Bersaglio" },
      { word: "Videogiochi", clue: "Controller" },
      { word: "Golf", clue: "Buca" }
    ]
  }
};

/**
 * Popola WORD_DATABASE e WORD_CLUES a partire da un oggetto JSON.
 * Supporta parole definite sia come stringhe semplici ("Pizza")
 * sia come oggetti con indizio ({ "word": "Pizza", "clue": "Forno" } o { "parola": "...", "indizio": "..." }).
 * Se una parola non ha indizio associato, l'indizio rimane vuoto ("").
 * @param {Object} data - Dati parsed dal JSON
 */
function setWordDatabase(data) {
  if (!data || typeof data !== "object") return;

  // Svuota i dizionari attuali mantenendo i riferimenti originali
  for (const key of Object.keys(WORD_DATABASE)) {
    delete WORD_DATABASE[key];
  }
  for (const key of Object.keys(WORD_CLUES)) {
    delete WORD_CLUES[key];
  }

  for (const [catKey, catData] of Object.entries(data)) {
    if (!catData || !catData.words || !Array.isArray(catData.words)) continue;

    const wordStrings = [];
    catData.words.forEach(item => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed) {
          wordStrings.push(trimmed);
          WORD_CLUES[trimmed] = ""; // Nessun indizio associato -> vuoto
        }
      } else if (item && typeof item === "object") {
        const w = (item.word || item.parola || item.name || "").toString().trim();
        const c = (item.clue || item.indizio || item.suggerimento || "").toString().trim();
        if (w) {
          wordStrings.push(w);
          WORD_CLUES[w] = c || ""; // Se non c'è indizio -> vuoto
        }
      }
    });

    if (wordStrings.length > 0) {
      WORD_DATABASE[catKey] = {
        name: catData.name || catKey,
        words: wordStrings
      };
    }
  }
}

/**
 * Carica in modo asincrono words.json
 * Supporta cache-busting per vedere istantaneamente le modifiche apportate dall'utente.
 */
async function initWordsDatabase() {
  try {
    const url = "words.json?t=" + Date.now();
    const res = await fetch(url);
    if (!res.ok) throw new Error("Status HTTP " + res.status);
    const data = await res.json();
    setWordDatabase(data);

    // Notifica l'avvenuto caricamento ai controller
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wordsLoaded", { detail: WORD_DATABASE }));
    }
    return WORD_DATABASE;
  } catch (err) {
    // Se la fetch fallisce (es. protocollo file:// o offline), usiamo il fallback di sicurezza
    console.info("Info: words.json caricato con database locale di sicurezza.", err && err.message);
    return WORD_DATABASE;
  }
}

// Inizializza subito con il database di fallback in modo sincrono
setWordDatabase(DEFAULT_FALLBACK_DATABASE);

// Avvia il fetch asincrono del file words.json se siamo nel browser
if (typeof window !== "undefined") {
  initWordsDatabase();
}

/**
 * Ottiene la lista di tutte le categorie disponibili
 */
function getAvailableCategories() {
  const cats = [{ id: "random", name: "🎲 Tutte le Categorie (Casuale)" }];
  for (const [key, val] of Object.entries(WORD_DATABASE)) {
    cats.push({ id: key, name: val.name });
  }
  return cats;
}

/**
 * Recupera l'indizio di contesto per una parola data
 * @param {string} word - La parola segreta
 * @returns {string} - L'indizio associato (oppure una stringa vuota se non presente)
 */
function getWordClue(word) {
  if (!word) return "";
  if (WORD_CLUES && WORD_CLUES[word] !== undefined) {
    return WORD_CLUES[word];
  }
  const lower = word.toLowerCase().trim();
  const foundKey = Object.keys(WORD_CLUES).find(k => k.toLowerCase().trim() === lower);
  return (foundKey && WORD_CLUES[foundKey]) ? WORD_CLUES[foundKey] : "";
}

/**
 * Estrae una parola casuale in base alla categoria selezionata
 * @param {string} categoryId - 'random' oppure la chiave della categoria
 * @returns {{ word: string, categoryName: string, categoryId: string, clue: string }}
 */
function pickSecretWord(categoryId = "random") {
  const keys = Object.keys(WORD_DATABASE);
  if (keys.length === 0) {
    return {
      word: "Mistero",
      categoryName: "Generale",
      categoryId: "default",
      clue: ""
    };
  }

  let selectedKey = categoryId;
  if (!selectedKey || selectedKey === "random" || !WORD_DATABASE[selectedKey]) {
    selectedKey = keys[Math.floor(Math.random() * keys.length)];
  }

  const category = WORD_DATABASE[selectedKey];
  const wordList = category ? category.words : [];
  if (!wordList || wordList.length === 0) {
    return {
      word: "Mistero",
      categoryName: category ? category.name : "Generale",
      categoryId: selectedKey,
      clue: ""
    };
  }

  const word = wordList[Math.floor(Math.random() * wordList.length)];
  const clue = getWordClue(word);

  return {
    word: word,
    categoryName: category.name,
    categoryId: selectedKey,
    clue: clue
  };
}

// Esporta per browser globale e moduli node
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    WORD_DATABASE,
    WORD_CLUES,
    setWordDatabase,
    initWordsDatabase,
    getAvailableCategories,
    getWordClue,
    pickSecretWord
  };
}
