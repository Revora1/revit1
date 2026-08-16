const fs = require('fs');
let code = fs.readFileSync('src/components/SearchView.tsx', 'utf8');

if (!code.includes('Wrench')) {
  code = code.replace("import { Search as SearchIcon, Users, SlidersHorizontal, Flame, Filter, ChevronDown, Check, Zap, Layers, User, Target, Car as CarIcon, MapPin, Sparkles } from 'lucide-react';", 
    "import { Search as SearchIcon, Users, SlidersHorizontal, Flame, Filter, ChevronDown, Check, Zap, Layers, User, Target, Car as CarIcon, MapPin, Sparkles, Wrench } from 'lucide-react';");
}

const marketplaceButton = `<button 
            onClick={() => (window as any).openMarketplace?.()}
            className="bg-yellow-500 text-black px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-yellow-400 transition-colors whitespace-nowrap shadow-lg"
          >
            <Layers size={16} /> Marketplace
          </button>`;

const newButtons = `<button 
            onClick={() => (window as any).openMarketplace?.()}
            className="bg-yellow-500 text-black px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-yellow-400 transition-colors whitespace-nowrap shadow-lg"
          >
            <Layers size={16} /> Marketplace
          </button>
          <button 
            onClick={() => (window as any).openMechanicBoard?.()}
            className="bg-zinc-800 text-white px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-700 transition-colors whitespace-nowrap shadow-lg border border-zinc-700"
          >
            <Wrench size={16} className="text-yellow-500" /> Service Board
          </button>`;

if (code.includes(marketplaceButton)) {
  code = code.replace(marketplaceButton, newButtons);
} else {
  console.log("Could not find marketplace button exact match, doing a looser replace...");
  code = code.replace(/<button[^>]*onClick=\{\(\) => \(window as any\)\.openMarketplace\?\.\(\)\}[^>]*>[\s\S]*?<\/button>/, newButtons);
}

fs.writeFileSync('src/components/SearchView.tsx', code);
