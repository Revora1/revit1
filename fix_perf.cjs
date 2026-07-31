const fs = require('fs');
let code = fs.readFileSync('src/components/PerformanceSubmitModal.tsx', 'utf8');
code = code.replace(
  `  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="w-full max-w-lg bg-zinc-950 rounded-t-[32px] sm:rounded-3xl border border-zinc-800 px-8 pt-6 pb-28 sm:pb-8 space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black italic tracking-tight uppercase">Verify Performance</h2>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{car.year} {car.make} {car.model}</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>`,
  `  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-zinc-950">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="w-full flex-1 px-8 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] space-y-6 overflow-y-auto scrollbar-hide"
      >
        <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
          <button onClick={onClose} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="space-y-1">
            <h2 className="text-2xl font-black italic tracking-tight uppercase">Verify Performance</h2>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{car.year} {car.make} {car.model}</p>
          </div>
        </div>`
);
fs.writeFileSync('src/components/PerformanceSubmitModal.tsx', code);
