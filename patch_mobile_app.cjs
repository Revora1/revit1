const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// 1. Remove requestTrackingPermissionsAsync from initApp()
code = code.replace(/await requestTrackingPermissionsAsync\(\);\s*\} catch \(e\) \{/, `// tracking requested in CookieConsentModal\n      } catch (e) {`);

// 2. Add import for CookieConsentModal
code = code.replace(/import TopTunersScreen from '.\/screens\/TopTunersScreen';/, `import TopTunersScreen from './screens/TopTunersScreen';\nimport CookieConsentModal from './components/CookieConsentModal';`);

// 3. Add <CookieConsentModal /> inside the final return, before </NavigationContainer>
code = code.replace(/<\/NavigationContainer>/, `</NavigationContainer>\n      <CookieConsentModal userId={user?.uid} />`);

fs.writeFileSync('mobile-app/App.tsx', code);
