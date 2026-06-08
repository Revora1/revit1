// Firebase Cloud Messaging background Service Worker.
// This worker listens for messages while the app is in the background and displays notifications.

importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

// Initialize Firebase App in service worker context
firebase.initializeApp({
  apiKey: "AIzaSyA86P77_HGZldA0OnEWpgLtdp-wtHCBkf0",
  authDomain: "revitup-c8a66.firebaseapp.com",
  projectId: "revitup-c8a66",
  storageBucket: "revitup-c8a66.firebasestorage.app",
  messagingSenderId: "848807710523",
  appId: "1:848807710523:web:d89df1cec6f9e38d57b11e"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'RevItUp Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new update in your social garage!',
    icon: '/screenshot.png',
    badge: '/screenshot.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
