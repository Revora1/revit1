import { initializeApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence
});
export const storage = getStorage(app);

// Safe FCM Messaging initialization
let messaging: Messaging | null = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch((err) => {
  console.warn("FCM is not supported in this environment:", err);
});

export { messaging };

// VAPID Key used to authenticate FCM requests from the web app
export const VAPID_KEY = "BBbUuJCmSXqn5W9Asg9PrSE_FstFFc8Cmp3EjoVybRwKjyP3q1bKYmaEU9MsxCkw56OKJJWk0A3HlrfYZhosM_o";

export async function requestNotificationPermissionAndGetToken(userId: string): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("Notifications or Service Workers are not supported in this browser.");
      return null;
    }

    if (!('Notification' in window)) {
      console.warn("This browser does not support desktop notifications.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn("Notification permission was denied.");
      return null;
    }

    if (!messaging) {
      console.warn("FCM Messaging instance is not initialized.");
      return null;
    }

    // Register active service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log("FCM Service Worker registered successfully:", registration);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log("FCM Token retrieved successfully:", token);
      
      // Save FCM Token in user's profile doc in firestore
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token)
      });
      return token;
    } else {
      console.warn("No registration token available. Request permission to generate one.");
      return null;
    }
  } catch (error) {
    console.error("An error occurred while retrieving FCM token:", error);
    return null;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
