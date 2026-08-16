const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/\\\`/g, '`');
  code = code.replace(/\\\$/g, '$');
  fs.writeFileSync(file, code);
}

fixFile('src/components/AddMechanicModal.tsx');
fixFile('src/components/MechanicBoardView.tsx');
