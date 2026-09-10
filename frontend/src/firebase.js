import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBwjCnArIk6PdaEhY-KZ0UJw2Bfm3CWLNc",
  authDomain: "servego24-ea723.firebaseapp.com",
  projectId: "servego24-ea723",
  storageBucket: "servego24-ea723.firebasestorage.app",
  messagingSenderId: "52044142376",
  appId: "1:52044142376:web:1a138ca8bd5d75c894621d"
};

const app = initializeApp(firebaseConfig);

export const messaging = getMessaging(app);