import http.server
import socketserver
import threading
import subprocess
import time
import os

PORT = 8765

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

httpd = socketserver.TCPServer(("", PORT), Handler)
t = threading.Thread(target=httpd.serve_forever)
t.daemon = True
t.start()

print(f"Local server started on port {PORT}")

# Create a self-testing HTML page that runs the entire lupus gameplay flow
with open('scratch/lupus_auto_flow.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Test Flow</title></head>
<body>
  <iframe id="game-frame" src="http://localhost:8765/index.html" style="width:800px; height:600px;"></iframe>
  <div id="results">Running...</div>
  <script>
    const iframe = document.getElementById('game-frame');
    iframe.onload = () => {
      setTimeout(() => {
        try {
          const win = iframe.contentWindow;
          const doc = iframe.contentDocument;
          const lupus = win.App.lupusGame;

          // 1. Start game
          lupus.startGame();

          // 2. Switch to master view
          win.App.switchView("view-lupus-master");
          lupus.renderMasterRoster();

          // 3. Move to stake vote
          const steps = lupus.getRoundSteps();
          const voteIdx = steps.findIndex(s => s.type === "voting");
          lupus.masterStepIndex = voteIdx;
          lupus.renderMasterPhaseGuide();

          // 4. Select a living player who is NOT wolf
          const villager = lupus.assignments.find(p => p.isAlive && p.roleKey !== "lupo");
          lupus.selectedVotePlayerId = villager.id;
          lupus.renderVotingGrid();

          // 5. Confirm vote
          lupus.confirmRogoVote();
          if (villager.isAlive) throw new Error("Villager should be dead!");

          // 6. Test startNextNight
          lupus.startNextNight();
          if (lupus.nightCount !== 2) throw new Error("nightCount should be 2!");
          if (lupus.masterStepIndex !== 0) throw new Error("masterStepIndex should be 0!");

          // 7. Test wolf elimination (game over)
          const wolf = lupus.assignments.find(p => p.isAlive && p.roleKey === "lupo");
          lupus.selectedVotePlayerId = wolf.id;
          lupus.confirmRogoVote();
          if (wolf.isAlive) throw new Error("Wolf should be dead!");

          const gameoverWidget = doc.getElementById("lupus-step-gameover-widget");
          if (gameoverWidget.style.display !== "block") throw new Error("Game over widget should be displayed block!");

          document.getElementById('results').innerText = "ALL_FLOWS_COMPLETED_SUCCESSFULLY";
        } catch (e) {
          document.getElementById('results').innerText = "FLOW_ERROR: " + e.message;
        }
      }, 500);
    };
  </script>
</body>
</html>
''')

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
res = subprocess.run([
    edge_path,
    '--headless',
    '--disable-gpu',
    '--dump-dom',
    f'http://localhost:{PORT}/scratch/lupus_auto_flow.html'
], capture_output=True, text=True, timeout=10)

print("Browser Output:")
for line in res.stdout.splitlines():
    if 'results' in line or 'ALL_FLOWS' in line or 'FLOW_ERROR' in line:
        print(" ", line)

httpd.shutdown()
