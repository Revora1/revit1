const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/DiscoverScreen.tsx', 'utf8');

const target = `<View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionBtnWhite} onPress={() => navigation.navigate('Groups')}>
            <Ionicons name="people-outline" size={18} color="#000" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextBlack}>CLUBS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnYellow} onPress={() => navigation.navigate('Marketplace')}>
            <Ionicons name="cart-outline" size={18} color="#000" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextBlack}>MARKET</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnPurple} onPress={() => navigation.navigate('Giveaways')}>
            <Ionicons name="gift-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextWhite}>GIVEAWAYS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnWhite, { backgroundColor: '#e53935' }]} onPress={() => navigation.navigate('Videos')}>
            <Ionicons name="play-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextWhite}>VIDEOS</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={[styles.actionBtnWhite, { backgroundColor: '#333' }]} onPress={() => navigation.navigate('ServiceBoard')}>
            <Ionicons name="build-outline" size={18} color="#ffcc00" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextWhite}>SERVICES</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnWhite, { backgroundColor: '#333' }]} onPress={() => navigation.navigate('DynoBoard')}>
            <Ionicons name="speedometer-outline" size={18} color="#4ade80" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextWhite}>DYNO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnWhite, { backgroundColor: '#333' }]} onPress={() => navigation.navigate('Battles')}>
            <Ionicons name="car-sport-outline" size={18} color="#60a5fa" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextWhite}>BATTLES</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnWhite, { backgroundColor: '#333' }]} onPress={() => navigation.navigate('TopTuners')}>
            <Ionicons name="trophy-outline" size={18} color="#c084fc" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextWhite}>TUNERS</Text>
          </TouchableOpacity>
        </View>`;

const replacement = `<TouchableOpacity style={styles.directoryBtn} onPress={() => navigation.navigate('Menu')}>
          <Ionicons name="folder-open-outline" size={20} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.directoryBtnText}>BROWSE DIRECTORY</Text>
        </TouchableOpacity>`;

if(code.includes(target)) {
    code = code.replace(target, replacement);
    // add styles
    code = code.replace("actionButtonsRow: {", "directoryBtn: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 24 },\n  directoryBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },\n  actionButtonsRow: {");
    fs.writeFileSync('mobile-app/screens/DiscoverScreen.tsx', code);
    console.log('Success');
} else {
    console.log('Target not found');
}
