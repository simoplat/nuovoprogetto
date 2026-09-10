/**
 * GameRegistry - Catalogo Modulare dei Giochi per il Party Game Hub
 * 
 * Permette di registrare nuovi giochi in modo modulare e renderli
 * automaticamente disponibili nella dashboard principale dell'Hub.
 */

class GameRegistry {
  constructor() {
    this.games = new Map();
  }

  /**
   * Registra un nuovo gioco nel catalogo
   * @param {Object} gameDef - Definizione del gioco
   */
  register(gameDef) {
    if (!gameDef || !gameDef.id) {
      console.warn("[GameRegistry] Definizione gioco non valida:", gameDef);
      return;
    }
    this.games.set(gameDef.id, {
      id: gameDef.id,
      title: gameDef.title || "Gioco",
      icon: gameDef.icon || "🎮",
      tagline: gameDef.tagline || "",
      badge: gameDef.badge || "Party Game",
      status: gameDef.status || "active", // "active" | "coming_soon"
      modes: gameDef.modes || ["local", "p2p"],
      modeLabels: gameDef.modeLabels || {
        local: "Passa il Telefono 📱",
        p2p: "Stanza Online P2P ⚡"
      },
      rulesSummary: gameDef.rulesSummary || "",
      colorTheme: gameDef.colorTheme || "cyan"
    });
    console.log(`[GameRegistry] Registrato gioco: ${gameDef.title} (${gameDef.id}) - Status: ${gameDef.status}`);
  }

  /**
   * Restituisce tutti i giochi registrati
   * @returns {Array<Object>}
   */
  getAll() {
    return Array.from(this.games.values());
  }

  /**
   * Recupera un gioco specifico per ID
   * @param {string} id
   * @returns {Object|null}
   */
  get(id) {
    return this.games.get(id) || null;
  }
}

// Istanza globale del registry
const GlobalGameRegistry = new GameRegistry();

// 1. Registra L'Impostore (Attivo al 100%)
GlobalGameRegistry.register({
  id: "impostore",
  title: "L'Impostore",
  icon: "🕵️",
  tagline: "Bluff, deduzione e inganno tra amici!",
  badge: "3-16 Giocatori",
  status: "active",
  modes: ["local", "p2p"],
  modeLabels: {
    local: "Passa il Telefono 📱",
    p2p: "Stanza Online P2P ⚡"
  },
  rulesSummary: "Tutti conoscono la parola segreta tranne l'Impostore. Ognuno dice una parola attinente per far capire che sa, mentre l'impostore deve bluffare per mimetizzarsi!",
  colorTheme: "purple"
});

// 2. Registra Lupus in Fabula (Attivo al 100%, Solo Locale)
GlobalGameRegistry.register({
  id: "lupus",
  title: "Lupus in Fabula",
  icon: "🐺",
  tagline: "Lupi, villaggio, inganni e misteri al calar della notte!",
  badge: "4-20 Giocatori",
  status: "active",
  modes: ["local"],
  modeLabels: {
    local: "Passa il Telefono 📱"
  },
  rulesSummary: "I Lupi Mannari sbranano gli abitanti ogni notte, mentre il Villaggio (Veggente, Strega, Cupido, Donna e Contadini) cerca di stanarli e mandarli al rogo!",
  colorTheme: "crimson"
});

// 3. Slot per Gioco Futuro: Chi Sono?
GlobalGameRegistry.register({
  id: "chisono",
  title: "Chi Sono?",
  icon: "🎭",
  tagline: "Indovina il personaggio misterioso!",
  badge: "2-12 Giocatori",
  status: "coming_soon",
  modes: ["local", "p2p"],
  modeLabels: {
    local: "Schermo sulla Fronte 📱",
    p2p: "Stanza Online P2P ⚡"
  },
  rulesSummary: "Ognuno riceve un personaggio misterioso visibile a tutti tranne che a lui. Fai domande a risposta Sì/No al gruppo per indovinare la tua identità prima degli altri!",
  colorTheme: "amber"
});

// 3. Slot per Gioco Futuro: Quiz Party
GlobalGameRegistry.register({
  id: "quizparty",
  title: "Quiz Party",
  icon: "🧠",
  tagline: "Sfida a tempo su cultura pop e curiosità!",
  badge: "2-20 Giocatori",
  status: "coming_soon",
  modes: ["p2p"],
  modeLabels: {
    p2p: "Stanza Online P2P ⚡"
  },
  rulesSummary: "Rispondi più velocemente possibile alle domande a scelta multipla dal tuo smartphone e scala la classifica del gruppo!",
  colorTheme: "cyan"
});

// Esporta globalmente e per moduli node
if (typeof window !== "undefined") {
  window.GameRegistry = GlobalGameRegistry;
  window.GlobalGameRegistry = GlobalGameRegistry;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = GlobalGameRegistry;
}
