import os

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract from view-mode-select to right before view-lupus-setup
start_marker = '<section id="view-mode-select"'
end_marker = '<section id="view-lupus-setup"'

start_pos = content.find(start_marker)
end_pos = content.find(end_marker)

# backtrack to the comment line
comment_marker = '<!-- =========================================================================\n         VISTA 1: SELEZIONE MODALITÀ'
comment_pos = content.rfind('<!-- ===', 0, start_pos)

impostore_views_html = content[comment_pos:end_pos].strip()

# Now build games/impostore/index.html
impostore_html = f'''<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>L'Impostore 🕵️ - Party Game Italiano</title>
  <meta name="description" content="Gioco dell'impostore moderno per mobile e desktop in italiano. Modalità passa il telefono e multiplayer in rete locale Wi-Fi con QR Code.">
  <meta name="theme-color" content="#090d16">

  <!-- Google Fonts: Outfit & Plus Jakarta Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- CSS Design System -->
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <div class="app-container">
    <!-- Header di Navigazione Superiore -->
    <header class="app-header">
      <a href="../../index.html" class="brand" id="brand-btn" title="Torna all'Hub principale">
        <span class="brand-icon" id="brand-icon">🕵️</span>
        <div>
          <h1 class="brand-title" id="brand-title">L'IMPOSTORE</h1>
          <div class="brand-subtitle" id="brand-subtitle">PARTY GAME</div>
        </div>
      </a>
      <div class="header-controls">
        <button type="button" class="icon-btn" id="btn-rules" title="Regole del Gioco">❓</button>
        <button type="button" class="icon-btn" id="btn-audio-toggle" title="Attiva/Disattiva Audio">🔊</button>
        <a href="../../index.html" class="icon-btn" title="Torna all'Hub Giochi">🎮</a>
      </div>
    </header>

    <!-- Banner Notifica Riconnessione Dinamica P2P -->
    <div id="p2p-reconnect-banner" class="reconnect-banner" style="display: none;">
      <span class="reconnect-icon" id="p2p-reconnect-icon">🔄</span>
      <span id="p2p-reconnect-text">Connessione persa. Riconnessione in corso...</span>
    </div>

    <!-- Viste Modulari de L'Impostore -->
    {impostore_views_html}

  </div>

  <!-- =========================================================================
       MODALE REGOLE DEL GIOCO
       ========================================================================= -->
  <div class="modal-backdrop" id="rules-modal">
    <div class="modal-content">
      <button type="button" class="modal-close-btn" id="btn-close-rules" aria-label="Chiudi regole">✖</button>
      <h2 style="margin-bottom: 16px; color: var(--accent-cyan);">📖 Regole del Gioco</h2>

      <div class="rules-section">
        <h3>🎯 Obiettivo</h3>
        <p>
          I <strong>Cittadini Innocenti</strong> devono individuare ed eliminare l'<strong>Impostore</strong>.
          L'<strong>Impostore</strong> deve confondersi con gli altri, non farsi scoprire e cercare di indovinare la parola segreta!
        </p>
      </div>

      <div class="rules-section">
        <h3>🤫 Come funziona la Parola Segreta</h3>
        <p>
          Tutti i Cittadini vedono la stessa parola segreta (es. <em>Pizza</em>) e la categoria (es. <em>Cibo</em>).
          L'Impostore <strong>non vede la parola</strong>, ma sa di essere l'impostore!
        </p>
      </div>

      <div class="rules-section">
        <h3>🗣️ Giro degli Indizi</h3>
        <p>
          A turno, a partire dal giocatore indicato dallo schermo, ognuno dice <strong>una sola parola o un brevissimo indizio</strong> collegato alla parola segreta.
          <br>• Se sei innocente: non essere troppo ovvio (altrimenti l'impostore capirà subito la parola), ma neanche troppo vago (altrimenti gli altri dubiteranno di te).
          <br>• Se sei l'impostore: bluffa ascoltando gli indizi degli altri!
        </p>
      </div>

      <div class="rules-section">
        <h3>🗳️ Discussione e Votazione</h3>
        <p>
          Al termine del giro o del timer, il gruppo si confronta su chi è sembrato più sospetto e si vota a maggioranza chi eliminare.
          Se l'eliminato è l'impostore vincono i cittadini! Se viene eliminato un innocente, vince l'impostore!
        </p>
      </div>
    </div>
  </div>

  <!-- Scripts JavaScript -->
  <script src="js/words.js"></script>
  <script src="../../js/audio.js"></script>
  <script src="../../js/qrcode.min.js"></script>
  <script src="../../js/peerjs.min.js"></script>
  <script>
    if (!window.Peer) {{
      document.write('<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"><\\/script>');
    }}
  </script>
  <script src="../../js/net/p2p_room.js"></script>
  <script src="js/local_game.js"></script>
  <script src="js/p2p_game.js"></script>

  <!-- Controller Standalone per L'Impostore -->
  <script>
    class StandaloneImpostoreApp {{
      constructor() {{
        this.currentView = "view-mode-select";
        this.localGame = new LocalGameController();
        this.p2pGame = new P2PGameController();

        window.LocalGame = this.localGame;
        window.P2PGame = this.p2pGame;

        this.bindEvents();
        this.updateAudioButtonState();

        window.addEventListener("wordsLoaded", () => {{
          if (this.localGame && typeof this.localGame.renderCategoryOptions === "function") {{
            this.localGame.renderCategoryOptions();
          }}
          if (this.p2pGame && typeof this.p2pGame.renderCategoryOptions === "function") {{
            this.p2pGame.renderCategoryOptions();
          }}
        }});

        try {{
          const params = new URLSearchParams(window.location.search);
          const roomCode = params.get("room");
          if (roomCode) {{
            this.p2pGame.initView();
          }} else {{
            this.switchView("view-mode-select");
          }}
        }} catch (e) {{
          this.switchView("view-mode-select");
        }}
      }}

      switchView(viewId) {{
        const views = document.querySelectorAll(".app-view");
        views.forEach(v => {{
          v.style.display = "none";
        }});

        const target = document.getElementById(viewId);
        if (target) {{
          target.style.display = "block";
          this.currentView = viewId;
          window.scrollTo({{ top: 0, behavior: "smooth" }});
        }}
      }}

      bindEvents() {{
        // Tasto Regole Generali
        const rulesBtn = document.getElementById("btn-rules");
        const rulesModal = document.getElementById("rules-modal");
        const closeRulesBtn = document.getElementById("btn-close-rules");
        if (rulesBtn && rulesModal) {{
          rulesBtn.addEventListener("click", () => {{
            Sound.playClick();
            rulesModal.classList.add("open");
          }});
        }}
        if (closeRulesBtn && rulesModal) {{
          closeRulesBtn.addEventListener("click", () => {{
            Sound.playClick();
            rulesModal.classList.remove("open");
          }});
        }}
        if (rulesModal) {{
          rulesModal.addEventListener("click", (e) => {{
            if (e.target === rulesModal) rulesModal.classList.remove("open");
          }});
        }}

        // Tasto Audio Toggle
        const audioBtn = document.getElementById("btn-audio-toggle");
        if (audioBtn) {{
          audioBtn.addEventListener("click", () => {{
            Sound.toggle();
            this.updateAudioButtonState();
          }});
        }}

        // Selezione Modalità: Passa il Telefono
        const selectLocalBtn = document.getElementById("select-mode-local");
        if (selectLocalBtn) {{
          selectLocalBtn.addEventListener("click", () => {{
            Sound.playClick();
            this.switchView("view-local-setup");
            this.localGame.renderSetupView();
          }});
        }}

        // Selezione Modalità: Stanza Online P2P
        const selectP2PBtn = document.getElementById("select-mode-p2p");
        if (selectP2PBtn) {{
          selectP2PBtn.addEventListener("click", () => {{
            this.p2pGame.initView();
          }});
        }}

        // Tasti torna al menu delle modalità
        document.querySelectorAll(".btn-back-to-menu").forEach(btn => {{
          btn.addEventListener("click", () => {{
            Sound.playClick();
            if (this.localGame && this.localGame.timerInterval) {{
              clearInterval(this.localGame.timerInterval);
            }}
            this.switchView("view-mode-select");
          }});
        }});

        // Tasto torna all'Hub
        const backToHubBtn = document.getElementById("btn-back-to-hub");
        if (backToHubBtn) {{
          backToHubBtn.addEventListener("click", () => {{
            window.location.href = "../../index.html";
          }});
        }}
      }}

      updateAudioButtonState() {{
        const audioBtn = document.getElementById("btn-audio-toggle");
        if (audioBtn) {{
          if (Sound.enabled) {{
            audioBtn.innerHTML = "🔊";
            audioBtn.classList.add("active");
            audioBtn.title = "Audio Attivo";
          }} else {{
            audioBtn.innerHTML = "🔇";
            audioBtn.classList.remove("active");
            audioBtn.title = "Audio Disattivato";
          }}
        }}
      }}
    }}

    document.addEventListener("DOMContentLoaded", () => {{
      window.App = new StandaloneImpostoreApp();
    }});
  </script>
</body>
</html>
'''

with open('games/impostore/index.html', 'w', encoding='utf-8') as f:
    f.write(impostore_html)

print("games/impostore/index.html successfully created! Size:", len(impostore_html))
