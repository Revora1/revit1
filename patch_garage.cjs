const fs = require('fs');
let code = fs.readFileSync('src/components/Garage.tsx', 'utf8');
code = code.replace(
  '<ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>',
  '<ResponsiveContainer width="99%" height={120} minWidth={1} minHeight={1}>'
);
fs.writeFileSync('src/components/Garage.tsx', code);
