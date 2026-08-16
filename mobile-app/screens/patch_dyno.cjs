const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/DynoBoardScreen.tsx', 'utf8');

// The original DynoBoard uses dummy data. Let's wire it up to Garage collection.
const findBlock = `  const [loading, setLoading] = useState(false);
  
  // Dummy data
  const leaderboards = {`;

const replaceBlock = `  const [loading, setLoading] = useState(true);
  
  const [leaderboards, setLeaderboards] = useState<any>({
     power: [],
     track: [],
     quarterMile: []
  });

  useEffect(() => {
    const fetchLeaderboards = async () => {
       try {
          const qPower = query(collection(db, 'garage'), orderBy('power', 'desc'), limit(10));
          const snapPower = await getDocs(qPower);
          
          const powerBoard = snapPower.docs.map(doc => {
             const data = doc.data();
             return { id: doc.id, username: data.ownerUsername || 'Tuner', car: \`\${data.year || ''} \${data.make || ''} \${data.model || ''}\`, stat: data.power ? data.power.toString() : '0' };
          }).filter(x => x.stat !== '0');
          
          setLeaderboards({
             power: powerBoard,
             track: [],
             quarterMile: []
          });
       } catch (err) {
          console.error(err);
       } finally {
          setLoading(false);
       }
    };
    fetchLeaderboards();
  }, []);`;

if (code.includes('// Dummy data')) {
   code = code.replace(findBlock, replaceBlock);
   if (!code.includes("import { collection, query, orderBy, limit, getDocs }")) {
      code = code.replace(/import \{ db \} from '\.\.\/firebaseConfig';/, "import { db } from '../firebaseConfig';\nimport { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';");
   }
   fs.writeFileSync('mobile-app/screens/DynoBoardScreen.tsx', code);
}
