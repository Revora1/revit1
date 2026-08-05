const fs = require('fs');
let code = fs.readFileSync('src/components/GiveawaysView.tsx', 'utf8');

code = code.replace(
  `import { Capacitor } from '@capacitor/core';`,
  `import { Capacitor } from '@capacitor/core';\nimport { ErrorBoundary } from './ErrorBoundary';`
);

const targetRender = `        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">`;
const replacementRender = `        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <ErrorBoundary>
            <div className="space-y-6">`;

code = code.replace(targetRender, replacementRender);

const targetEndRender = `          <div className="text-[9px] text-zinc-500 space-y-2 pt-6 pb-2 px-2 text-center uppercase tracking-wider leading-relaxed border-t border-zinc-900 mt-6">
            <p>
              <strong className="text-zinc-400">Disclaimer:</strong> Apple Inc. and Google LLC are NOT sponsors of, nor are they involved in any way with, this giveaway or sweepstakes.
            </p>
            <p>
              No purchase necessary to enter or win. This is a free prize draw complying with UK Gambling Commission guidelines. 
              Winners are selected at random from eligible unlocked tickets once a community milestone is reached.
            </p>
            <p>
              Prize values are as stated in the milestone targets. See full <button onClick={() => setShowTC(true)} className="underline font-bold text-amber-500">Terms & Conditions</button> for official rules and eligibility.
            </p>
          </div>
        </div>`;

const replacementEndRender = `          <div className="text-[9px] text-zinc-500 space-y-2 pt-6 pb-2 px-2 text-center uppercase tracking-wider leading-relaxed border-t border-zinc-900 mt-6">
            <p>
              <strong className="text-zinc-400">Disclaimer:</strong> Apple Inc. and Google LLC are NOT sponsors of, nor are they involved in any way with, this giveaway or sweepstakes.
            </p>
            <p>
              No purchase necessary to enter or win. This is a free prize draw complying with UK Gambling Commission guidelines. 
              Winners are selected at random from eligible unlocked tickets once a community milestone is reached.
            </p>
            <p>
              Prize values are as stated in the milestone targets. See full <button onClick={() => setShowTC(true)} className="underline font-bold text-amber-500">Terms & Conditions</button> for official rules and eligibility.
            </p>
          </div>
            </div>
          </ErrorBoundary>
        </div>`;

code = code.replace(targetEndRender, replacementEndRender);

fs.writeFileSync('src/components/GiveawaysView.tsx', code);
