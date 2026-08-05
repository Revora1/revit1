const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetState = `  const [targetPostId, setTargetPostId] = useState<string | null>(null);`;
const replacementState = `  const [targetPostId, setTargetPostId] = useState<string | null>(null);
  const [showGiveaways, setShowGiveaways] = useState(false);`;
code = code.replace(targetState, replacementState);

const targetNav = `    const handleGiveawayNav = () => {
      setNavigationHistory(prev => [
        ...prev,
        { ...stateRef.current }
      ]);
      setActiveView('giveaway');
    };`;
const replacementNav = `    const handleGiveawayNav = () => {
      setShowGiveaways(true);
    };`;
code = code.replace(targetNav, replacementNav);

const targetRender = `        {activeView === 'group_detail' && activeGroupId && <GroupDetailView groupId={activeGroupId} onBack={handleBack} onPostClick={handlePostClick} />}
        {activeView === 'giveaway' && <GiveawaysView onBack={() => setActiveView(prevViewRef.current || 'feed')} />}
      </Layout>
      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
    </>
  );
}`;
const replacementRender = `        {activeView === 'group_detail' && activeGroupId && <GroupDetailView groupId={activeGroupId} onBack={handleBack} onPostClick={handlePostClick} />}
      </Layout>
      {showGiveaways && <GiveawaysView onBack={() => setShowGiveaways(false)} />}
      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
    </>
  );
}`;
code = code.replace(targetRender, replacementRender);

fs.writeFileSync('src/App.tsx', code);
