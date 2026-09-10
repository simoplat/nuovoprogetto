import subprocess, time, os

# Create a test HTML file that runs the game logic and logs any exception
test_html_content = '''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Lupus Condanna</title>
</head>
<body>
  <div id="test-output">Running...</div>
  <iframe id="app-frame" src="../index.html" style="width: 800px; height: 600px;"></iframe>

  <script>
    const iframe = document.getElementById('app-frame');
    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;

        // 1. Check window.App and lupusGame
        console.log("App loaded:", !!win.App);
        const lupus = win.App.lupusGame;
        console.log("Lupus controller:", !!lupus);

        // 2. Start game
        lupus.startGame();
        console.log("Assignments:", lupus.assignments.map(a => a.name + ': ' + a.roleKey));

        // 3. Skip to Master Guide
        win.App.switchView("view-lupus-master");
        lupus.renderMasterRoster();
        
        // 4. Move to Voting step (last step)
        const steps = lupus.getRoundSteps();
        const votingIdx = steps.findIndex(s => s.type === "voting");
        lupus.masterStepIndex = votingIdx;
        lupus.renderMasterPhaseGuide();

        // 5. Select first alive player
        const alivePlayers = lupus.assignments.filter(p => p.isAlive);
        const target = alivePlayers[0];
        console.log("Selecting player for vote:", target.name, target.id);
        lupus.selectedVotePlayerId = target.id;
        lupus.renderVotingGrid();

        // 6. Check confirm button
        const confirmBtn = doc.getElementById("lupus-confirm-vote-btn");
        console.log("Confirm button disabled?", confirmBtn.disabled);
        console.log("Confirm button text:", confirmBtn.innerText);

        // 7. Click confirm button
        console.log("Clicking confirm button...");
        confirmBtn.click();
        console.log("Click completed without uncaught exception!");

        // 8. Check state after click
        const resultBox = doc.getElementById("lupus-vote-result-box");
        const victoryBanner = doc.getElementById("lupus-victory-banner");
        console.log("Target isAlive after vote:", target.isAlive);
        console.log("Result box display:", resultBox.style.display);
        console.log("Victory banner display:", victoryBanner.style.display);
        
        document.getElementById('test-output').innerText = "SUCCESS: target.isAlive=" + target.isAlive + " resultBox=" + resultBox.style.display + " victoryBanner=" + victoryBanner.style.display;
      } catch (err) {
        console.error("TEST FAILED WITH ERROR:", err);
        document.getElementById('test-output').innerText = "ERROR: " + err.message + "\\n" + err.stack;
      }
    };
  </script>
</body>
</html>
'''

os.makedirs('scratch', exist_ok=True)
with open('scratch/test_runner.html', 'w', encoding='utf-8') as f:
    f.write(test_html_content)

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
html_path = os.path.abspath('scratch/test_runner.html')

res = subprocess.run([
    edge_path,
    '--headless',
    '--disable-gpu',
    '--dump-dom',
    '--allow-file-access-from-files',
    f'file:///{html_path}'
], capture_output=True, text=True, timeout=15)

print("STDOUT:")
for line in res.stdout.splitlines():
    if 'test-output' in line or 'SUCCESS' in line or 'ERROR' in line:
        print(" ", line)
