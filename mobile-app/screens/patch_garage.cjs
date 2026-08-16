const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/GarageScreen.tsx', 'utf8');

const findBlock = `                <View style={styles.badgeRow}>
                  <Text style={styles.stageBadge}>{car.stage || 'Stock'}</Text>
                  {car.power ? <Text style={styles.powerBadge}>{car.power}</Text> : null}
                </View>
                {car.mods ? (
                  <View style={styles.modsContainer}>
                    <Text style={styles.modsLabel}>MODIFICATIONS</Text>
                    <Text style={styles.modsText}>{car.mods}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))`;

const replaceBlock = `                <View style={styles.badgeRow}>
                  <Text style={styles.stageBadge}>{car.stage || 'Stock'}</Text>
                  {car.power ? <Text style={styles.powerBadge}>{car.power}</Text> : null}
                </View>
                {car.mods ? (
                  <View style={styles.modsContainer}>
                    <Text style={styles.modsLabel}>MODIFICATIONS</Text>
                    <Text style={styles.modsText}>{car.mods}</Text>
                  </View>
                ) : null}
                <TouchableOpacity 
                   style={{ marginTop: 16, backgroundColor: '#333', padding: 12, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                   onPress={() => navigation.navigate('BuildTimeline', { carId: car.id })}
                >
                   <Ionicons name="time" size={16} color="#fff" style={{ marginRight: 8 }} />
                   <Text style={{ color: '#fff', fontWeight: 'bold' }}>View Build Timeline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))`;

code = code.replace(findBlock, replaceBlock);
fs.writeFileSync('mobile-app/screens/GarageScreen.tsx', code);
