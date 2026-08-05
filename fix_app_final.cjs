const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'const [showSettings, setShowSettings] = useState(false);',
  'const [showSettings, setShowSettings] = useState(false);\n  const [showGiveaways, setShowGiveaways] = useState(false);'
);
fs.writeFileSync('src/App.tsx', code);
