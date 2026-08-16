const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

if (!code.includes("import BuildTimelineScreen")) {
  code = code.replace(/import ChatScreen from '\.\/screens\/ChatScreen';/, "import ChatScreen from './screens/ChatScreen';\nimport BuildTimelineScreen from './screens/BuildTimelineScreen';");
}

if (!code.includes('<Stack.Screen name="BuildTimeline"')) {
  code = code.replace(/<Stack\.Screen name="MyGarage"/, '<Stack.Screen name="BuildTimeline" component={BuildTimelineScreen} options={{ headerShown: false }} />\n          <Stack.Screen name="MyGarage"');
}

fs.writeFileSync('mobile-app/App.tsx', code);
