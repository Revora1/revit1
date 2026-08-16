const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/ProfileScreen.tsx', 'utf8');

if (!code.includes("import AsyncStorage")) {
    code = code.replace(/import \{ Ionicons \} from '@expo\/vector-icons';/, "import { Ionicons } from '@expo/vector-icons';\nimport AsyncStorage from '@react-native-async-storage/async-storage';");
}

code = code.replace(/const \[cookieConsent, setCookieConsent\] = useState\(true\);/, `const [cookieConsent, setCookieConsent] = useState(true);
  
  useEffect(() => {
    AsyncStorage.getItem('gdpr-consent').then(val => {
      setCookieConsent(val === 'accepted');
    }).catch(console.error);
  }, []);`);

code = code.replace(/setCookieConsent\(\!cookieConsent\);\s*if \(cookieConsent\) \{/g, `
                  const newConsent = !cookieConsent;
                  setCookieConsent(newConsent);
                  if (newConsent) {
                    AsyncStorage.setItem('gdpr-consent', 'accepted').catch(console.error);
                    Alert.alert(
                      "Cookies Accepted",
                      "Thank you for supporting personalized experiences."
                    );
                  } else {
                    AsyncStorage.removeItem('gdpr-consent').catch(console.error);
                    Alert.alert(
                      "Cookies Declined",
                      "Non-essential tracking has been disabled."
                    );
                  }
                  if (false) {`);

fs.writeFileSync('mobile-app/screens/ProfileScreen.tsx', code);
