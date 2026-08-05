const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const stateTarget = `  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);`;
const stateReplacement = `  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showGiveaways, setShowGiveaways] = useState(false);`;
code = code.replace(stateTarget, stateReplacement);
fs.writeFileSync('src/App.tsx', code);
