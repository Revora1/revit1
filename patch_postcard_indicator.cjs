const fs = require('fs');
let code = fs.readFileSync('src/components/PostCard.tsx', 'utf8');

const targetHeader = `           {taggedCar && (
             <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-bold tracking-tight text-white">#{taggedCar.make} {taggedCar.model}</span>
           )}
           <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/5">
             <Clock size={10} className="text-zinc-500 animate-pulse" />
             <span>{formatTimeAgo(post.createdAt)}</span>
           </span>`;

const replacementHeader = `           {taggedCar && (
             <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-bold tracking-tight text-white">#{taggedCar.make} {taggedCar.model}</span>
           )}
           {post.isPinned && (
             <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 backdrop-blur-sm px-2 py-0.5 rounded-full border border-amber-500/30 tracking-tight uppercase">
               <Pin size={10} fill="currentColor" />
               Pinned
             </span>
           )}
           <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/5">
             <Clock size={10} className="text-zinc-500 animate-pulse" />
             <span>{formatTimeAgo(post.createdAt)}</span>
           </span>`;

code = code.replace(targetHeader, replacementHeader);
fs.writeFileSync('src/components/PostCard.tsx', code);
