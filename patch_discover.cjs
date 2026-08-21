const fs = require('fs');
const file = 'mobile-app/screens/DiscoverScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /onPress=\{\(\) \=\> \{\s*try \{\s*navigation\.navigate\('Menu'\);\s*\} catch\(e\) \{\s*console\.log\(e\);\s*try \{ navigation\.getParent\(\)\?\.navigate\('Menu'\); \} catch\(e2\) \{\}\s*\}\s*\}\}/,
  "onPress={() => { const parent = navigation.getParent(); if (parent) { parent.navigate('Menu'); } else { navigation.navigate('Menu'); } }}"
);

fs.writeFileSync(file, content);
console.log('Patched');
