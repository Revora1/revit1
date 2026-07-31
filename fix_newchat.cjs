const fs = require('fs');
let code = fs.readFileSync('src/components/NewChatModal.tsx', 'utf8');
code = code.replace(
  `          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 top-[10%] bg-zinc-900 rounded-t-3xl z-[60] flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-lg">New Message</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>`,
  `          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-zinc-950 z-[60] flex flex-col overflow-hidden"
          >
            <div className="p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] border-b border-zinc-900 flex items-center gap-3">
              <button onClick={onClose} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <h3 className="font-bold text-lg">New Message</h3>
            </div>`
);
fs.writeFileSync('src/components/NewChatModal.tsx', code);
