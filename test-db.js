import fs from 'fs';
const content = fs.readFileSync('src/lib/firebase.ts', 'utf8');
console.log(content.includes('export const db'));
