const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  `  const handleViewChange = (view: View) => {
    if (view === 'garage') {
      setInboxTargetTab('garage');
      setActiveView('inbox');
      return;
    }
    if (view === 'tuners') {
      setInboxTargetTab('leaderboards');
      setActiveView('inbox');
      return;
    }
    if (view === 'dyno') {
      setInboxTargetTab('leaderboards-dyno');
      setActiveView('inbox');
      return;
    }
    setActiveView(view);
    setTargetUserId(null);
    setTargetUsername(null);
    if (view !== 'post') {
      setTargetPostId(null);
      setAutoOpenComments(false);
    }
    if (view !== 'inbox') {
      setTargetChatInfo(null);
      setInboxTargetTab(null);
    }
  };`,
  `  const handleViewChange = (view: View) => {
    setNavigationHistory([]);
    if (view === 'garage') {
      setInboxTargetTab('garage');
      setActiveView('inbox');
      return;
    }
    if (view === 'tuners') {
      setInboxTargetTab('leaderboards');
      setActiveView('inbox');
      return;
    }
    if (view === 'dyno') {
      setInboxTargetTab('leaderboards-dyno');
      setActiveView('inbox');
      return;
    }
    setActiveView(view);
    setTargetUserId(null);
    setTargetUsername(null);
    if (view !== 'post') {
      setTargetPostId(null);
      setAutoOpenComments(false);
    }
    if (view !== 'inbox') {
      setTargetChatInfo(null);
      setInboxTargetTab(null);
    }
  };`
);
fs.writeFileSync('src/App.tsx', code);
