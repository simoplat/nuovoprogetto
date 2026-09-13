/**
 * ruota_phrases.js - Catalogo Frasi Italiane & Algoritmo Impaginazione Tabellone TV
 * 
 * Il tabellone classico della Ruota della Fortuna ha 4 righe con configurazione ottagonale:
 * - Riga 1: 12 caselle
 * - Riga 2: 14 caselle
 * - Riga 3: 14 caselle
 * - Riga 4: 12 caselle
 * Totale: 52 caselle.
 */

const RUOTA_ROW_CAPACITIES = [12, 14, 14, 12];

const RUOTA_CATEGORIES = {
  "proverbi": {
    name: "Proverbi e Modi di Dire",
    icon: "📜",
    phrases: [
      "CHI DORME NON PIGLIA PESCI",
      "L'APPETITO VIEN MANGIANDO",
      "MEGLIO UN UOVO OGGI CHE UNA GALLINA DOMANI",
      "CAN CHE ABBAIA NON MORDE",
      "IL MATTINO HA L'ORO IN BOCCA",
      "TUTTE LE STRADE PORTANO A ROMA",
      "NON E TUTTO ORO QUEL CHE LUCCICA",
      "A CAVAL DONATO NON SI GUARDA IN BOCCA",
      "CHI LA DURA LA VINCE",
      "L'ABITO NON FA IL MONACO",
      "TRA MOGLIE E MARITO NON METTERE IL DITO",
      "GALLINA VECCHIA FA BUON BRODO",
      "ROSSO DI SERA BEL TEMPO SI SPERA",
      "RIDERE DI GUSTO ALLUNGA LA VITA",
      "GATTO SILENZIOSO ACCHIAPPA IL TOPO",
      "LA NOTTE PORTA CONSIGLIO",
      "L'UNIONE FA LA FORZA"
    ]
  },
  "cinema": {
    name: "Cinema e Serie TV",
    icon: "🎬",
    phrases: [
      "IL BUONO IL BRUTTO E IL CATTIVO",
      "LA VITA E BELLA",
      "IL PADRINO PARTE PRIMA",
      "RITORNO AL FUTURO",
      "VIAGGIO AL CENTRO DELLA TERRA",
      "UN SACCO BELLO",
      "NON CI RESTA CHE PIANGERE",
      "LA GRANDE BELLEZZA",
      "I SOLITI IGNOTI",
      "GUERRA E PACE",
      "AMICI MIEI ATTO PRIMO",
      "MATRIX RELOADED",
      "IL SIGNORE DEGLI ANELLI",
      "TRE UOMINI E UNA GAMBA"
    ]
  },
  "personaggi": {
    name: "Personaggi Celebri e Storia",
    icon: "👑",
    phrases: [
      "CRISTOFORO COLOMBO SCOPRE L'AMERICA",
      "LEONARDO DA VINCI DIPINGE LA GIOCONDA",
      "GIULIO CESARE VARCA IL RUBICONE",
      "DANTE ALIGHIERI SCRIVE LA COMMEDIA",
      "ALESSANDRO MANZONI E I PROMESSI SPOSI",
      "GALILEO GALILEI GUARDA LE STELLE",
      "GERRY SCOTTI CONDUCE LA RUOTA",
      "MIKE BONGIORNO DICE ALLEGRIA",
      "RAFFAELLA CARRA FA FESTA IN TV",
      "GIUSEPPE GARIBALDI SBARCA A MARSALA"
    ]
  },
  "musica": {
    name: "Musica e Canzoni Italiane",
    icon: "🎵",
    phrases: [
      "NEL BLU DIPINTO DI BLU",
      "ALBACHIARA AL CHIARO DI LUNA",
      "SI PUO DARE DI PIU",
      "UN'AVVENTURA DI LUCIO BATTISTI",
      "NOTTE PRIMA DEGLI ESAMI",
      "CARUSO SUL GOLFO DI SORRENTO",
      "AZZURRO IL POMERIGGIO E TROPPO AZZURRO",
      "CERCO UN CENTRO DI GRAVITA PERMANENTE",
      "GLI OSTACOLI DEL CUORE",
      "SULLA STRADA DI ROMA"
    ]
  },
  "geografia": {
    name: "Geografia e Meraviglie",
    icon: "🌍",
    phrases: [
      "ISOLE CAYMAN NEL MARE DEI CARAIBI",
      "VENEZIA E I SUOI CANALI INCANTATI",
      "LA FORESTA AMAZZONICA POLMONE VERDE",
      "IL COLOSSEO NEL CUORE DI ROMA",
      "FIRENZE CULLA DEL RINASCIMENTO",
      "LE DOLOMITI PATRIMONIO MONDIALE",
      "I FARAGLIONI DI CAPRI NEL BLU",
      "LA VALLE DEI TEMPLI AD AGRIGENTO",
      "CASCATE DEL NIAGARA MOZZAFIATO"
    ]
  },
  "curiosita": {
    name: "Curiosità e Vita Quotidiana",
    icon: "💡",
    phrases: [
      "UN CAFFE ESPRESSO AL BANCO DEL BAR",
      "PIZZA MARGHERITA CON MOZZARELLA FRESCA",
      "GELATO AL PISTACCHIO E CIOCCOLATO",
      "COLAZIONE CON CAPPUCCINO E CORNETTO",
      "DOMENICA ALLO STADIO CON GLI AMICI",
      "BAGNO DI MEZZANOTTE A FERRAGOSTO",
      "GIRARE LA RUOTA DELLA FORTUNA",
      "PARTITA A SCACCHI SOTTO L'OMBRELLONE"
    ]
  }
};

