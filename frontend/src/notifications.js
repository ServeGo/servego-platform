import {
  getToken,
  onMessage
} from "firebase/messaging";

import { messaging } from "./firebase";

export async function enableNotifications() {
  try {
    if (!("Notification" in window)) {
      console.log("Notifications are not supported.");
      return null;
    }

    const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied.");
      return null;
    }

    const registration =
      await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_APP_VAPID_KEY || import.meta.env.REACT_APP_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      console.log("FCM token not available.");
      return null;
    }

    console.log("FCM registration successful.");

    return token;

  } catch (error) {
    console.error(
      "Notification setup failed:",
      error
    );

    return null;
  }
}

export function listenForNotifications(callback) {
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}