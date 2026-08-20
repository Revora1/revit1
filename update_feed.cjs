const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/FeedScreen.tsx', 'utf8');

const target = `<View style={styles.topHeaderRight}>
          <TouchableOpacity 
            style={styles.chatBtnTop} 
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.chatBtnTop}
            onPress={() => navigation.navigate('Inbox')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>`;

const replacement = `<View style={styles.topHeaderRight}>
          <TouchableOpacity 
            style={{ backgroundColor: '#ff9800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 12, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => navigation.navigate('Giveaways')}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>🎁 GIVEAWAY</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.chatBtnTop}
            onPress={() => navigation.navigate('Inbox')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>`;

if(code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('mobile-app/screens/FeedScreen.tsx', code);
    console.log('Success');
} else {
    console.log('Target not found');
}
