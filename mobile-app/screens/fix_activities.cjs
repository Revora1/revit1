const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/ActivitiesScreen.tsx', 'utf8');

code = code.replace(/<\/View>\n              \)\)\n            \)\}\n            \{\!loadingGarage/, '</TouchableOpacity>\n              ))\n            )}\n            {!loadingGarage');
code = code.replace(/<\/View>\n              \)\)\n            \)\}\n            \{\!loadingRanks/, '</TouchableOpacity>\n              ))\n            )}\n            {!loadingRanks');

fs.writeFileSync('mobile-app/screens/ActivitiesScreen.tsx', code);
