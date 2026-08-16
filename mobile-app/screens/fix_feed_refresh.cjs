const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/FeedScreen.tsx', 'utf8');

const wrongRefresh = `<ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" colors={["#e53935"]} />} horizontal`;
code = code.replace(wrongRefresh, '<ScrollView horizontal');

const flatListFind = `<FlatList
            ref={flatListRef}`;

const flatListReplace = `<FlatList
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" colors={["#e53935"]} />}
            ref={flatListRef}`;

if (code.includes(flatListFind)) {
   code = code.replace(flatListFind, flatListReplace);
}

fs.writeFileSync('mobile-app/screens/FeedScreen.tsx', code);
