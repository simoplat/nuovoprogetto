import subprocess, os

test_html_content = '''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Lupus Standalone Page</title>
</head>
<body>
  <div id="test-output">Running...</div>
  <iframe id="app-frame" src="../games/lupus/index.html" style="width: 500px; height: 700px;"></iframe>

  <script>
    const iframe = document.getElementById('app-frame');
    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        
        if (!win.App) throw new Error("App not initialized on window");
        if (!win.LupusGame) throw new Error("LupusGame not initialized on window");
        
        const setupView = doc.getElementById("view-lupus-setup");
        if (!setupView || setupView.style.display === "none") throw new Error("view-lupus-setup not visible initially");
        
        // Start game
        const startBtn = doc.getElementById("lupus-btn-start-game");
        if (!startBtn) throw new Error("startBtn not found");
        startBtn.click();
        
        const passView = doc.getElementById("view-lupus-pass");
        if (!passView || passView.style.display === "none") throw new Error("view-lupus-pass not visible after start");
        
        // Verify hold reveal btn
        const holdBtn = doc.getElementById("lupus-hold-reveal-btn");
        if (!holdBtn) throw new Error("lupus-hold-reveal-btn not found");
        
        // Switch to master view
        win.App.switchView("view-lupus-master");
        win.LupusGame.initMasterDashboard();
        
        const masterView = doc.getElementById("view-lupus-master");
        if (!masterView || masterView.style.display === "none") throw new Error("view-lupus-master not visible");
        
        const rosterGrid = doc.getElementById("lupus-master-roster");
        if (!rosterGrid || rosterGrid.children.length === 0) throw new Error("rosterGrid is empty");
        
        document.getElementById('test-output').innerText = "STANDALONE_LUPUS_SUCCESS: All views, initialization and interactions work perfectly!";
      } catch (err) {
        document.getElementById('test-output').innerText = "ERROR: " + err.message;
      }
    };
  </script>
</body>
</html>
'''

os.makedirs('scratch', exist_ok=True)
html_path = os.path.abspath('scratch/test_runner_standalone_lupus.html')
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(test_html_content)

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

res = subprocess.run([
    edge_path,
    '--headless',
    '--disable-gpu',
    '--dump-dom',
    '--allow-file-access-from-files',
    f'file:///{html_path}'
], capture_output=True, text=True, timeout=15)

for line in res.stdout.splitlines():
    if 'STANDALONE_LUPUS_SUCCESS' in line or 'ERROR' in line:
        print(line)
