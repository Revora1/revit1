const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const targetMenu = `    { id: 'whatsnew', icon: Sparkles, label: 'What\\'s New', description: 'Latest updates & giveaways' },\n`;
code = code.replace(targetMenu, '');

const targetClick = `                onClick={() => {
                  if (item.id === 'whatsnew') {
                    window.dispatchEvent(new CustomEvent('show-whats-new'));
                    onClose();
                  } else if (item.id === 'admin') {
                    if (user?.email === 'tonyang11552883@gmail.com') {
                      setActiveSubView('admin');
                    } else {
                      alert('Unauthorized');
                    }
                  } else {
                    setActiveSubView(item.id as SettingsView);
                  }
                }}`;
const replacementClick = `                onClick={() => {
                  if (item.id === 'admin') {
                    if (user?.email === 'tonyang11552883@gmail.com') {
                      setActiveSubView('admin');
                    } else {
                      alert('Unauthorized');
                    }
                  } else {
                    setActiveSubView(item.id as SettingsView);
                  }
                }}`;

code = code.replace(targetClick, replacementClick);
fs.writeFileSync('src/components/SettingsModal.tsx', code);
