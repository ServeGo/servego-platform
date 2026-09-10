importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBwjCnArIk6PdaEhY-KZ0UJw2Bfm3CWLNc",
  authDomain: "servego24-ea723.firebaseapp.com",
  projectId: "servego24-ea723",
  storageBucket: "servego24-ea723.firebasestorage.app",
  messagingSenderId: "52044142376",
  appId: "1:52044142376:web:1a138ca8bd5d75c894621d",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/favicon.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});