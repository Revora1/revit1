const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('const [showGiveaways, setShowGiveaways]')) {
  code = code.replace(
    'const [targetPostId, setTargetPostId] = useState<string | null>(null);',
    'const [targetPostId, setTargetPostId] = useState<string | null>(null);\n  const [showGiveaways, setShowGiveaways] = useState(false);'
  );
  fs.writeFileSync('src/App.tsx', code);
}
