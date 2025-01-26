import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDsUAY9tD6v7qOaPosdQy8UmFmqXj0oSD8",
  authDomain: "freegpt-bd65d.firebaseapp.com",
  projectId: "freegpt-bd65d",
  storageBucket: "freegpt-bd65d.firebasestorage.app",
  messagingSenderId: "120398546880",
  appId: "1:120398546880:web:bb3cf9bf47394bd6226a25",
  measurementId: "G-NP7QZJN6TJ"
};

// Initialize Firebase
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
