const fs = require('fs');
let code = fs.readFileSync('src/components/Feed.tsx', 'utf8');

const targetHeader = `           <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-inbox'))}
             className="p-2 bg-zinc-900/50 backdrop-blur-md rounded-full text-white border border-white/10 active:scale-95 transition-transform"
           >
             <MessageSquare size={20} />
           </button>`;

const updatedHeader = `           <div className="flex items-center gap-2">
             <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-giveaway'))}
               className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full font-black italic uppercase text-[10px] tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 transition-transform"
             >
               <Gift size={12} className="text-white" /> WIN
             </button>
             <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-inbox'))}
               className="p-2 bg-zinc-900/50 backdrop-blur-md rounded-full text-white border border-white/10 active:scale-95 transition-transform"
             >
               <MessageSquare size={20} />
             </button>
           </div>`;

code = code.replace(targetHeader, updatedHeader);

const importTarget = `import { MessageSquare, RefreshCw, Star, ExternalLink, ShieldAlert, Sparkles, Check } from 'lucide-react';`;
code = code.replace(importTarget, `import { MessageSquare, RefreshCw, Star, ExternalLink, ShieldAlert, Sparkles, Check, Gift } from 'lucide-react';`);

fs.writeFileSync('src/components/Feed.tsx', code);
