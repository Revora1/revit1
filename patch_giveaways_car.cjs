const fs = require('fs');
let code = fs.readFileSync('src/components/GiveawaysView.tsx', 'utf8');

const target = `                   {m.image && (
                     <div className="my-2 rounded-xl overflow-hidden border border-zinc-800 relative">
                       <img src={m.image} alt={m.prize} className="w-full h-32 object-cover" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                         <span className="text-white font-black italic uppercase text-xs">{m.prize}</span>
                       </div>
                     </div>
                   )}`;

const replacement = `                   {(m.image || m.carMake || m.carModel) && (
                     <div className="my-2 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                       {m.image && (
                         <div className="relative">
                           <img src={m.image} alt={m.prize} className="w-full h-40 object-cover" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                             <span className="text-white font-black italic uppercase text-sm drop-shadow-md">{m.prize}</span>
                           </div>
                         </div>
                       )}
                       
                       {/* Car Details if available */}
                       {(m.carMake || m.carModel) && (
                         <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                           {m.carMake && (
                             <div className="flex flex-col">
                               <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Make</span>
                               <span className="text-zinc-200 font-medium">{m.carMake}</span>
                             </div>
                           )}
                           {m.carModel && (
                             <div className="flex flex-col">
                               <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Model</span>
                               <span className="text-zinc-200 font-medium">{m.carModel}</span>
                             </div>
                           )}
                           {m.carYear && (
                             <div className="flex flex-col">
                               <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Year</span>
                               <span className="text-zinc-200 font-medium">{m.carYear}</span>
                             </div>
                           )}
                           {m.carPower && (
                             <div className="flex flex-col">
                               <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Power</span>
                               <span className="text-zinc-200 font-medium">{m.carPower}</span>
                             </div>
                           )}
                         </div>
                       )}
                     </div>
                   )}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/GiveawaysView.tsx', code);
