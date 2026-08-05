const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(
  '  groupStatus?: \'pending\' | \'approved\';\n}',
  '  groupStatus?: \'pending\' | \'approved\';\n  isPinned?: boolean;\n}'
);
fs.writeFileSync('src/types.ts', code);
