const fs = require('fs');
let code = fs.readFileSync('src/components/GiveawaysView.tsx', 'utf8');

const targetStr = `      </div>
    </div>
  );
}`;

const disclaimer = `
        {/* Legal Disclaimer & Rules */}
        <div className="text-[9px] text-zinc-500 space-y-2 pt-6 pb-2 px-2 text-center uppercase tracking-wider leading-relaxed border-t border-zinc-900 mt-6">
          <p>
            <strong className="text-zinc-400">Disclaimer:</strong> Apple Inc. and Google LLC are NOT sponsors of, nor are they involved in any way with, this giveaway or sweepstakes.
          </p>
          <p>
            No purchase necessary to enter or win. This is a free prize draw complying with UK Gambling Commission guidelines. 
            Winners are selected at random from eligible unlocked tickets once a community milestone is reached.
          </p>
          <p>
            Prize values are as stated in the milestone targets. See full Terms & Conditions for official rules and eligibility.
          </p>
        </div>
      </div>
    </div>
  );
}`;

code = code.replace(targetStr, disclaimer);
fs.writeFileSync('src/components/GiveawaysView.tsx', code);
