const fs = require('fs');
let code = fs.readFileSync('src/components/Feed.tsx', 'utf8');
code = code.replace('<Gift size={12} className="text-white" /> WIN', '<Gift size={12} className="text-white" /> GIVEAWAY');
fs.writeFileSync('src/components/Feed.tsx', code);
