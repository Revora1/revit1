const fs = require('fs');
let code = fs.readFileSync('src/components/Profile.tsx', 'utf8');

const target1 = '`${getBaseUrl()}?u=${targetProfile.username}&ref=${currentUser?.uid}` :';
const target2 = '`${getBaseUrl()}?u=${targetProfile.username}`;';

code = code.replace(/\`\\\$\\{getBaseUrl\(\\)\\}\\\?u=\\\$\\{targetProfile.username\\}&ref=\\\$\\{currentUser\\\?\\.uid\\}\`/g, '`${getBaseUrl()}?u=${targetProfile.username}&ref=${currentUser?.uid}`');
code = code.replace(/\`\\\$\\{getBaseUrl\(\\)\\}\\\?u=\\\$\\{targetProfile.username\\}\`/g, '`${getBaseUrl()}?u=${targetProfile.username}`');

fs.writeFileSync('src/components/Profile.tsx', code);
