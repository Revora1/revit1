const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetImport = `import { SettingsModal } from './components/SettingsModal';`;
const replacementImport = `import { SettingsModal } from './components/SettingsModal';
import { WhatsNewModal } from './components/WhatsNewModal';`;
if (code.includes(targetImport)) {
  code = code.replace(targetImport, replacementImport);
}

const targetState = `  const [showSettings, setShowSettings] = useState(false);`;
const replacementState = `  const [showSettings, setShowSettings] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    const seenVersion = localStorage.getItem('revitup_whatsnew_version');
    const currentVersion = '1.1.75';
    if (seenVersion !== currentVersion) {
      setShowWhatsNew(true);
      localStorage.setItem('revitup_whatsnew_version', currentVersion);
    }
  }, []);`;

if (code.includes(targetState)) {
  code = code.replace(targetState, replacementState);
}

const targetRender = `      <AnimatePresence>
        {showGiveaways && <GiveawaysView onBack={() => setShowGiveaways(false)} />}
      </AnimatePresence>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}`;
const replacementRender = `      <AnimatePresence>
        {showGiveaways && <GiveawaysView onBack={() => setShowGiveaways(false)} />}
        {showWhatsNew && <WhatsNewModal onClose={() => setShowWhatsNew(false)} />}
      </AnimatePresence>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}`;

if (code.includes(targetRender)) {
  code = code.replace(targetRender, replacementRender);
}

fs.writeFileSync('src/App.tsx', code);
