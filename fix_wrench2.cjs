const fs = require('fs');
let code = fs.readFileSync('src/components/SearchView.tsx', 'utf8');

code = `import { Wrench } from 'lucide-react';\n` + code;

fs.writeFileSync('src/components/SearchView.tsx', code);
