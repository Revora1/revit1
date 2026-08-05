const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetImport = `import { SettingsModal } from './components/SettingsModal';`;
const replacementImport = `import { SettingsModal } from './components/SettingsModal';
import { AnimatePresence } from 'motion/react';`;
code = code.replace(targetImport, replacementImport);

const targetNav = `    const handleGiveawayNav = () => {
      setNavigationHistory(prev => [
        ...prev,
        { ...stateRef.current }
      ]);
      setActiveView('giveaway');
    };`;
const replacementNav = `    const handleGiveawayNav = () => {
      setShowGiveaways(true);
    };`;
code = code.replace(targetNav, replacementNav);

const targetRender = `        {activeView === 'giveaway' && <GiveawaysView onBack={() => setActiveView(prevViewRef.current || 'feed')} />}
      </Layout>
    );
  }

  return (
    <>
      {content}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <div id="modal-root" className="absolute inset-0 pointer-events-none z-[100] [&>*]:pointer-events-auto" />
    </>
  );
}`;
const replacementRender = `      </Layout>
    );
  }

  return (
    <>
      {content}
      <AnimatePresence>
        {showGiveaways && <GiveawaysView onBack={() => setShowGiveaways(false)} />}
      </AnimatePresence>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <div id="modal-root" className="absolute inset-0 pointer-events-none z-[100] [&>*]:pointer-events-auto" />
    </>
  );
}`;
code = code.replace(targetRender, replacementRender);

fs.writeFileSync('src/App.tsx', code);
