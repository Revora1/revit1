const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/FeedScreen.tsx', 'utf8');

const headerFind = `<View style={styles.topHeaderRight}>
          <TouchableOpacity 
            style={styles.giveawayBtnTop} 
            onPress={() => navigation.navigate('Giveaways')}
          >
            <Ionicons name="gift" size={12} color="#fff" style={{marginRight: 4}} />
            <Text style={styles.giveawayBtnTextTop}>GIVEAWAY</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.chatBtnTop}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Activities', params: { initialTab: 'CHATS' } })}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>`;

const headerReplace = `<View style={styles.topHeaderRight}>
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

code = code.replace(headerFind, headerReplace);
fs.writeFileSync('mobile-app/screens/FeedScreen.tsx', code);
