import subprocess, os

test_html = '''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Lupus Mobile Portrait Layout</title>
</head>
<body>
  <div id="test-results">Testing...</div>
  <iframe id="app-frame" src="../games/lupus/index.html" style="width: 390px; height: 844px;"></iframe>

  <script>
    const iframe = document.getElementById('app-frame');
    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        const results = [];

        // 1. Verify Mobile Container (max-width 520px)
        const container = doc.querySelector('.app-container');
        const containerStyle = win.getComputedStyle(container);
        const containerMaxWidth = parseFloat(containerStyle.maxWidth);
        
        if (containerMaxWidth > 520) {
          throw new Error("Mobile container maxWidth expected <= 520px, got " + containerStyle.maxWidth);
        }
        results.push("MOBILE_CONTAINER_WIDTH_OK: " + containerMaxWidth + "px");

        // 2. Verify Setup Layout on Mobile (flex column)
        const setupGrid = doc.querySelector('.lupus-setup-grid-layout');
        const setupGridStyle = win.getComputedStyle(setupGrid);
        if (setupGridStyle.display !== 'flex' || setupGridStyle.flexDirection !== 'column') {
          throw new Error("Expected setupGrid display: flex; flex-direction: column on mobile, got " + setupGridStyle.display + ", " + setupGridStyle.flexDirection);
        }
        results.push("MOBILE_SETUP_STACK_OK: display is " + setupGridStyle.display);

        // 3. Verify Master View on Mobile (flex column)
        win.App.switchView("view-lupus-master");
        win.LupusGame.initMasterDashboard();

        const masterGrid = doc.querySelector('.lupus-master-grid-layout');
        const masterGridStyle = win.getComputedStyle(masterGrid);
        if (masterGridStyle.display !== 'flex' || masterGridStyle.flexDirection !== 'column') {
          throw new Error("Expected masterGrid display: flex; flex-direction: column on mobile, got " + masterGridStyle.display + ", " + masterGridStyle.flexDirection);
        }
        results.push("MOBILE_MASTER_STACK_OK: display is " + masterGridStyle.display);

        // 4. Verify Tarot Card on Mobile (column)
        const tarotCard = doc.getElementById('lupus-card-box');
        const tarotStyle = win.getComputedStyle(tarotCard);
        if (tarotStyle.flexDirection !== 'column') {
          throw new Error("Expected tarot card flex-direction: column on mobile, got " + tarotStyle.flexDirection);
        }
        results.push("MOBILE_TAROT_VERTICAL_OK: flex-direction is " + tarotStyle.flexDirection);

        document.getElementById('test-results').innerText = "ALL_MOBILE_PORTRAIT_TESTS_PASSED: " + results.join(" | ");
      } catch (err) {
        document.getElementById('test-results').innerText = "ERROR: " + err.message;
      }
    };
  </script>
</body>
</html>
'''

os.makedirs('scratch', exist_ok=True)
html_path = os.path.abspath('scratch/test_runner_responsive_mobile.html')
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(test_html)

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

res = subprocess.run([
    edge_path,
    '--headless',
    '--disable-gpu',
    '--window-size=420,900',
    '--dump-dom',
    '--allow-file-access-from-files',
    f'file:///{html_path}'
], capture_output=True, text=True, timeout=15)

for line in res.stdout.splitlines():
    if 'ALL_MOBILE_PORTRAIT_TESTS_PASSED' in line or 'ERROR' in line:
        print(line)
