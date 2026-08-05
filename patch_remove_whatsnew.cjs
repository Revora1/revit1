const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importTarget = `import { WhatsNewModal } from './components/WhatsNewModal';\n`;
code = code.replace(importTarget, '');

const stateTarget = `  const [showWhatsNew, setShowWhatsNew] = useState(false);

  React.useEffect(() => {
    const seenVersion = localStorage.getItem('revitup_whatsnew_version');
    const currentVersion = '1.1.75';
    if (seenVersion !== currentVersion) {
      setShowWhatsNew(true);
      localStorage.setItem('revitup_whatsnew_version', currentVersion);
    }
  }, []);\n`;
code = code.replace(stateTarget, '');

const renderTarget = `\n        {showWhatsNew && <WhatsNewModal onClose={() => setShowWhatsNew(false)} />}`;
code = code.replace(renderTarget, '');

fs.writeFileSync('src/App.tsx', code);
