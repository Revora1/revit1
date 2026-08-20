const fs = require('fs');

const path = 'mobile-app/screens/DiscoverScreen.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
`        <TouchableOpacity style={styles.directoryBtn} onPress={() => navigation.navigate('Menu')}>`,
`        <TouchableOpacity style={styles.directoryBtn} onPress={() => {
          try {
            navigation.navigate('Menu');
          } catch(e) {
             console.log(e);
             try { navigation.getParent()?.navigate('Menu'); } catch(e2) {}
          }
        }}>`
);

fs.writeFileSync(path, code);
