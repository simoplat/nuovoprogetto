/**
 * Dizionario di parole per il Gioco dell'Impostore (in Italiano)
 * Ampia selezione per massimizzare la rigiocabilità e il divertimento
 */

const WORD_DATABASE = {
  cibo: {
    name: "Cibo & Bevande 🍕",
    words: [
      "Pizza", "Sushi", "Gelato", "Lasagne", "Tiramisù", "Hamburger", 
      "Cappuccino", "Spaghetti", "Cioccolato", "Risotto", "Patatine fritte", 
      "Crepes", "Nutella", "Tacos", "Kebab", "Pancake", "Macedonia", 
      "Bistecca", "Gnocchi", "Croissant", "Polpette", "Popcorn", "Tagliata"
    ]
  },
  animali: {
    name: "Animali 🐾",
    words: [
      "Pinguino", "Leone", "Delfino", "Canguro", "Camaleonte", "Squalo", 
      "Panda", "Pipistrello", "Aquila", "Giraffa", "Serpente", "Zebra", 
      "Koala", "Coccodrillo", "Gufo", "Polpo", "Elefante", "Tartaruga", 
      "Lupo", "Ippopotamo", "Pappagallo", "Ghepardo", "Scimmia"
    ]
  },
  luoghi: {
    name: "Luoghi & Viaggi ✈️",
    words: [
      "Spiaggia", "Montagna", "Aeroporto", "Colosseo", "Parigi", "Discoteca", 
      "Ospedale", "Museo", "Cinema", "Stadio", "Supermercato", "Stazione dei treni", 
      "Luna Park", "Biblioteca", "Castello", "Piscina", "Hotel di lusso", 
      "Venezia", "Sottomarino", "Isola deserta", "Ristorante stellato"
    ]
  },
  cinema: {
    name: "Cinema & Personaggi 🎬",
    words: [
      "Harry Potter", "Batman", "Spider-Man", "Il Gladiatore", "Shrek", 
      "Star Wars", "Titanic", "Sherlock Holmes", "Jack Sparrow", "James Bond", 
      "Darth Vader", "Joker", "Barbie", "Super Mario", "Gollum", 
      "Marilyn Monroe", "Indiana Jones", "Terminator", "Capitan America"
    ]
  },
  oggetti: {
    name: "Oggetti Quotidiani 📦",
    words: [
      "Ombrello", "Spazzolino", "Forchetta", "Smartphone", "Sveglia", 
      "Occhiali da sole", "Cuscino", "Portafoglio", "Scarpe da ginnastica", 
      "Zaino", "Chiavi di casa", "Phon per capelli", "Lampada", "Borraccia", 
      "Telecomando", "Valigia", "Aspirapolvere", "Microonde", "Pettine"
    ]
  },
  mestieri: {
    name: "Mestieri & Ruoli 💼",
    words: [
      "Astronauta", "Pompiere", "Medico chirurgo", "Detective privato", 
      "Pizzaiolo", "Pilota di aerei", "Calciatore famoso", "Attore di Hollywood", 
      "Archeologo", "Barbiere", "Spia segreta", "Giudice", "Chef stellato", 
      "Mago", "DJ", "Meccanico", "Insegnante", "Fotografo"
    ]
  },
  sport: {
    name: "Sport & Tempo Libero ⚽",
    words: [
      "Calcio", "Tennis", "Pallacanestro", "Scacchi", "Nuoto", "Pugilato", 
      "Bowling", "Sci alpino", "Formula 1", "Arrampicata", "Biliardo", 
      "Surf", "Padel", "Ciclismo", "Freccette", "Videogiochi", "Golf"
    ]
  }
};

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
 * Estrae una parola casuale in base alla categoria selezionata
 * @param {string} categoryId - 'random' oppure la chiave della categoria
 * @returns {{ word: string, categoryName: string, categoryId: string }}
 */
function pickSecretWord(categoryId = "random") {
  const keys = Object.keys(WORD_DATABASE);
  let selectedKey = categoryId;
  
  if (!selectedKey || selectedKey === "random" || !WORD_DATABASE[selectedKey]) {
    selectedKey = keys[Math.floor(Math.random() * keys.length)];
  }
  
  const category = WORD_DATABASE[selectedKey];
  const wordList = category.words;
  const word = wordList[Math.floor(Math.random() * wordList.length)];
  
  return {
    word: word,
    categoryName: category.name,
    categoryId: selectedKey
  };
}

// Esporta per browser globale e moduli node
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORD_DATABASE, getAvailableCategories, pickSecretWord };
}
