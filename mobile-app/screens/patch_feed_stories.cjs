const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/FeedScreen.tsx', 'utf8');

const storiesFind = `<View style={styles.storiesBarOverlay}>
        <TouchableOpacity style={styles.addStoryBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.addStoryText}>Add Story</Text>
      </View>`;

const storiesReplace = `<View style={styles.storiesBarOverlay}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginRight: 16 }}>
            <TouchableOpacity style={styles.addStoryBtn} onPress={() => {}}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.addStoryText}>Add Story</Text>
          </View>
          
          {[1, 2, 3, 4].map(i => (
             <View key={i} style={{ alignItems: 'center', marginRight: 16 }}>
                <TouchableOpacity style={[styles.addStoryBtn, { borderColor: '#e53935', borderWidth: 2 }]} onPress={() => {}}>
                  <Image source={{ uri: "https://via.placeholder.com/150" }} style={{ width: '100%', height: '100%', borderRadius: 28 }} />
                </TouchableOpacity>
                <Text style={styles.addStoryText}>User {i}</Text>
             </View>
          ))}
        </ScrollView>
      </View>`;

code = code.replace(storiesFind, storiesReplace);
fs.writeFileSync('mobile-app/screens/FeedScreen.tsx', code);