class RuotaPhraseManager {
  /**
   * Pulisce una stringa rimuovendo accenti speciali e standardizzandola in maiuscolo
   */
  static cleanString(str) {
    if (!str) return "";
    return str
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Rimuove accenti (È -> E, À -> A)
      .replace(/[’`]/g, "'")
      .trim();
  }

  /**
   * Adatta un testo alle 4 righe del tabellone [12, 14, 14, 12].
   * Supporta interruzioni manuali con la pipe '|' (es. "RIGA 1 | RIGA 2 | RIGA 3 | RIGA 4")
   * Oppure esegue un algoritmo di word-wrapping intelligente e centraggio.
   * 
   * @param {string} rawText 
   * @returns {{ success: boolean, rows: string[], centeredRows: string[], error?: string }}
   */
  static formatPhraseForBoard(rawText) {
    const cleaned = this.cleanString(rawText);
    if (!cleaned) {
      return { success: false, rows: ["", "", "", ""], centeredRows: ["", "", "", ""], error: "La frase è vuota" };
    }

    const capacities = RUOTA_ROW_CAPACITIES;

    // Se l'utente ha inserito le righe manualmente con la barra '|'
    if (cleaned.includes("|")) {
      const parts = cleaned.split("|").map(p => p.trim());
      if (parts.length > 4) {
        return { success: false, rows: [], centeredRows: [], error: "Il tabellone ha al massimo 4 righe!" };
      }
      const rows = ["", "", "", ""];
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].length > capacities[i]) {
          return {
            success: false,
            rows: [],
            centeredRows: [],
            error: `La riga ${i + 1} ("${parts[i]}") supera il limite di ${capacities[i]} caratteri!`
          };
        }
        rows[i] = parts[i];
      }
      return {
        success: true,
        rows,
        centeredRows: this.centerRows(rows, capacities)
      };
    }

    // Wrapping automatico delle parole
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);

    // Controllo parole più lunghe del massimo consentito in qualsiasi riga
    for (const w of words) {
      if (w.length > 14) {
        return {
          success: false,
          rows: [],
          centeredRows: [],
          error: `La parola "${w}" è troppo lunga per entrare in una riga (massimo 14 lettere)!`
        };
      }
    }

    // Strategia Greedy ottimizzata per bilanciare le 4 righe
    const fitted = this.fitWordsToRows(words, capacities);
    if (!fitted) {
      return {
        success: false,
        rows: [],
        centeredRows: [],
        error: "La frase è troppo lunga per le 4 righe del tabellone. Usa il separatore '|' per impostare i ritorni a capo."
      };
    }

    return {
      success: true,
      rows: fitted,
      centeredRows: this.centerRows(fitted, capacities)
    };
  }

  /**
   * Trova la migliore distribuzione delle parole nelle 4 righe
   */
  static fitWordsToRows(words, capacities) {
    const totalWords = words.length;

    function tryDistribute(wordIdx, rowIdx, currentRows) {
      if (wordIdx === totalWords) {
        return currentRows.slice();
      }
      if (rowIdx >= 4) {
        return null;
      }

      // Prova a mettere da 1 a quante più parole possibile nella riga corrente
      let line = "";
      for (let w = wordIdx; w < totalWords; w++) {
        const nextWord = words[w];
        const candidate = line ? line + " " + nextWord : nextWord;
        if (candidate.length <= capacities[rowIdx]) {
          line = candidate;
          currentRows[rowIdx] = line;
          const result = tryDistribute(w + 1, rowIdx + 1, currentRows);
          if (result) return result;
        } else {
          break;
        }
      }

      // Se non siamo riusciti ad arrivare alla fine con questa riga piena,
      // proviamo anche a lasciare la riga vuota se all'inizio o alla fine per centrare verticalmente
      if (line === "" && (rowIdx === 0 || rowIdx === 3)) {
        currentRows[rowIdx] = "";
        return tryDistribute(wordIdx, rowIdx + 1, currentRows);
      }

      return null;
    }

    // Tentativo 1: usa tutte e 4 le righe partendo da riga 0
    let result = tryDistribute(0, 0, ["", "", "", ""]);
    if (result) return result;

    // Tentativo 2: se frase breve, prova a partire dalla riga 1 per centrare verticalmente
    result = tryDistribute(0, 1, ["", "", "", ""]);
    if (result) return result;

    // Tentativo 3: greedy standard come fallback
    const greedyRows = ["", "", "", ""];
    let curRow = 0;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (curRow >= 4) return null;
      const testLine = greedyRows[curRow] ? greedyRows[curRow] + " " + w : w;
      if (testLine.length <= capacities[curRow]) {
        greedyRows[curRow] = testLine;
      } else {
        curRow++;
        if (curRow >= 4) return null;
        if (w.length > capacities[curRow]) return null;
        greedyRows[curRow] = w;
      }
    }
    return greedyRows;
  }

  /**
   * Centra orizzontalmente ogni stringa all'interno della capacità della riga aggiungendo spazi
   */
  static centerRows(rows, capacities) {
    return rows.map((r, i) => {
      const cap = capacities[i];
      const trimmed = r.trim();
      if (!trimmed) return " ".repeat(cap);
      const totalPadding = cap - trimmed.length;
      if (totalPadding <= 0) return trimmed.slice(0, cap);
      const padLeft = Math.floor(totalPadding / 2);
      const padRight = totalPadding - padLeft;
      return " ".repeat(padLeft) + trimmed + " ".repeat(padRight);
    });
  }

  /**
   * Restituisce una frase casuale da una categoria o da tutte
   */
  static getRandomPhrase(categoryKey = null) {
    let pool = [];
    if (categoryKey && RUOTA_CATEGORIES[categoryKey]) {
      pool = RUOTA_CATEGORIES[categoryKey].phrases.map(p => ({
        phrase: p,
        category: RUOTA_CATEGORIES[categoryKey].name
      }));
    } else {
      Object.keys(RUOTA_CATEGORIES).forEach(k => {
        RUOTA_CATEGORIES[k].phrases.forEach(p => {
          pool.push({ phrase: p, category: RUOTA_CATEGORIES[k].name });
        });
      });
    }
    if (pool.length === 0) return null;
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }
}

// Esporta globalmente e per moduli Node
if (typeof window !== "undefined") {
  window.RUOTA_ROW_CAPACITIES = RUOTA_ROW_CAPACITIES;
  window.RUOTA_CATEGORIES = RUOTA_CATEGORIES;
  window.RuotaPhraseManager = RuotaPhraseManager;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    RUOTA_ROW_CAPACITIES,
    RUOTA_CATEGORIES,
    RuotaPhraseManager
  };
}
