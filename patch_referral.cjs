const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const hook = `  // Parse shared user from URL query params`;
const addition = `  // Parse referral from URL query params
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref') || params.get('referral');
      if (refCode) {
        sessionStorage.setItem('referralCode', refCode);
      }
    } catch (e) {}
  }, []);

`;

code = code.replace(hook, addition + hook);
fs.writeFileSync('src/App.tsx', code);
