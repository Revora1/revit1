const fs = require('fs');
let code = fs.readFileSync('src/components/GiveawaysView.tsx', 'utf8');

const target = `               return (
                 <div key={m.target} className={\`relative \${isCurrent ? 'opacity-100' : isPassed ? 'opacity-50' : 'opacity-30'}\`}>
                   <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1">
                     <span className={isPassed ? 'text-green-500 flex items-center gap-1' : 'text-zinc-400'}>
                       {isPassed && <CheckCircle2 size={12} />} {m.target.toLocaleString()} Users
                     </span>
                     <span className={isCurrent ? 'text-amber-500' : 'text-zinc-500'}>{m.prize}</span>
                   </div>`;

const replacement = `               return (
                 <div key={m.target} className={\`relative bg-zinc-800/30 border border-zinc-800/50 p-4 rounded-xl \${isCurrent ? 'opacity-100 ring-1 ring-amber-500/50' : isPassed ? 'opacity-50' : 'opacity-50'}\`}>
                   <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider mb-3">
                     <span className={\`\${isPassed ? 'text-green-500' : 'text-zinc-400'} flex items-center gap-1\`}>
                       {isPassed && <CheckCircle2 size={12} />} {m.target.toLocaleString()} Users
                     </span>
                     <span className={\`px-2 py-1 rounded-md text-[10px] \${isCurrent ? 'bg-amber-500/20 text-amber-500' : isPassed ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-800 text-zinc-500'}\`}>
                       {m.prize}
                     </span>
                   </div>`;

code = code.replace(target, replacement);

const target2 = `                     </div>
                   )}
                   <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                     <div
                        className={\`h-full rounded-full transition-all duration-1000 \${isPassed ? 'bg-green-500' : 'bg-amber-500'}\`}
                        style={{ width: \`\${progress}%\` }}
                     />
                   </div>
                 </div>
               );
             })}
           </div>`;

const replacement2 = `                     </div>
                   )}
                   <div className="mt-3 h-2 bg-zinc-900 rounded-full overflow-hidden">
                     <div
                        className={\`h-full rounded-full transition-all duration-1000 \${isPassed ? 'bg-green-500' : 'bg-amber-500'}\`}
                        style={{ width: \`\${progress}%\` }}
                     />
                   </div>
                 </div>
               );
             })}
           </div>`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/GiveawaysView.tsx', code);
