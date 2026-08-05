const fs = require('fs');
let code = fs.readFileSync('src/components/CarDetailsModal.tsx', 'utf8');

const target = `            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Activity size={16} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Engine</span>
                </div>
                <p className="font-medium">{car.engine}</p>
              </div>
              
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Calendar size={16} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Year</span>
                </div>
                <p className="font-medium">{car.year}</p>
              </div>
            </div>`;

const replacement = `            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Activity size={16} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Engine</span>
                </div>
                <p className="font-medium">{car.engine}</p>
              </div>

              {car.power && (
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Activity size={16} />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Power</span>
                  </div>
                  <p className="font-medium">{car.power}</p>
                </div>
              )}
              
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Calendar size={16} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Year</span>
                </div>
                <p className="font-medium">{car.year}</p>
              </div>
            </div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/CarDetailsModal.tsx', code);
