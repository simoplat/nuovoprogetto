import subprocess, os

test_html = '''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Lupus Responsive Layout</title>
</head>
<body>
  <div id="test-results">Testing...</div>
  <iframe id="app-frame" src="../games/lupus/index.html" style="width: 1200px; height: 800px;"></iframe>

  <script>
    const iframe = document.getElementById('app-frame');
    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        const results = [];

        // 1. Verify Desktop (1200px width)
        const container = doc.querySelector('.app-container');
        const containerStyle = win.getComputedStyle(container);
        const containerMaxWidth = parseFloat(containerStyle.maxWidth);
        
        if (containerMaxWidth < 1100) {
          throw new Error("Desktop container maxWidth expected >= 1100px, got " + containerStyle.maxWidth);
        }
        results.push("DESKTOP_CONTAINER_WIDTH_OK: " + containerMaxWidth + "px");

        // 2. Verify Setup Layout on Desktop
        const setupGrid = doc.querySelector('.lupus-setup-grid-layout');
        const setupGridStyle = win.getComputedStyle(setupGrid);
        if (setupGridStyle.display !== 'grid') {
          throw new Error("Expected setupGrid display: grid on desktop, got " + setupGridStyle.display);
        }
        results.push("DESKTOP_SETUP_GRID_OK: display is " + setupGridStyle.display);

        // 3. Verify Master View on Desktop
        win.App.switchView("view-lupus-master");
        win.LupusGame.initMasterDashboard();

        const masterGrid = doc.querySelector('.lupus-master-grid-layout');
        const masterGridStyle = win.getComputedStyle(masterGrid);
        if (masterGridStyle.display !== 'grid') {
          throw new Error("Expected masterGrid display: grid on desktop, got " + masterGridStyle.display);
        }
        results.push("DESKTOP_MASTER_GRID_OK: display is " + masterGridStyle.display);

        // 4. Verify Tarot Card on Desktop
        const tarotCard = doc.getElementById('lupus-card-box');
        const tarotStyle = win.getComputedStyle(tarotCard);
        if (tarotStyle.flexDirection !== 'row') {
          throw new Error("Expected tarot card flex-direction: row on desktop, got " + tarotStyle.flexDirection);
        }
        results.push("DESKTOP_TAROT_HORIZONTAL_OK: flex-direction is " + tarotStyle.flexDirection);

        document.getElementById('test-results').innerText = "ALL_RESPONSIVE_DESKTOP_TESTS_PASSED: " + results.join(" | ");
      } catch (err) {
        document.getElementById('test-results').innerText = "ERROR: " + err.message;
      }
    };
  </script>
</body>
</html>
'''

os.makedirs('scratch', exist_ok=True)
html_path = os.path.abspath('scratch/test_runner_responsive_desktop.html')
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(test_html)

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

res = subprocess.run([
    edge_path,
    '--headless',
    '--disable-gpu',
    '--window-size=1280,900',
    '--dump-dom',
    '--allow-file-access-from-files',
    f'file:///{html_path}'
], capture_output=True, text=True, timeout=15)

for line in res.stdout.splitlines():
    if 'ALL_RESPONSIVE_DESKTOP_TESTS_PASSED' in line or 'ERROR' in line:
        print(line)
