const fs = require('fs');
let code = fs.readFileSync('src/components/Profile.tsx', 'utf8');

const replacement = `
    const q = query(
      postsRef,
      where('authorId', '==', userId)
    );
`;
code = code.replace(/const q = query\(\n      postsRef,\n      where\('authorId', '==', userId\),\n      orderBy\('createdAt', 'desc'\)\n    \);/, replacement.trim());
fs.writeFileSync('src/components/Profile.tsx', code);
