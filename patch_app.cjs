const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const importStr = "import { ATTPrompt } from './components/ATTPrompt';\nimport { PushNotifications } from '@capacitor/push-notifications';";
code = code.replace("import { ATTPrompt } from './components/ATTPrompt';", importStr);

const hookStr = `  React.useEffect(() => {
    if (user && Capacitor.getPlatform() !== 'web') {
      const registerPush = async () => {
        try {
          let permStatus = await PushNotifications.checkPermissions();
          
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }
          
          if (permStatus.receive === 'granted') {
            await PushNotifications.register();
          }
        } catch (e) {
          console.error("Push registration failed", e);
        }
      };
      
      registerPush();

      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.log('Error on registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
      });
      
      return () => {
        PushNotifications.removeAllListeners();
      };
    }
  }, [user]);

  const isKid = React.useMemo(() => {`;
code = code.replace("  const isKid = React.useMemo(() => {", hookStr);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx successfully");
