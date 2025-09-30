// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAqO9HbMIkk8VBU5Bj6hyFjQUwASfWtA0A",
  authDomain: "react-chat-d5e87.firebaseapp.com",
  projectId: "react-chat-d5e87",
  storageBucket: "react-chat-d5e87.firebasestorage.app",
  messagingSenderId: "464138161475",
  appId: "1:464138161475:web:5727ef5cfdf09c09f433f6",
  measurementId: "G-4RXF61HD0J"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const storage = getStorage(app);
