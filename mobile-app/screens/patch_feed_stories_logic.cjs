const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/FeedScreen.tsx', 'utf8');

// Update imports
if (!code.includes("import * as ImagePicker")) {
  code = code.replace(/import \{ collection,/, "import * as ImagePicker from 'expo-image-picker';\nimport { ref, uploadBytes, getDownloadURL } from 'firebase/storage';\nimport { storage } from '../firebaseConfig';\nimport { collection,");
}

const functionFind = `  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);`;

const functionReplace = `  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  
  const [activeStories, setActiveStories] = useState<any[]>([]);

  const fetchActiveStories = async () => {
    try {
      const q = query(
        collection(db, 'stories'),
        where('expiresAt', '>', new Date()),
        orderBy('expiresAt', 'asc')
      );
      const snap = await getDocs(q);
      const storiesMap = new Map();
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (!storiesMap.has(data.userId)) {
           storiesMap.set(data.userId, { id: doc.id, ...data });
        }
      });
      setActiveStories(Array.from(storiesMap.values()));
    } catch (err) {
      console.log('Error fetching stories:', err);
    }
  };

  useEffect(() => {
    fetchActiveStories();
  }, []);

  const handleAddStory = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Allow camera roll access to post a story.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0].uri && auth.currentUser) {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const fileRef = ref(storage, \`stories/\${auth.currentUser.uid}/\${Date.now()}\`);
        await uploadBytes(fileRef, blob);
        const url = await getDownloadURL(fileRef);
        
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        await addDoc(collection(db, 'stories'), {
          userId: auth.currentUser.uid,
          username: 'User_' + auth.currentUser.uid.substring(0, 5),
          profilePic: auth.currentUser.photoURL || null,
          mediaUrl: url,
          mediaType: 'image',
          createdAt: serverTimestamp(),
          expiresAt: expiresAt
        });
        
        fetchActiveStories();
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to upload story');
    }
  };`;

code = code.replace(functionFind, functionReplace);

const uiFind = `<View style={styles.storiesBarOverlay}>
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

const uiReplace = `<View style={styles.storiesBarOverlay}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
          <View style={{ alignItems: 'center', marginRight: 16 }}>
            <TouchableOpacity style={styles.addStoryBtn} onPress={handleAddStory}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.addStoryText}>Add Story</Text>
          </View>
          
          {activeStories.map((story) => (
             <View key={story.id} style={{ alignItems: 'center', marginRight: 16 }}>
                <TouchableOpacity 
                   style={[styles.addStoryBtn, { borderColor: '#e53935', borderWidth: 2, padding: 2 }]} 
                   onPress={() => navigation.navigate('StoryViewer', { userId: story.userId, username: story.username })}
                >
                  <Image source={{ uri: story.profilePic || story.mediaUrl }} style={{ width: '100%', height: '100%', borderRadius: 28 }} />
                </TouchableOpacity>
                <Text style={styles.addStoryText}>{story.username}</Text>
             </View>
          ))}
        </ScrollView>
      </View>`;

code = code.replace(uiFind, uiReplace);

fs.writeFileSync('mobile-app/screens/FeedScreen.tsx', code);
