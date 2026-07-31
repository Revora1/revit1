const fs = require('fs');
let code = fs.readFileSync('src/components/CarDetailsModal.tsx', 'utf8');
code = code.replace(
  `            <button
              onClick={onClose}
              className="absolute right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-md transition-colors z-10 text-white"
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
            >
              <X size={20} />
            </button>`,
  `            <button
              onClick={onClose}
              className="absolute left-4 bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-md transition-colors z-10 text-white"
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>`
);
fs.writeFileSync('src/components/CarDetailsModal.tsx', code);
