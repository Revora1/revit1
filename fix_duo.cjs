const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/ProfileScreen.tsx', 'utf8');

const brokenSection = `                    color={activeTab === "duo" && profile?.partnerId && partnerProfile && (
                <View style={{ flex: 1 }}>`;

const fixedSection = `                    color={activeTab === "duo" ? "#e53935" : "#666"}
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
              <TouchableOpacity
                style={[styles.tab, activeTab === "posts" && styles.tabActive]}
                onPress={() => setActiveTab("posts")}
              >
                <Ionicons
                  name="grid"
                  size={20}
                  color={activeTab === "posts" ? "#fff" : "#666"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "posts" && styles.tabTextActive,
                  ]}
                >
                  Posts
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === "garage" && (
                <View style={styles.garageList}>
                  {garage.length > 0 ? (
                    garage.map((car) => (
                      <View key={car.id} style={styles.garageCard}>
                        {car.coverImage ? (
                          <Image
                            source={{ uri: car.coverImage }}
                            style={styles.garageCardImage}
                          />
                        ) : (
                          <View style={styles.garageCardNoImage}>
                            <Ionicons
                              name="car-sport-outline"
                              size={48}
                              color="#666"
                            />
                          </View>
                        )}
                        <View style={styles.garageCardInfo}>
                          <Text style={styles.garageCardTitle}>
                            {car.year} {car.make} {car.model}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons
                        name="car-sport-outline"
                        size={48}
                        color="#333"
                        style={{ marginBottom: 12 }}
                      />
                      <Text style={styles.emptyStateText}>No cars yet</Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === "duo" && profile?.partnerId && partnerProfile && (
                <View style={{ flex: 1 }}>`;

code = code.replace(brokenSection, fixedSection);
fs.writeFileSync('mobile-app/screens/ProfileScreen.tsx', code);
