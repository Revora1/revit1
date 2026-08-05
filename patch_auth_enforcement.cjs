const fs = require('fs');
let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const targetStateChanged = `    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.emailVerified) {
        await signOut(auth);
        setUser(null);
        cleanupSubscribers();
        setProfile(null);
        setLoading(false);
        return;
      }`;

const replacementStateChanged = `    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.emailVerified) {
        const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
        const enforceVerificationAfter = new Date('2026-08-05T17:00:00Z').getTime();
        
        if (creationTime > enforceVerificationAfter) {
          await signOut(auth);
          setUser(null);
          cleanupSubscribers();
          setProfile(null);
          setLoading(false);
          return;
        }
      }`;

if (code.includes(targetStateChanged)) {
  code = code.replace(targetStateChanged, replacementStateChanged);
  console.log("Patched onAuthStateChanged");
} else {
  console.log("Could not find targetStateChanged");
}

const targetSignIn = `      const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, p);
      if (userCredential.user && !userCredential.user.emailVerified) {
        try { await sendEmailVerification(userCredential.user); } catch (e) {}
        await signOut(auth);
        setError('Please verify your email address before signing in. A new verification email has been sent.');
      }`;

const replacementSignIn = `      const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, p);
      if (userCredential.user && !userCredential.user.emailVerified) {
        const creationTime = userCredential.user.metadata.creationTime ? new Date(userCredential.user.metadata.creationTime).getTime() : 0;
        const enforceVerificationAfter = new Date('2026-08-05T17:00:00Z').getTime();
        
        if (creationTime > enforceVerificationAfter) {
          try { await sendEmailVerification(userCredential.user); } catch (e) {}
          await signOut(auth);
          setError('Please verify your email address before signing in. A new verification email has been sent.');
          return;
        }
      }`;

if (code.includes(targetSignIn)) {
  code = code.replace(targetSignIn, replacementSignIn);
  console.log("Patched signInWithEmail");
} else {
  console.log("Could not find targetSignIn");
}

fs.writeFileSync('src/context/AuthContext.tsx', code);
