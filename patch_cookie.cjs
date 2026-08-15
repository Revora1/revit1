const fs = require('fs');
let code = fs.readFileSync('src/components/CookieConsent.tsx', 'utf8');

code = code.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/, `useEffect(() => {
    if (!user) {
      setShow(false);
      return;
    }
    const consent = localStorage.getItem('gdpr-consent');
    if (consent !== 'accepted') {
      setShow(true);
    } else {
      loadGoogleScripts();
    }
  }, [user]);`);

code = code.replace(/const handleConsent = \(accepted: boolean\) => \{[\s\S]*?window.location.reload\(\);\s*\};/, `const handleConsent = (accepted: boolean) => {
    if (accepted) {
      localStorage.setItem('gdpr-consent', 'accepted');
      loadGoogleScripts();
      setShow(false);
      window.location.reload();
    } else {
      localStorage.removeItem('gdpr-consent');
      setShow(false);
    }
  };`);

fs.writeFileSync('src/components/CookieConsent.tsx', code);
