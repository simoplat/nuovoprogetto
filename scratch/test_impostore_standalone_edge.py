import subprocess, os

test_html_content = '''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Impostore Standalone Page</title>
</head>
<body>
  <div id="test-output">Running...</div>
  <iframe id="app-frame" src="../games/impostore/index.html" style="width: 500px; height: 700px;"></iframe>

  <script>
    const iframe = document.getElementById('app-frame');
    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        
        if (!win.LocalGame) throw new Error("LocalGame not initialized on window");
        if (!win.P2PGame) throw new Error("P2PGame not initialized on window");
        
        const modeView = doc.getElementById("view-mode-select");
        if (!modeView || modeView.style.display === "none") throw new Error("view-mode-select not visible initially");
        
        // Select Passa il Telefono
        const localModeBtn = doc.getElementById("select-mode-local");
        if (!localModeBtn) throw new Error("select-mode-local btn not found");
        localModeBtn.click();
        
        const setupView = doc.getElementById("view-local-setup");
        if (!setupView || setupView.style.display === "none") throw new Error("view-local-setup not visible after selecting mode");
        
        // Start game
        const startBtn = doc.getElementById("local-start-game-btn");
        if (!startBtn) throw new Error("local-start-game-btn not found");
        startBtn.click();
        
        const passView = doc.getElementById("view-pass-reveal");
        if (!passView || passView.style.display === "none") throw new Error("view-pass-reveal not visible after start");
        
        document.getElementById('test-output').innerText = "STANDALONE_IMPOSTORE_SUCCESS: Local and standalone initialization work perfectly!";
      } catch (err) {
        document.getElementById('test-output').innerText = "ERROR: " + err.message;
      }
    };
  </script>
</body>
</html>
'''

os.makedirs('scratch', exist_ok=True)
html_path = os.path.abspath('scratch/test_runner_standalone_impostore.html')
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
    if 'STANDALONE_IMPOSTORE_SUCCESS' in line or 'ERROR' in line:
        print(line)
