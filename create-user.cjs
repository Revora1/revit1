const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp({ projectId: 'revitup-c8a66' });
const auth = getAuth();

async function run() {
  try {
    const user = await auth.createUser({
      email: 'testagent2024@example.com',
      password: 'password123',
    });
    console.log('Created user:', user.uid);
  } catch(e) {
    console.error(e.message);
  }
}
run();
