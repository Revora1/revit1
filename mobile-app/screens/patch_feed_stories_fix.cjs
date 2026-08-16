const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/FeedScreen.tsx', 'utf8');

// I need to add activeStories state and handleAddStory function back.
// It seems my previous replace might have failed or replaced the wrong block.

const functionInsert = `
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
      if (!result.canceled && result.assets && result.assets[0].uri && auth.currentUser) {
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
  };
`;

code = code.replace(/const \[blockedUsers, setBlockedUsers\] = useState<string\[\]>\(\[\]\);/, "const [blockedUsers, setBlockedUsers] = useState<string[]>([]);" + functionInsert);

fs.writeFileSync('mobile-app/screens/FeedScreen.tsx', code);
