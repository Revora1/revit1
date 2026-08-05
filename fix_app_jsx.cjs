const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetRender = `      {content}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <div id="modal-root" className="absolute inset-0 pointer-events-none z-[100] [&>*]:pointer-events-auto" />`;

const replacementRender = `      {content}
      <AnimatePresence>
        {showGiveaways && <GiveawaysView onBack={() => setShowGiveaways(false)} />}
      </AnimatePresence>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <div id="modal-root" className="absolute inset-0 pointer-events-none z-[100] [&>*]:pointer-events-auto" />`;

if (code.includes(targetRender)) {
  code = code.replace(targetRender, replacementRender);
  fs.writeFileSync('src/App.tsx', code);
  console.log("JSX replaced successfully");
} else {
  console.log("Could not find target render block");
}
