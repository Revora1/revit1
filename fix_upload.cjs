const fs = require('fs');
let code = fs.readFileSync('src/components/UploadView.tsx', 'utf8');
code = code.replace(
  `      <div>
        <h1 className="text-3xl font-black italic tracking-tighter">SHARE BUILD</h1>
        <p className="text-zinc-500 text-sm font-medium">Show the world what's under the hood.</p>
      </div>`,
  `      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white">SHARE BUILD</h1>
          <p className="text-zinc-500 text-sm font-medium">Show the world what's under the hood.</p>
        </div>
        <button 
          type="button" 
          onClick={onComplete} 
          className="p-2 -mr-2 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-full transition-colors active:scale-95 shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>`
);
fs.writeFileSync('src/components/UploadView.tsx', code);
