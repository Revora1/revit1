const fs = require('fs');

function addRefresh(filePath, fetchCall, isSnapshot = false) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    if (!code.includes('RefreshControl')) {
        code = code.replace(/import \{([^}]+)\} from 'react-native';/, (match, p1) => {
            if (!p1.includes('RefreshControl')) {
                return `import {${p1}, RefreshControl } from 'react-native';`;
            }
            return match;
        });
        
        // Sometimes it uses "react-native" with double quotes
        code = code.replace(/import \{([^}]+)\} from "react-native";/, (match, p1) => {
            if (!p1.includes('RefreshControl')) {
                return `import {${p1}, RefreshControl } from "react-native";`;
            }
            return match;
        });
    }

    // Add state if not there
    if (!code.includes('const [refreshing, setRefreshing]')) {
        let refreshLogic = `
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    ${fetchCall}
    setRefreshing(false);
  }, []);
`;
        if (isSnapshot) {
           refreshLogic = `
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);
`;
        }

        // Insert before useEffect or similar
        code = code.replace(/useEffect\(\(\) => \{/, refreshLogic + '\n  useEffect(() => {');
        
        // Edge case for Marketplace / Feed where useEffect might be different
        if (!code.includes('const [refreshing')) {
            code = code.replace(/const fetch/, refreshLogic + '\n  const fetch');
        }
    }

    // Add refreshControl prop
    if (code.includes('<ScrollView') && !code.includes('refreshControl=')) {
        code = code.replace(/<ScrollView/, '<ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" colors={["#e53935"]} />}');
    }
    if (code.includes('<FlatList') && !code.includes('refreshControl=')) {
        code = code.replace(/<FlatList/, '<FlatList refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" colors={["#e53935"]} />}');
    }

    fs.writeFileSync(filePath, code);
}

// 1. Marketplace
addRefresh('mobile-app/screens/MarketplaceScreen.tsx', 'await fetchItems();');

// 2. Notifications
addRefresh('mobile-app/screens/NotificationsScreen.tsx', '', true);

// 3. Feed
addRefresh('mobile-app/screens/FeedScreen.tsx', 'await Promise.all([fetchPosts(), fetchActiveStories()]);');

