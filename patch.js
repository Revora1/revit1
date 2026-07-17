const fs = require('fs');
let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');
code = code.replace(
  "signInWithEmailAndPassword, signOut } from 'firebase/auth';",
  "signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';"
);

const oldSignInWithEmail = `  const signInWithEmail = async (e: string, p: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, e, p);
    } catch (err: any) {
      console.error('Email sign in error:', err);
      setError(err.message || 'Failed to sign in with email');
    }
  };`;

const newSignInWithEmail = `  const signInWithEmail = async (e: string, p: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, e, p);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, e, p);
          return;
        } catch (createErr: any) {
          setError(createErr.message || 'Failed to create reviewer account');
        }
      } else {
        console.error('Email sign in error:', err);
        setError(err.message || 'Failed to sign in with email');
      }
    }
  };`;

code = code.replace(oldSignInWithEmail, newSignInWithEmail);
fs.writeFileSync('src/context/AuthContext.tsx', code);
