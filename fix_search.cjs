const fs = require('fs');
let code = fs.readFileSync('src/components/SearchView.tsx', 'utf8');

code = code.replace(
`        <button 
          onClick={() => (window as any).openGroupsView?.()}
          className="bg-white text-black px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-200 transition-colors whitespace-nowrap self-start sm:self-auto shadow-lg"
        >
          <User size={16} /> Car Clubs
        </button>
        </div>
        {/* Segmented Tab Controls */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-2xl max-w-sm select-none w-full sm:w-auto mt-4 sm:mt-0">`,
`        <div className="flex items-center gap-4">
          <button 
            onClick={() => (window as any).openGroupsView?.()}
            className="bg-white text-black px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-200 transition-colors whitespace-nowrap shadow-lg"
          >
            <User size={16} /> Car Clubs
          </button>
        </div>
      </div>
      
      {/* Segmented Tab Controls */}
      <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-2xl max-w-sm select-none w-full mt-4">`
);

fs.writeFileSync('src/components/SearchView.tsx', code);
