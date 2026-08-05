const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importTarget = `import { DynoBoard } from './components/DynoBoard';`;
code = code.replace(importTarget, importTarget + `\nimport { GiveawaysView } from './components/GiveawaysView';`);

const navListenerTarget = `    const handleDynoNav = () => {`;
code = code.replace(navListenerTarget, `    const handleGiveawayNav = () => {
      setNavigationHistory(prev => [
        ...prev,
        { ...stateRef.current }
      ]);
      setActiveView('giveaway');
    };

` + navListenerTarget);

const addListenerTarget = `    window.addEventListener('navigate-dyno', handleDynoNav);`;
code = code.replace(addListenerTarget, addListenerTarget + `\n    window.addEventListener('navigate-giveaway', handleGiveawayNav);`);

const removeListenerTarget = `      window.removeEventListener('navigate-dyno', handleDynoNav);`;
code = code.replace(removeListenerTarget, removeListenerTarget + `\n      window.removeEventListener('navigate-giveaway', handleGiveawayNav);`);

const routerTarget = `        {activeView === 'group_detail' && targetGroupId && <GroupDetailView groupId={targetGroupId} onBack={() => setActiveView('groups')} onNavigateProfile={(uid) => { setTargetUserId(uid); setActiveView('profile'); }} />}`;
code = code.replace(routerTarget, routerTarget + `\n        {activeView === 'giveaway' && <GiveawaysView onBack={() => setActiveView(prevViewRef.current || 'feed')} />}`);

fs.writeFileSync('src/App.tsx', code);
