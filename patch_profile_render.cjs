const fs = require('fs');
const file = '/app/applet/mobile-app/screens/ProfileScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

// Modifying stats
code = code.replace(
  /<View style=\{styles\.statItem\}>\s*<Text style=\{styles\.statNumber\}>\s*\{\s*dynamicFollowersCount[\s\S]*?<\/View>/,
  `<TouchableOpacity style={styles.statItem} onPress={() => handleOpenFollows('followers')}>
                  <Text style={styles.statNumber}>
                    {dynamicFollowersCount !== null
                      ? dynamicFollowersCount
                      : Math.max(0, profile?.followersCount || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>`
);

code = code.replace(
  /<View style=\{styles\.statItem\}>\s*<Text style=\{styles\.statNumber\}>\s*\{\s*dynamicFollowingCount[\s\S]*?<\/View>/,
  `<TouchableOpacity style={styles.statItem} onPress={() => handleOpenFollows('following')}>
                  <Text style={styles.statNumber}>
                    {dynamicFollowingCount !== null
                      ? dynamicFollowingCount
                      : Math.max(0, profile?.followingCount || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>`
);

// Modify Garage card to be TouchableOpacity and navigate
code = code.replace(
  /<View key=\{car\.id\} style=\{styles\.garageCard\}>/g,
  `<TouchableOpacity key={car.id} style={styles.garageCard} onPress={() => navigation.navigate("BuildTimeline", { carId: car.id })}> `
);
code = code.replace(
  /<\/Text>\s*<\/View>\s*<\/View>/g,
  `</Text>\n                        </View>\n                      </TouchableOpacity>`
); // Be careful here, let's use a more precise regex.

fs.writeFileSync(file, code);
console.log('Stats render patched');
