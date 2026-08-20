const fs = require('fs');
const file = '/app/applet/mobile-app/screens/ProfileScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

// Modifying Duo Feed post items to be clickable
code = code.replace(
  /<View key=\{post\.id \|\| index\} style=\{styles\.postItem\}>/g,
  '<TouchableOpacity key={post.id || index} style={styles.postItem} onPress={() => setSelectedImage(post.mediaUrls?.[0] || post.mediaUrl)}>'
);
code = code.replace(
  /<\/Image>\s*<\/View>\s*\}\)\)/g,
  '</Image>\n                      </TouchableOpacity>\n                    ))'
);
// Sometimes it's self-closing <Image ... />
code = code.replace(
  /style=\{styles\.postImage\}\s*\/>\s*<\/View>\s*\}\)\)/g,
  'style={styles.postImage}\n                        />\n                      </TouchableOpacity>\n                    ))'
);

// Modifying User Feed post items to be clickable
code = code.replace(
  /<TouchableOpacity key=\{post\.id\} style=\{styles\.postItem\}>/g,
  '<TouchableOpacity key={post.id} style={styles.postItem} onPress={() => setSelectedImage(post.mediaUrls?.[0] || post.mediaUrl)}>'
);

// Append the Modals to the end of the JSX, right before `</SafeAreaView>`
const modalsJSX = `
      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />
          )}
        </View>
      </Modal>

      {/* Follows Modal */}
      <Modal visible={!!showFollowsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.settingsModalHeader}>
            <Text style={styles.settingsModalTitle}>
              {showFollowsModal === 'followers' ? 'Followers' : 'Following'}
            </Text>
            <TouchableOpacity onPress={() => setShowFollowsModal(null)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {loadingFollows ? (
              <ActivityIndicator size="large" color="#e53935" style={{ marginTop: 40 }} />
            ) : followsList.length > 0 ? (
              followsList.map(u => (
                <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Image source={{ uri: u.profilePic || "https://via.placeholder.com/150" }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#333' }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{u.username}</Text>
                    {u.bio && <Text style={{ color: '#aaa', fontSize: 14 }} numberOfLines={1}>{u.bio}</Text>}
                  </View>
                  <TouchableOpacity 
                     style={{ backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                     onPress={() => {
                        setShowFollowsModal(null);
                        if (u.id !== auth.currentUser?.uid) {
                          navigation.push('Profile', { userId: u.id });
                        }
                     }}
                  >
                     <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>View</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={{ color: '#666', textAlign: 'center', marginTop: 40 }}>
                No users found.
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
`;

code = code.replace(
  /<\/ScrollView>\s*<\/SafeAreaView>\s*\)/,
  `</ScrollView>\n${modalsJSX}\n    </SafeAreaView>\n  )`
);

fs.writeFileSync(file, code);
console.log('Posts and modals patched');
