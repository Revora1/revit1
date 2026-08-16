const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import { MechanicBoardView }')) {
  code = code.replace(
    "import { MarketplaceView } from './components/MarketplaceView';",
    "import { MarketplaceView } from './components/MarketplaceView';\nimport { MechanicBoardView } from './components/MechanicBoardView';"
  );
}

if (!code.includes('openMechanicBoard')) {
  code = code.replace(
    "(window as any).openMarketplace = () => setActiveView('marketplace');",
    "(window as any).openMarketplace = () => setActiveView('marketplace');\n    (window as any).openMechanicBoard = () => setActiveView('mechanic_board');"
  );
}

if (!code.includes("activeView === 'mechanic_board'")) {
  code = code.replace(
    "{activeView === 'marketplace' && <MarketplaceView onBack={() => setActiveView('search')} />}",
    "{activeView === 'marketplace' && <MarketplaceView onBack={() => setActiveView('search')} />}\n        {activeView === 'mechanic_board' && <MechanicBoardView onBack={() => setActiveView('search')} />}"
  );
}

fs.writeFileSync('src/App.tsx', code);
