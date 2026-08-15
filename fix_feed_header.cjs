const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/FeedScreen.tsx', 'utf8');

const headerFind = `<View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        </View>`;

const headerReplace = `<View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Inbox')}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
          </TouchableOpacity>
        </View>`;

code = code.replace(headerFind, headerReplace);

// Let's also add Stories placeholder hook
// In FeedScreen, storiesBarOverlay is rendered. We can make it interactive or add actual dummy data for now
const storyFind = `<View style={styles.storiesBarOverlay}>
        <TouchableOpacity style={styles.addStoryBtn}>`;

const storyReplace = `<View style={styles.storiesBarOverlay}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <TouchableOpacity style={styles.addStoryBtn} onPress={() => {}}>`;
// wait, FeedScreen already has `addStoryBtn`. Let's just fix the header.

fs.writeFileSync('mobile-app/screens/FeedScreen.tsx', code);
