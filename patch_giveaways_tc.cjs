const fs = require('fs');
let code = fs.readFileSync('src/components/GiveawaysView.tsx', 'utf8');

const importTarget = `import { Gift, Copy, CheckCircle2, ChevronLeft, Users, Trophy, ShieldCheck } from 'lucide-react';`;
code = code.replace(importTarget, `import { Gift, Copy, CheckCircle2, ChevronLeft, Users, Trophy, ShieldCheck, X } from 'lucide-react';`);

const stateTarget = `  const [hasPost, setHasPost] = useState(false);`;
code = code.replace(stateTarget, `  const [hasPost, setHasPost] = useState(false);
  const [showTC, setShowTC] = useState(false);`);

const tcTarget = `See full Terms & Conditions for official rules and eligibility.`;
code = code.replace(tcTarget, `See full <button onClick={() => setShowTC(true)} className="underline font-bold text-amber-500">Terms & Conditions</button> for official rules and eligibility.`);

const endTarget = `    </div>
  );
}`;

const tcModal = `
      {/* T&C Modal */}
      {showTC && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-black italic uppercase">Terms & Conditions</h2>
              <button onClick={() => setShowTC(false)} className="p-1 hover:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-xs text-zinc-400 space-y-4">
              <p>
                <strong className="text-white block mb-1">1. Eligibility</strong>
                The RevItUp Giveaway is open to all registered users of the RevItUp application. No purchase is necessary. 
                Users must have a verified account, at least 1 car in their garage, and 1 build update posted to qualify for an entry ticket.
              </p>
              <p>
                <strong className="text-white block mb-1">2. Non-Affiliation</strong>
                Apple Inc. and Google LLC are NOT sponsors of, nor are they involved in any way with, this giveaway or sweepstakes.
              </p>
              <p>
                <strong className="text-white block mb-1">3. How to Enter</strong>
                Users automatically receive an entry upon meeting the eligibility requirements. Additional entries ("referral bonuses") 
                can be earned by referring new users who successfully register using the referring user's unique link.
              </p>
              <p>
                <strong className="text-white block mb-1">4. Winner Selection</strong>
                Winners will be selected randomly from all eligible unlocked tickets once the specified community milestone targets are met. 
                The draw will be conducted transparently and winners will be contacted via the email associated with their RevItUp account.
              </p>
              <p>
                <strong className="text-white block mb-1">5. General Conditions</strong>
                RevItUp reserves the right to cancel, suspend, and/or modify the Giveaway if any fraud, technical failures, or any other factor 
                beyond reasonable control impairs the integrity or proper functioning of the Giveaway.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

code = code.replace(endTarget, tcModal);

fs.writeFileSync('src/components/GiveawaysView.tsx', code);
