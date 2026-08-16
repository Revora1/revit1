const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// remove import MenuScreen
code = code.replace("import MenuScreen from './screens/MenuScreen';\n", "");

// remove tab bar icon
const menuIconCode = `} else if (route.name === 'Menu') {
            return <Ionicons name={focused ? 'menu' : 'menu-outline'} size={size} color={color} />;
          }`;
code = code.replace(menuIconCode, '}');

// remove tab screen
code = code.replace('<Tab.Screen name="Menu" component={MenuScreen} />\n', '');

fs.writeFileSync('mobile-app/App.tsx', code);
