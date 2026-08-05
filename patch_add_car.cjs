const fs = require('fs');
let code = fs.readFileSync('src/components/AddCarModal.tsx', 'utf8');

const stateTarget = `  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    engine: '',
    mods: '',
    stage: 'Stock' as CarStage,
  });`;

const stateReplacement = `  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    engine: '',
    power: '',
    mods: '',
    stage: 'Stock' as CarStage,
  });`;

code = code.replace(stateTarget, stateReplacement);

const formTarget = `          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Engine</label>
             <input
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                value={formData.engine}
                onChange={e => setFormData({ ...formData, engine: e.target.value })}
                placeholder="e.g. S55 3.0L Twin-Turbo"
              />
          </div>`;

const formReplacement = `          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Engine</label>
               <input
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                  value={formData.engine}
                  onChange={e => setFormData({ ...formData, engine: e.target.value })}
                  placeholder="e.g. S55 3.0L"
                />
            </div>
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-zinc-500 tracking-widest px-1 uppercase">Power</label>
               <input
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white outline-none transition-colors"
                  value={formData.power}
                  onChange={e => setFormData({ ...formData, power: e.target.value })}
                  placeholder="e.g. 500 HP"
                />
            </div>
          </div>`;

code = code.replace(formTarget, formReplacement);

fs.writeFileSync('src/components/AddCarModal.tsx', code);
