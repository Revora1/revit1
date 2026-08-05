const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const stateTarget = `  const [milestonesConfig, setMilestonesConfig] = useState<any[]>([
    { target: 10000, prize: '£50 Giftcard', image: '' },
    { target: 100000, prize: '£1000 Cash', image: '' },
    { target: 1000000, prize: 'A Brand New Car', image: '' }
  ]);`;
const stateReplacement = `  const [milestonesConfig, setMilestonesConfig] = useState<any[]>([
    { target: 10000, prize: '£50 Giftcard', image: '', carMake: '', carModel: '', carYear: '', carPower: '' },
    { target: 100000, prize: '£1000 Cash', image: '', carMake: '', carModel: '', carYear: '', carPower: '' },
    { target: 1000000, prize: 'A Brand New Car', image: '', carMake: '', carModel: '', carYear: '', carPower: '' }
  ]);`;
code = code.replace(stateTarget, stateReplacement);

const renderTarget = `                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 uppercase">Target Users</label>
                        <input type="number" value={m.target} onChange={(e) => handleMilestoneChange(idx, 'target', Number(e.target.value))} className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 uppercase">Prize Name</label>
                        <input type="text" value={m.prize} onChange={(e) => handleMilestoneChange(idx, 'prize', e.target.value)} className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                    </div>`;

const renderReplacement = `                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 uppercase">Target Users</label>
                        <input type="number" value={m.target} onChange={(e) => handleMilestoneChange(idx, 'target', Number(e.target.value))} className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 uppercase">Prize Name</label>
                        <input type="text" value={m.prize} onChange={(e) => handleMilestoneChange(idx, 'prize', e.target.value)} className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase">Make</label>
                        <input type="text" value={m.carMake || ''} onChange={(e) => handleMilestoneChange(idx, 'carMake', e.target.value)} placeholder="e.g. BMW" className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase">Model</label>
                        <input type="text" value={m.carModel || ''} onChange={(e) => handleMilestoneChange(idx, 'carModel', e.target.value)} placeholder="e.g. M3" className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase">Year</label>
                        <input type="text" value={m.carYear || ''} onChange={(e) => handleMilestoneChange(idx, 'carYear', e.target.value)} placeholder="e.g. 2023" className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase">Power (HP/BHP)</label>
                        <input type="text" value={m.carPower || ''} onChange={(e) => handleMilestoneChange(idx, 'carPower', e.target.value)} placeholder="e.g. 500 HP" className="w-full bg-zinc-900 p-2 rounded text-sm text-white" />
                      </div>
                    </div>`;
                    
code = code.replace(renderTarget, renderReplacement);
fs.writeFileSync('src/components/AdminPanel.tsx', code);
