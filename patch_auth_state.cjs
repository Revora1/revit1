const fs = require('fs');
let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const targetStateChanged = `    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      cleanupSubscribers();

      if (user) {`;

const replacementStateChanged = `    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.emailVerified) {
        await signOut(auth);
        setUser(null);
        cleanupSubscribers();
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(user);
      cleanupSubscribers();

      if (user) {`;

code = code.replace(targetStateChanged, replacementStateChanged);

fs.writeFileSync('src/context/AuthContext.tsx', code);
