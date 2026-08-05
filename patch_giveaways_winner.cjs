const fs = require('fs');
let code = fs.readFileSync('src/components/GiveawaysView.tsx', 'utf8');

const target = `                        <h3 className="text-lg font-black italic uppercase mt-3">{m.prize}</h3>
                        <p className="text-sm font-bold text-zinc-400 mt-1">{m.target.toLocaleString()} Users Target</p>
                      </div>`;

const replacement = `                        <h3 className="text-lg font-black italic uppercase mt-3">{m.prize}</h3>
                        <p className="text-sm font-bold text-zinc-400 mt-1">{m.target.toLocaleString()} Users Target</p>
                        
                        {m.winnerUsername && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-500 text-xs font-bold">
                            <Trophy size={12} /> Winner: {m.winnerUsername}
                          </div>
                        )}
                      </div>`;
code = code.replace(target, replacement);

fs.writeFileSync('src/components/GiveawaysView.tsx', code);
