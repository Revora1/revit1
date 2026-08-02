const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add imports
code = code.replace(
  "import { SettingsModal } from './components/SettingsModal';",
  "import { SettingsModal } from './components/SettingsModal';\nimport { GroupsView } from './components/GroupsView';\nimport { GroupDetailView } from './components/GroupDetailView';"
);

// Add targetGroupId state
code = code.replace(
  "const [targetPostId, setTargetPostId] = useState<string | null>(sharedPostId);",
  "const [targetPostId, setTargetPostId] = useState<string | null>(sharedPostId);\n  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);"
);

// Add to state tracking
code = code.replace(
  "targetPostId,",
  "targetPostId,\n    targetGroupId,"
);
code = code.replace(
  "targetPostId,",
  "targetPostId,\n      targetGroupId,"
);
code = code.replace(
  "targetPostId, initialProfileTab",
  "targetPostId, targetGroupId, initialProfileTab"
);

// Add window overrides for navigation (so anywhere can jump to groups)
const navHack = `
  React.useEffect(() => {
    (window as any).openGroupsView = () => setActiveView('groups');
    (window as any).openGroupDetail = (groupId: string) => {
      setTargetGroupId(groupId);
      setActiveView('group_detail');
    };
  }, []);
`;
code = code.replace("const prevViewRef = React.useRef<View>('feed');", navHack + "\n  const prevViewRef = React.useRef<View>('feed');");

// Add views
const newViews = `
        {activeView === 'groups' && <GroupsView onBack={() => setActiveView('search')} onSelectGroup={(groupId) => { setTargetGroupId(groupId); setActiveView('group_detail'); }} />}
        {activeView === 'group_detail' && targetGroupId && <GroupDetailView groupId={targetGroupId} onBack={() => setActiveView('groups')} onNavigateProfile={(uid) => { setTargetUserId(uid); setActiveView('profile'); }} />}
`;

code = code.replace(
  "{activeView === 'post' && targetPostId && <SinglePostView postId={targetPostId} onBack={() => setActiveView(prevViewRef.current)} autoOpenComments={autoOpenComments} />}",
  "{activeView === 'post' && targetPostId && <SinglePostView postId={targetPostId} onBack={() => setActiveView(prevViewRef.current)} autoOpenComments={autoOpenComments} />}" + newViews
);

fs.writeFileSync('src/App.tsx', code);
