const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/GroupsScreen.tsx', 'utf8');

const findBlock = `  const fetchGroups = async () => {
    // dummy wait
    setTimeout(() => {
      setGroups([
        { id: '1', name: 'JDM Classics', memberCount: 1240, description: 'For lovers of 90s Japanese legends.' },
        { id: '2', name: 'Euro Tuners', memberCount: 890, description: 'BMW, Audi, Porsche, and VW.' },
        { id: '3', name: 'American Muscle', memberCount: 2100, description: 'V8s only. Mopar, LS, Coyote.' },
      ]);
      setLoading(false);
    }, 1000);
  };`;

const replaceBlock = `  const fetchGroups = async () => {
    try {
      const q = query(collection(db, 'groups'), orderBy('memberCount', 'desc'), limit(50));
      const snap = await getDocs(q);
      setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };`;

if (code.includes('setTimeout')) {
   code = code.replace(findBlock, replaceBlock);
   if (!code.includes("import { collection")) {
       code = code.replace(/import \{ db, auth \} from '\.\.\/firebaseConfig';/, "import { db, auth } from '../firebaseConfig';\nimport { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';");
   }
   fs.writeFileSync('mobile-app/screens/GroupsScreen.tsx', code);
}
