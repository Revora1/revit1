const fs = require('fs');

let fileCode = fs.readFileSync('src/components/SearchView.tsx', 'utf8');

const buttonHtml = `        {/* Segmented Tab Controls */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-2xl max-w-sm select-none w-full sm:w-auto">`;

const replaceHtml = `
        <button 
          onClick={() => (window as any).openGroupsView?.()}
          className="bg-white text-black px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-200 transition-colors whitespace-nowrap self-start sm:self-auto shadow-lg"
        >
          <User size={16} /> Car Clubs
        </button>
        </div>
        {/* Segmented Tab Controls */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-2xl max-w-sm select-none w-full sm:w-auto mt-4 sm:mt-0">`;

fileCode = fileCode.replace(buttonHtml, replaceHtml);
fs.writeFileSync('src/components/SearchView.tsx', fileCode);
