const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/ProfileScreen.tsx', 'utf8');

const newDuoContent = `
              {activeTab === "duo" && profile?.partnerId && partnerProfile && (
                <View style={{ flex: 1 }}>
                  {/* Duo Header Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                     <Image source={{ uri: profile.profilePic || "https://via.placeholder.com/150" }} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#444' }} />
                     <Ionicons name="heart" size={24} color="#e53935" style={{ marginHorizontal: 16 }} />
                     <Image source={{ uri: partnerProfile.profilePic || "https://via.placeholder.com/150" }} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#e53935' }} />
                  </View>
                  <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 20 }}>
                     {profile.username} & {partnerProfile.username}
                  </Text>
                  
                  {/* Combined Garage */}
                  <Text style={{ color: '#aaa', paddingHorizontal: 16, marginBottom: 12, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }}>
                     Shared Garage
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                     {[...garage, ...partnerGarage].map((car, index) => (
                       <View key={car.id || index} style={{ marginRight: 16, width: 140 }}>
                          <Image source={{ uri: car.coverImage || car.images?.[0] || "https://via.placeholder.com/300" }} style={{ width: 140, height: 100, borderRadius: 12, backgroundColor: '#222' }} />
                          <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 8 }} numberOfLines={1}>{car.year} {car.make} {car.model}</Text>
                       </View>
                     ))}
                     {[...garage, ...partnerGarage].length === 0 && (
                        <Text style={{ color: '#666' }}>No cars in the shared garage yet.</Text>
                     )}
                  </ScrollView>

                  {/* Combined Feed */}
                  <Text style={{ color: '#aaa', paddingHorizontal: 16, marginBottom: 12, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }}>
                     Duo Feed
                  </Text>
                  <View style={styles.postsGrid}>
                    {[...posts, ...partnerPosts].sort((a,b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.()).map((post, index) => (
                      <View key={post.id || index} style={styles.postThumbnail}>
                        <Image
                          source={{ uri: post.mediaUrls?.[0] || post.mediaUrl || "https://via.placeholder.com/300" }}
                          style={styles.postThumbnailImage}
                        />
                      </View>
                    ))}
                    {[...posts, ...partnerPosts].length === 0 && (
                        <Text style={{ color: '#666', padding: 16 }}>No shared posts yet.</Text>
                    )}
                  </View>
                </View>
              )}
`;

code = code.replace(/\{activeTab === "duo"[\s\S]*?View Garage & Feed<\/Text>\n\s*<\/TouchableOpacity>\n\s*<\/View>\n\s*\)\}/, newDuoContent.trim());

fs.writeFileSync('mobile-app/screens/ProfileScreen.tsx', code);
