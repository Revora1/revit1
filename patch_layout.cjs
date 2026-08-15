const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

code = code.replace(/onClick=\{.*?onViewChange\(id\).*?\}/, `onClick={() => {
              if (activeView === id && id === 'feed') {
                window.dispatchEvent(new CustomEvent('refresh-feed'));
              }
              onViewChange(id);
            }}`);

fs.writeFileSync('src/components/Layout.tsx', code);
