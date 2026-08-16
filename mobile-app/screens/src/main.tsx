import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Register Progressive Web App (PWA) Service Worker for mobile installation and custom offline/notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Firebase PWA Service Worker registered with scope: ', registration.scope);
      })
      .catch((err) => {
        console.error('Firebase PWA Service Worker registration failed: ', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
