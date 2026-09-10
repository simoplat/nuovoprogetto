import subprocess, time, os

test_html_content = '''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Cupido 2 Lovers Requirement</title>
</head>
<body>
  <div id="test-output">Running...</div>
  <iframe id="app-frame" src="../index.html" style="width: 1000px; height: 800px;"></iframe>

  <script>
    const iframe = document.getElementById('app-frame');
    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        const lupus = win.App.lupusGame;

        if (!lupus) throw new Error("lupusGame controller not found");

        lupus.enabledRoles.cupido = true;
        lupus.enabledRoles.veggente = true;
        lupus.enabledRoles.donna = false;
        lupus.enabledRoles.strega = false;
        lupus.enabledRoles.guardia = false;
        lupus.enabledRoles.infiltrato = false;
        lupus.enabledRoles.lupo_bianco = false;
        lupus.enabledRoles.lupo_stregone = false;
        lupus.enabledRoles.cane_nero = false;
        lupus.enabledRoles.giullare = false;
        lupus.enabledRoles.beccamorto = false;
        lupus.enabledRoles.idiota = false;

        lupus.players = ["CupidoPlayer", "LoverA", "LoverB", "Wolf1", "Villager1"];
        lupus.wolvesCount = 1;
        lupus.startGame();

        const roles = ["cupido", "veggente", "contadino", "lupo", "contadino"];
        lupus.assignments.forEach((p, idx) => {
          p.roleKey = roles[idx];
          p.role = win.LUPUS_ROLES[roles[idx]];
          p.isAlive = true;
        });

        // Initialize master dashboard
        lupus.initMasterDashboard();
        win.App.switchView("view-lupus-master");

        // Check current step is night 1
        const steps = lupus.getRoundSteps();
        const cupidoStepIndex = steps.findIndex(s => s.stepSubtype === "cupido");
        if (cupidoStepIndex === -1) throw new Error("Cupido step not found in round 1 steps");

        // Navigate to Cupido step
        lupus.masterStepIndex = cupidoStepIndex;
        lupus.renderMasterPhaseGuide();

        const nextBtn = doc.getElementById("lupus-master-next-step");
        if (!nextBtn) throw new Error("Next button #lupus-master-next-step not found");

        // 1. Initially 0 lovers selected: nextBtn must be disabled
        if (!nextBtn.disabled) throw new Error("Next button should be disabled when 0 lovers are selected");
        const initStep = lupus.masterStepIndex;
        lupus.masterNextStep();
        if (lupus.masterStepIndex !== initStep) throw new Error("masterNextStep() should not advance when < 2 lovers selected");

        // 2. Select 1 lover by clicking a card
        const cards = doc.querySelectorAll(".lupus-action-card");
        if (cards.length < 2) throw new Error("Action cards not rendered properly in Cupido widget, found " + cards.length);

        cards[0].click(); // select 1st
        if (!nextBtn.disabled) throw new Error("Next button should be disabled when only 1 lover is selected");
        lupus.masterNextStep();
        if (lupus.masterStepIndex !== initStep) throw new Error("masterNextStep() should not advance with 1 lover");

        // 3. Select 2nd lover
        cards[1].click(); // select 2nd
        if (nextBtn.disabled) throw new Error("Next button should be ENABLED when exactly 2 lovers are selected");

        // 4. Deselect 1st lover by clicking it again
        cards[0].click(); // deselect
        if (!nextBtn.disabled) throw new Error("Next button should be DISABLED again after deselecting a lover");

        // 5. Select 1st lover again -> 2 lovers
        cards[0].click();
        if (nextBtn.disabled) throw new Error("Next button should be ENABLED when 2 lovers are selected again");

        // 6. Advance with nextBtn
        lupus.masterNextStep();
        if (lupus.masterStepIndex !== initStep + 1) {
          throw new Error("masterNextStep() should advance to next step (" + (initStep + 1) + "), but is " + lupus.masterStepIndex);
        }

        // In the next step, nextBtn is governed by that step's required action
        const nextStep = steps[lupus.masterStepIndex];
        if (!nextStep) throw new Error("Next step not found");
        const nextActionCards = doc.querySelectorAll(".lupus-action-card");
        if (nextActionCards.length > 0) {
          nextActionCards[0].click();
          if (nextBtn.disabled) throw new Error("Next button should be enabled after making a selection in the next step");
        }

        document.getElementById('test-output').innerText = "ALL_TESTS_SUCCESS: Cupido lover selection validation passed completely!";
      } catch (err) {
        document.getElementById('test-output').innerText = "ERROR: " + err.message + "\\n" + err.stack;
      }
    };
  </script>
</body>
</html>
'''

os.makedirs('scratch', exist_ok=True)
html_path = os.path.abspath('scratch/test_runner_cupido.html')
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
    if 'ALL_TESTS_SUCCESS' in line or 'ERROR' in line:
        print(line)
