const fs = require('fs');

// Feed.tsx
let feedCode = fs.readFileSync('src/components/Feed.tsx', 'utf8');
feedCode = feedCode.replace(
  /let fetchedPosts = snapshot\.docs\.map\(doc => \(\{\n        id: doc\.id,\n        \.\.\.doc\.data\(\)\n      \}\)\) as Post\[\];/,
  `let fetchedPosts = snapshot.docs.map(doc => ({\n        id: doc.id,\n        ...doc.data()\n      })) as Post[];\n      fetchedPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));`
);
fs.writeFileSync('src/components/Feed.tsx', feedCode);

// Profile.tsx
let profileCode = fs.readFileSync('src/components/Profile.tsx', 'utf8');
profileCode = profileCode.replace(
  /const fetchedPosts = snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \} as Post\)\);/,
  `const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));\n      fetchedPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));`
);
fs.writeFileSync('src/components/Profile.tsx', profileCode);
