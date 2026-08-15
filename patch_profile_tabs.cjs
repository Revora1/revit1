const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/ProfileScreen.tsx', 'utf8');

const tabInsert = `
              {profile?.partnerId && partnerProfile && (
                <TouchableOpacity
                  style={[styles.tab, activeTab === "duo" && styles.tabActive]}
                  onPress={() => setActiveTab("duo")}
                >
                  <Ionicons
                    name="heart"
                    size={20}
                    color={activeTab === "duo" ? "#e53935" : "#666"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "duo" && { color: "#e53935" },
                    ]}
                  >
                    Duo
                  </Text>
                </TouchableOpacity>
              )}
`;

code = code.replace(/<TouchableOpacity\s+style=\{\[styles.tab, activeTab === "posts" && styles.tabActive\]\}\s+onPress=\{\(\) => setActiveTab\("posts"\)\}\s+>/, tabInsert + '\n              <TouchableOpacity\n                style={[styles.tab, activeTab === "posts" && styles.tabActive]}\n                onPress={() => setActiveTab("posts")}\n              >');

// Add placeholder Duo View in tabContent
const contentInsert = `
              {activeTab === "duo" && profile?.partnerId && partnerProfile && (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, paddingTop: 40 }}>
                   <Ionicons name="heart" size={64} color="#e53935" style={{ marginBottom: 16 }} />
                   <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
                     Duo Showcase
                   </Text>
                   <Text style={{ color: "#aaa", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                     {profile?.username} & {partnerProfile?.username}'s combined garage and feed.
                   </Text>
                   <TouchableOpacity
                     style={{ marginTop: 24, backgroundColor: "#222", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20 }}
                     onPress={() => {
                        Alert.alert("Duo Showcase", "In the next update, this tab will display their combined garage and a unified feed of both users' posts side-by-side!");
                     }}
                   >
                     <Text style={{ color: "#fff", fontWeight: "bold" }}>View Garage & Feed</Text>
                   </TouchableOpacity>
                </View>
              )}
`;

code = code.replace(/\{activeTab === "posts" && \(/, contentInsert + '\n              {activeTab === "posts" && (');

fs.writeFileSync('mobile-app/screens/ProfileScreen.tsx', code);
