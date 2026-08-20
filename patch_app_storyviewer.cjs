const fs = require('fs');
let code = fs.readFileSync('mobile-app/App.tsx', 'utf8');

if (!code.includes("import StoryViewerScreen")) {
  code = code.replace(/import BuildTimelineScreen from '\.\/screens\/BuildTimelineScreen';/, "import BuildTimelineScreen from './screens/BuildTimelineScreen';\nimport StoryViewerScreen from './screens/StoryViewerScreen';");
}

if (!code.includes('<Stack.Screen name="StoryViewer"')) {
  code = code.replace(/<Stack\.Screen name="BuildTimeline"/, '<Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ headerShown: false, presentation: "fullScreenModal" }} />\n          <Stack.Screen name="BuildTimeline"');
}

fs.writeFileSync('mobile-app/App.tsx', code);
