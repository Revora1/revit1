const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'const [activeView, setActiveView] = useState<View>(\'feed\');',
  'const [activeView, setActiveView] = useState<View>(\'feed\');\n  const [showGiveaways, setShowGiveaways] = useState(false);'
);
fs.writeFileSync('src/App.tsx', code);
