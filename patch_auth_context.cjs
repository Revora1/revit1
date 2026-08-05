const fs = require('fs');
let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

code = code.replace(
  "import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';",
  "import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';"
);

const targetSignIn = `  const signInWithEmail = async (e: string, p: string) => {
    setError(null);
    const sanitizedEmail = e.trim().toLowerCase();
    try {
      await signInWithEmailAndPassword(auth, sanitizedEmail, p);
    } catch (err: any) {`;

const replacementSignIn = `  const signInWithEmail = async (e: string, p: string) => {
    setError(null);
    const sanitizedEmail = e.trim().toLowerCase();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, p);
      if (userCredential.user && !userCredential.user.emailVerified) {
        try { await sendEmailVerification(userCredential.user); } catch (e) {}
        await signOut(auth);
        setError('Please verify your email address before signing in. A new verification email has been sent.');
      }
    } catch (err: any) {`;

code = code.replace(targetSignIn, replacementSignIn);

const targetSignUp = `  const signUpWithEmail = async (e: string, p: string) => {
    setError(null);
    const sanitizedEmail = e.trim().toLowerCase();
    try {
      await createUserWithEmailAndPassword(auth, sanitizedEmail, p);
    } catch (createErr: any) {`;

const replacementSignUp = `  const signUpWithEmail = async (e: string, p: string) => {
    setError(null);
    const sanitizedEmail = e.trim().toLowerCase();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, p);
      if (userCredential.user) {
        try { await sendEmailVerification(userCredential.user); } catch (e) {}
        await signOut(auth);
        setError('Account created! Please check your email to verify your account before logging in.');
      }
    } catch (createErr: any) {`;

code = code.replace(targetSignUp, replacementSignUp);

fs.writeFileSync('src/context/AuthContext.tsx', code);
