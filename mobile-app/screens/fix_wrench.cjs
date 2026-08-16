const fs = require('fs');
let code = fs.readFileSync('src/components/SearchView.tsx', 'utf8');

if (!code.includes('Wrench }')) {
  code = code.replace(
    "import { Search as SearchIcon",
    "import { Wrench } from 'lucide-react';\nimport { Search as SearchIcon"
  );
}
fs.writeFileSync('src/components/SearchView.tsx', code);
