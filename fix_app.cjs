const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// Import new screens
if (!code.includes("import InboxScreen")) {
  code = code.replace(/import ChatScreen from '\.\/screens\/ChatScreen';/, "import ChatScreen from './screens/ChatScreen';\nimport InboxScreen from './screens/InboxScreen';\nimport NotificationsScreen from './screens/NotificationsScreen';");
}

// Add to Stack.Navigator
if (!code.includes('<Stack.Screen name="Inbox"')) {
  code = code.replace(/<Stack\.Screen name="Chat"/, '<Stack.Screen name="Inbox" component={InboxScreen} options={{ headerShown: false }} />\n          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />\n          <Stack.Screen name="Chat"');
}

fs.writeFileSync('mobile-app/App.tsx', code);
