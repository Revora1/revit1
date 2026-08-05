const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetEvent = `    window.addEventListener('navigate-giveaway', handleGiveawayNav);
    window.addEventListener('navigate-dyno', handleDynoNav);`;
const replacementEvent = `    window.addEventListener('navigate-giveaway', handleGiveawayNav);
    window.addEventListener('navigate-dyno', handleDynoNav);
    const handleWhatsNew = () => setShowWhatsNew(true);
    window.addEventListener('show-whats-new', handleWhatsNew);`;

code = code.replace(targetEvent, replacementEvent);

const targetRemove = `      window.removeEventListener('navigate-giveaway', handleGiveawayNav);
      window.removeEventListener('navigate-dyno', handleDynoNav);`;
const replacementRemove = `      window.removeEventListener('navigate-giveaway', handleGiveawayNav);
      window.removeEventListener('navigate-dyno', handleDynoNav);
      window.removeEventListener('show-whats-new', handleWhatsNew);`;

code = code.replace(targetRemove, replacementRemove);
fs.writeFileSync('src/App.tsx', code);
